"use client";

import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useStore } from "@tanstack/react-store";
import {
  videoStore,
  setTime,
  setIsPlaying,
  setSubtitles,
} from "@/store/videoStore";
import { mockSubtitles } from "@/data/mockData";
import styles from "@/css/VideoPlayer.module.scss";

export default function VideoPlayer() {
  const videoUrl = useStore(videoStore, (state) => state.videoUrl);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      setSubtitles(mockSubtitles);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) return null;

  return (
    <div className={styles.videoWrapper}>
      <ReactPlayer
        src={videoUrl || "https://www.youtube.com/watch?v=FGP3rX6B-WE"}
        width="100%"
        height="100%"
        controls={true}
        playing={true}
        muted={true}
        onProgress={(state: any) => setTime(state.playedSeconds)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className={styles.reactPlayer}
      />
    </div>
  );
}
