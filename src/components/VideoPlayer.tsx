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

export default function VideoPlayer() {
  const videoUrl = useStore(videoStore, (state) => state.videoUrl);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setSubtitles(mockSubtitles);
  }, []);

  if (!isMounted) return null;

  return (
    <div style={{ width: "100%", height: "100%" }}>
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
        style={{ position: "absolute", top: 0, left: 0 }}
      />
    </div>
  );
}
