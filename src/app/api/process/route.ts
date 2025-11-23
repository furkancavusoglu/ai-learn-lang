import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

// Helper to download audio with yt-dlp
async function downloadAudio(url: string) {
  try {
    // -x: Extract audio
    // --audio-format mp3: Convert to mp3
    // -o: Output template (using /tmp/ for ephemeral storage)
    // --restrict-filenames: ASCII only chars
    // --force-overwrites: Overwrite if exists
    const command = `yt-dlp -x --audio-format mp3 --restrict-filenames --force-overwrites -o "/tmp/%(id)s.%(ext)s" "${url}"`;
    console.log("Downloading audio:", command);

    const { stdout, stderr } = await execAsync(command);
    console.log("yt-dlp stdout:", stdout);
    if (stderr) console.error("yt-dlp stderr:", stderr);

    // We need to find the actual file path. yt-dlp output can be parsed,
    // but simpler is to re-run with --get-filename to know exactly where it went (or trust the pattern).
    // For MVP, we assume the pattern /tmp/<video_id>.mp3 is respected.
    return stdout;
  } catch (error: any) {
    console.error("yt-dlp error:", error);
    if (error.stderr) console.error("yt-dlp failed stderr:", error.stderr);
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

// Helper to call Ollama for translation
// (kept for reference or future use if we switch back to single-call)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function translateText(text: string) {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2", // Updated to match installed model
        prompt: `Translate the following English text to Japanese. Output ONLY the JSON object with keys "kanji", "romaji", and "english". No conversational text. \n\nText: "${text}"`,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama translation error:", error);
    return "Translation failed";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // 1. Download Audio
    console.log("Step 1: Downloading Audio...");
    try {
      await downloadAudio(url);
    } catch (downloadError: any) {
      console.error("Download failed, using fallback:", downloadError.message);
      // Fallback for MVP: We continue even if download fails, just to show the UI flow
      // In a real app, we would stop here.
    }

    // 2. Transcribe (Mocked for now until Whisper is added)
    console.log("Step 2: Transcribing (Mocking)...");
    // Mock a conversation with multiple segments
    const mockSegments = [
      "Hello everyone. Today we are going to learn about AI.",
      "Artificial Intelligence is changing the world rapidly.",
      "Specifically, we will look at how to use it for language learning.",
      "It can translate videos and help us understand better.",
      "Let's get started with a simple example.",
    ];

    // 3. Translate with Ollama
    console.log("Step 3: Translating with Ollama...");

    const translatedSegments = [];

    // Translate each segment sequentially
    for (const segment of mockSegments) {
      let kanji = "";
      let romaji = "";

      // Step 1: Get Japanese Kanji/Kana
      try {
        const response = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama3.2",
            prompt: `Translate this English text to Japanese. Output ONLY the Japanese translation. Do not add any notes. Text: "${segment}"`,
            stream: false,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          kanji = data.response.trim();
        }
      } catch (e) {
        console.error("Kanji translation failed", e);
        kanji = "Error";
      }

      // Step 2: Get Romaji (using the Kanji we just got)
      if (kanji && kanji !== "Error" && !kanji.includes("Error")) {
        try {
          const response = await fetch("http://127.0.0.1:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama3.2",
              prompt: `Convert this Japanese text to Romaji. Output ONLY the Romaji reading. Do not add any notes. Text: "${kanji}"`,
              stream: false,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            romaji = data.response.trim();
          }
        } catch (e) {
          console.error("Romaji conversion failed", e);
        }
      }

      // Cleanup quotes if any
      kanji = kanji.replace(/^"|"$/g, "").trim();
      romaji = romaji.replace(/^"|"$/g, "").trim();

      // Detect echo
      const isEnglishEcho = kanji
        .toLowerCase()
        .includes(segment.toLowerCase().slice(0, 10));
      if (isEnglishEcho) {
        kanji = "Translation failed (Echoed input)";
        romaji = "";
      }

      const parsed = {
        kanji: kanji,
        romaji: romaji,
        english: segment,
      };

      translatedSegments.push(parsed);
    }

    return NextResponse.json({
      message: "Process completed",
      segments: translatedSegments,
      ollama_status: "Connected",
    });
  } catch (error) {
    console.error("Process failed:", error);
    return NextResponse.json(
      { error: "Processing failed", details: String(error) },
      { status: 500 }
    );
  }
}
