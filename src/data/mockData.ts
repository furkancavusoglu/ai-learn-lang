import { SubtitleSegment } from "@/store/videoStore";

export const mockSubtitles: SubtitleSegment[] = [
  {
    id: "1",
    start: 0,
    end: 2.5,
    text: "こんにちは、元気ですか？",
    translation: "Hello, how are you?",
  },
  {
    id: "2",
    start: 2.5,
    end: 5,
    text: "今日はいい天気ですね。",
    translation: "The weather is nice today, isn't it?",
  },
  {
    id: "3",
    start: 5,
    end: 8,
    text: "日本語を勉強するのは楽しいです。",
    translation: "Studying Japanese is fun.",
  },
  {
    id: "4",
    start: 8,
    end: 12,
    text: "毎日少しずつ頑張りましょう。",
    translation: "Let's do our best little by little every day.",
  },
   {
    id: "5",
    start: 12,
    end: 15,
    text: "動画を見て練習しましょう。",
    translation: "Let's practice by watching videos.",
  }
];

