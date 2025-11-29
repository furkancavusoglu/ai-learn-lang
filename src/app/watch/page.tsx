"use client";

import VideoPlayer from "@/components/VideoPlayer";
import { SubtitleList } from "@/components/SubtitleList";
import styles from "@/css/watch.module.scss";
import { useState, useEffect, useRef, useCallback } from "react";
import { useStore } from "@tanstack/react-store";
import {
  videoStore,
  addSubtitles,
  type SubtitleSegment,
} from "@/store/videoStore";

const CHUNK_SIZE = 60; // seconds

export default function WatchPage() {
  const videoUrl = useStore(videoStore, (state) => state.videoUrl);
  const currentTime = useStore(videoStore, (state) => state.currentTime);

  const [isProcessing, setIsProcessing] = useState(false);
  const processedChunks = useRef<Set<number>>(new Set());

  const fetchChunk = useCallback(
    async (start: number) => {
      if (processedChunks.current.has(start)) return;

      processedChunks.current.add(start); // Optimistic lock
      setIsProcessing(true);

      try {
        console.log(`Fetching chunk: ${start}s`);
        const res = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: videoUrl,
            startTime: start,
            duration: CHUNK_SIZE,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const newSubtitles: SubtitleSegment[] = data.segments.map(
          (s: any, i: number) => ({
            id: `${start}-${i}`,
            // Distribute roughly over the chunk for now
            start: start + i * (CHUNK_SIZE / data.segments.length),
            end: start + (i + 1) * (CHUNK_SIZE / data.segments.length),
            text: s.english,
            translation: s.kanji,
            romaji: s.romaji,
          })
        );

        addSubtitles(newSubtitles);
      } catch (e) {
        console.error(e);
        processedChunks.current.delete(start); // Allow retry
      } finally {
        setIsProcessing(false);
      }
    },
    [videoUrl]
  );

  // Auto-fetch based on time
  useEffect(() => {
    if (!videoUrl) return;
    const time =
      typeof currentTime === "number" && !isNaN(currentTime) ? currentTime : 0;

    const currentChunk = Math.floor(time / CHUNK_SIZE) * CHUNK_SIZE;
    const nextChunk = currentChunk + CHUNK_SIZE;

    // Fetch current if needed
    fetchChunk(currentChunk);

    // Pre-fetch next if we are halfway through
    if (time % CHUNK_SIZE > 30) {
      fetchChunk(nextChunk);
    }
  }, [currentTime, videoUrl, fetchChunk]);

  return (
    <main className={styles.container}>
      <div className={styles.videoSection}>
        <VideoPlayer />
      </div>
      <div className={styles.subtitleSection}>
        <div className={styles.controls}>
          <div className={styles.status}>
            {isProcessing ? "Processing..." : "Ready"}
          </div>
        </div>
        <SubtitleList />
      </div>
    </main>
  );
}
