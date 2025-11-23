"use client";

import VideoPlayer from "@/components/VideoPlayer";
import { SubtitleList } from "@/components/SubtitleList";
import styles from "@/css/watch.module.scss";

export default function WatchPage() {
  return (
    <main className={styles.container}>
      <div className={styles.videoSection}>
        <VideoPlayer />
      </div>
      <div className={styles.subtitleSection}>
        <SubtitleList />
      </div>
    </main>
  );
}
