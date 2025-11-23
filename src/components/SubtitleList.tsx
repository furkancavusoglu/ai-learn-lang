"use client";

import { useStore } from "@tanstack/react-store";
import { videoStore } from "@/store/videoStore";
import { useEffect, useRef } from "react";
import styles from "@/css/SubtitleList.module.scss";
import clsx from "clsx";

export function SubtitleList() {
  const subtitles = useStore(videoStore, (state) => state.subtitles);
  const currentTime = useStore(videoStore, (state) => state.currentTime);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active subtitle
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  return (
    <div className={styles.list}>
      {subtitles.map((sub) => {
        const isActive = currentTime >= sub.start && currentTime <= sub.end;

        return (
          <div
            key={sub.id}
            ref={isActive ? activeRef : null}
            className={clsx(styles.item, isActive && styles.active)}
          >
            <p className={styles.japanese}>{sub.translation || "..."}</p>
            {sub.romaji && <p className={styles.romaji}>{sub.romaji}</p>}
            <p className={styles.english}>{sub.text}</p>
          </div>
        );
      })}
    </div>
  );
}
