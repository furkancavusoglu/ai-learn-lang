import { Store } from "@tanstack/store";

export type SubtitleSegment = {
  id: string;
  start: number;
  end: number;
  text: string;
  translation?: string;
};

export type VideoState = {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  subtitles: SubtitleSegment[];
  isLoading: boolean;
};

export const videoStore = new Store<VideoState>({
  videoUrl: "",
  isPlaying: false,
  currentTime: 0,
  subtitles: [],
  isLoading: false,
});

export const setVideoUrl = (url: string) => {
  videoStore.setState((state) => {
    return { ...state, videoUrl: url };
  });
};

export const setTime = (time: number) => {
  videoStore.setState((state) => {
    return { ...state, currentTime: time };
  });
};

export const setSubtitles = (subtitles: SubtitleSegment[]) => {
  videoStore.setState((state) => {
    return { ...state, subtitles };
  });
};

export const setIsPlaying = (isPlaying: boolean) => {
  videoStore.setState((state) => {
    return { ...state, isPlaying };
  });
};
