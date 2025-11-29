import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import fs from "fs/promises";
import { pipeline, env } from "@xenova/transformers";
import { WaveFile } from "wavefile";

// Configure transformers.js settings
env.allowLocalModels = false;
env.useBrowserCache = false;

const execAsync = util.promisify(exec);
const DEV_MODE = true; // Limit processing to 10 seconds for development speed

// Singleton pattern to keep the model in memory across requests
let globalTranscriber: any = null;

async function getTranscriber() {
  if (!globalTranscriber) {
    process.env.XENOVAS_CACHE_DIR = "/tmp/xenova_cache";
    // Attempt to silence ONNX Runtime logs via environment variables
    process.env.ORT_LOG_LEVEL = "4";
    process.env.ORT_LOGGING_LEVEL = "4";

    globalTranscriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny",
      {
        // @ts-expect-error - session_options is not typed in all versions of transformers.js
        session_options: { logSeverityLevel: 4, logVerbosityLevel: 4 },
      }
    );
  }
  return globalTranscriber;
}

async function transcribeAudio(
  filePath: string,
  signal?: AbortSignal
): Promise<string[]> {
  try {
    if (signal?.aborted) throw new Error("Aborted by user");

    const transcriber = await getTranscriber();

    const buffer = await fs.readFile(filePath);
    const wav = new WaveFile(buffer);

    wav.toBitDepth("32f");
    wav.toSampleRate(16000);

    let audioData: any = wav.getSamples();

    // Handle stereo to mono conversion if necessary
    if (Array.isArray(audioData)) {
      if (audioData.length > 1) {
        const left = audioData[0];
        const right = audioData[1];
        for (let i = 0; i < left.length; i++) {
          left[i] = (left[i] + right[i]) / 2;
        }
        audioData = left;
      } else {
        audioData = audioData[0];
      }
    }

    if (!(audioData instanceof Float32Array)) {
      audioData = new Float32Array(audioData);
    }

    const output = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });

    const chunks = output.chunks || [];

    return chunks
      .map((c: any) => c.text.trim())
      .filter((t: string) => t.length > 0);
  } catch (error: any) {
    console.error("Transcription error:", error.message);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

async function downloadAudio(url: string, signal?: AbortSignal) {
  try {
    const ytDlpPath = "/opt/homebrew/bin/yt-dlp";
    const videoIdMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

    // Use a different filename for DEV_MODE to ensure fresh downloads with truncation
    const filename = DEV_MODE ? `${videoId}_short` : videoId;

    // Add --download-sections if in DEV_MODE to truncate at the download/conversion level
    const sectionsArg = DEV_MODE ? '--download-sections "*0-10"' : "";

    const command = `${ytDlpPath} -x --audio-format wav ${sectionsArg} --restrict-filenames --force-overwrites -o "/tmp/${filename}.%(ext)s" "${url}"`;

    const { stderr } = await execAsync(command, {
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` },
      signal,
    });

    // Only log critical errors from yt-dlp
    if (stderr && (stderr.includes("ERROR") || stderr.includes("Error"))) {
      console.error("yt-dlp error:", stderr);
    }

    return `/tmp/${filename}.wav`;
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const { signal } = request;
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // 1. Download Audio
    const videoIdMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

    const filename = DEV_MODE ? `${videoId}_short` : videoId;
    const expectedPath = `/tmp/${filename}.wav`;

    let audioPath = expectedPath;

    if (signal.aborted) throw new Error("Aborted by user");

    try {
      await fs.access(expectedPath);
      console.log("✅ Audio found in cache.");
    } catch {
      console.log("⬇️ Downloading audio...");
      audioPath = await downloadAudio(url, signal);
    }

    if (signal.aborted) throw new Error("Aborted by user");

    // 2. Transcribe
    let segments: string[] = [];
    if (audioPath) {
      console.log("🎙️ Transcribing...");
      segments = await transcribeAudio(audioPath, signal);
    } else {
      throw new Error("Download failed.");
    }

    // 3. Translate
    console.log(
      `🧠 Starting translation of ${segments.length} segments with Llama...`
    );
    const translatedSegments = [];

    for (let i = 0; i < segments.length; i++) {
      if (signal.aborted) throw new Error("Aborted by user");

      const segment = segments[i];
      console.log(
        `   [${i + 1}/${segments.length}] Translating: "${segment.substring(
          0,
          30
        )}..."`
      );
      let kanji = "";
      let romaji = "";

      try {
        const response = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.2",
            options: { num_predict: 100 }, // FORCE STOP: Prevent infinite generation loops
            prompt: `You are a Japanese language learning assistant.
Input Text: "${segment}"

Task: Analyze the input text and output a JSON object with three keys:
1. "kanji": The text in Japanese (Kanji/Kana). If input is English, translate it. If input is Japanese, keep it.
2. "romaji": The Romanized reading of the Japanese text.
3. "english": The English meaning. If input is English, keep it. If input is Japanese, translate it.

Output Format: JSON ONLY. No markdown.
Example: { "kanji": "こんにちは", "romaji": "Konnichiwa", "english": "Hello" }`,
            stream: false,
            format: "json",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          try {
            const jsonResponse = JSON.parse(data.response);
            kanji = jsonResponse.kanji || "";
            romaji = jsonResponse.romaji || "";
          } catch {
            kanji = data.response;
          }
        }
      } catch (translationError) {
        console.error(`Translation failed for segment ${i}:`, translationError);
        kanji = "Error";
      }

      translatedSegments.push({
        kanji:
          typeof kanji === "string"
            ? kanji.replace(/^"|"$/g, "").trim()
            : kanji,
        romaji:
          typeof romaji === "string"
            ? romaji.replace(/^"|"$/g, "").trim()
            : romaji,
        english: segment,
      });
    }

    return NextResponse.json({
      message: "Process completed",
      segments: translatedSegments,
      ollama_status: "Connected",
    });
  } catch (error) {
    console.error("Process Error:", error);
    return NextResponse.json(
      { error: "Processing failed", details: String(error) },
      { status: 500 }
    );
  }
}
