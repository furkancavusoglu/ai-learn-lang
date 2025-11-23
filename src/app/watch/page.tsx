"use client";

import VideoPlayer from "@/components/VideoPlayer";
import { SubtitleList } from "@/components/SubtitleList";
import styles from "@/css/watch.module.scss";
import { useState } from "react";
import { useStore } from "@tanstack/react-store";
import {
  videoStore,
  setSubtitles,
  type SubtitleSegment,
} from "@/store/videoStore";

export default function WatchPage() {
  const videoUrl = useStore(videoStore, (state) => state.videoUrl);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerateSubtitles = async () => {
    if (!videoUrl) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await response.json();
      console.log("Backend Response:", data);

      if (!response.ok) throw new Error(data.error || "Failed to generate");

      // Update the store with the new subtitles (handling multiple segments)
      const newSubtitles: SubtitleSegment[] = data.segments.map(
        (seg: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          start: index * 5, // Mock timing: each segment is 5 seconds
          end: (index + 1) * 5,
          text: seg.english,
          translation: seg.kanji,
          romaji: seg.romaji,
        })
      );

      setSubtitles(newSubtitles);
    } catch (err) {
      console.error(err);
      alert(
        `Error: ${
          err instanceof Error ? err.message : "Failed to connect to backend"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.videoSection}>
        <VideoPlayer />
      </div>
      <div className={styles.subtitleSection}>
        <div className={styles.controls}>
          <button
            onClick={handleGenerateSubtitles}
            disabled={isProcessing}
            className={styles.generateButton}
          >
            {isProcessing ? "Generating..." : "Generate Subtitles"}
          </button>
        </div>
        <SubtitleList />
      </div>
    </main>
  );
}
