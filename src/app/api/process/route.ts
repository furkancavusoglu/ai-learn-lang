import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import fs from "fs/promises";
import { pipeline, env } from "@xenova/transformers";
import { WaveFile } from "wavefile";

// --- Configuration ---
env.allowLocalModels = false;
env.useBrowserCache = false;

// Silence ONNX logs
process.env.ORT_LOG_LEVEL = "4";
process.env.ORT_LOGGING_LEVEL = "4";

const execAsync = util.promisify(exec);

// --- Singleton Model ---
let globalTranscriber: any = null;

async function getTranscriber() {
  if (!globalTranscriber) {
    console.log("❄️  Loading Whisper Model (small)...");
    globalTranscriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-small", // Upgraded to small for stability
      {
        // @ts-expect-error - session_options is not typed in all versions
        session_options: { logSeverityLevel: 4, logVerbosityLevel: 4 },
      }
    );
    console.log("✅ Model loaded!");
  }
  return globalTranscriber;
}

// --- Helpers ---

async function downloadAudioChunk(
  url: string,
  start: number,
  duration: number
) {
  try {
    const ytDlpPath = "/opt/homebrew/bin/yt-dlp";
    const videoIdMatch = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : "unknown";

    // Unique filename for this chunk
    const filename = `${videoId}_${start}_${duration}`;
    const outputPath = `/tmp/${filename}.wav`;
    const end = start + duration;

    // Check cache (with size check to avoid empty files)
    try {
      await fs.access(outputPath);
      const stats = await fs.stat(outputPath);
      if (stats.size > 1000) {
        // > 1KB to ensure it's real audio
        console.log(`✅ Using cached chunk: ${start}s - ${end}s`);
        return outputPath;
      }
    } catch {
      // Not cached or invalid, proceed to download
    }

    console.log(`⬇️ Downloading chunk: ${start}s - ${end}s`);

    // yt-dlp command to download specific section
    const command = `${ytDlpPath} -x --audio-format wav --download-sections "*${start}-${end}" --restrict-filenames --force-overwrites -o "/tmp/${filename}.%(ext)s" "${url}"`;

    const { stderr } = await execAsync(command, {
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` },
    });

    if (stderr && (stderr.includes("ERROR") || stderr.includes("Error"))) {
      console.error("yt-dlp warning/error:", stderr);
    }

    return outputPath;
  } catch (error: any) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function transcribe(filePath: string): Promise<string[]> {
  const transcriber = await getTranscriber();
  const buffer = await fs.readFile(filePath);
  const wav = new WaveFile(buffer);

  wav.toBitDepth("32f");
  wav.toSampleRate(16000);

  let audioData: any = wav.getSamples();
  if (Array.isArray(audioData)) {
    audioData = audioData[0]; // Take first channel if stereo
  }
  if (audioData.length > 1 && Array.isArray(audioData[0])) {
    // Handle case where getSamples returns [channel1, channel2]
    audioData = audioData[0];
  }

  if (!(audioData instanceof Float32Array)) {
    audioData = new Float32Array(audioData);
  }

  const output = await transcriber(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
    task: "transcribe",
    language: "ja", // Explicitly set Japanese
    condition_on_previous_text: false, // Prevent loops
    temperature: 0.2, // Low temp for accuracy (but not 0 to allow some escape)
    repetition_penalty: 1.2, // Penalize repetition
    no_speech_threshold: 0.4, // Relaxed threshold
  });

  const rawChunks = output.chunks || [];
  console.log(`   -> Whisper returned ${rawChunks.length} raw chunks.`);

  // Sentence Merging Logic
  const sentences: string[] = [];
  let bufferText = "";

  for (const chunk of rawChunks) {
    const text = chunk.text.trim();

    // Filter garbage loops
    if (/(.)\1{4,}/.test(text)) {
      console.log(
        `   -> Filtered repetitive segment: "${text.substring(0, 20)}..."`
      );
      continue;
    }
    if (text.length < 2 || text === "." || text.includes("Subtitle by"))
      continue;

    if (bufferText) bufferText += " " + text;
    else bufferText = text;

    const lastChar = bufferText.slice(-1);
    const isGreeting =
      /こんにちは|こんばんは|おはようございます|初めまして/.test(bufferText) &&
      bufferText.length < 20;

    if (
      [".", "?", "!", "。", "？", "！"].includes(lastChar) ||
      isGreeting || // Force split on greetings
      bufferText.length > 80 // Force split at 80 chars to prevent overload
    ) {
      sentences.push(bufferText.trim());
      bufferText = "";
    }
  }
  if (bufferText) sentences.push(bufferText);

  return sentences;
}

function unescapeUnicode(str: string) {
  return str.replace(/\\u([a-fA-F0-9]{4})/g, (_, grp) =>
    String.fromCharCode(parseInt(grp, 16))
  );
}

async function translate(text: string) {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma2", // Switched to Gemma 2 (9B)
        options: { num_predict: 150, temperature: 0 }, // Deterministic for strict formatting
        prompt: `You are a professional translator.
Task: Translate the Japanese text below into Turkish and provide the Romaji reading.
Format: Japanese Text | Romaji Reading | Turkish Translation
Constraint: Output ONLY the pipe-separated line. No extra text.

Input: ${text}
Output:`,
        stream: false,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const rawText = data.response.trim();

    // Parse the Pipe Format
    const parts = rawText.split("|").map((s: string) => s.trim());

    if (parts.length >= 3) {
      return {
        kanji: parts[0],
        romaji: parts[1],
        english: parts[2], // Storing Turkish in 'english' field
      };
    } else if (parts.length === 2) {
      // Fallback if it misses one part
      return {
        kanji: text,
        romaji: parts[0],
        english: parts[1],
      };
    }

    // Fallback
    return { kanji: text, romaji: "", english: rawText };
  } catch (e) {
    console.error("Translation error:", e);
    return null;
  }
}

// --- Main Handler ---

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, startTime = 0, duration = 60 } = body;

    if (!url)
      return NextResponse.json({ error: "URL required" }, { status: 400 });

    // 1. Download
    const audioPath = await downloadAudioChunk(url, startTime, duration);

    // 2. Transcribe
    console.log("🎙️ Transcribing...");
    const sentences = await transcribe(audioPath);

    // 3. Translate
    console.log(`🧠 Translating ${sentences.length} segments...`);
    const results = [];

    for (const sentence of sentences) {
      console.log(`📝 Input to Llama: "${sentence}"`);
      const translation = await translate(sentence);
      if (translation) {
        results.push({
          kanji: unescapeUnicode(translation.kanji || ""),
          romaji: unescapeUnicode(translation.romaji || ""),
          english: unescapeUnicode(translation.english || sentence),
        });
      } else {
        // Fallback
        results.push({ kanji: sentence, romaji: "", english: sentence });
      }
    }

    return NextResponse.json({
      message: "Success",
      segments: results,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
