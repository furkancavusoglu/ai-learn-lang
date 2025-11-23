"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setVideoUrl } from "@/store/videoStore";
import styles from "@/css/home.module.scss";

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setVideoUrl(url);
      router.push("/watch");
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Start Learning with AI</h1>
        <p className={styles.subtitle}>
          Enter a YouTube URL to generate interactive subtitles
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>
            Start Learning
          </button>
        </form>
      </div>
    </main>
  );
}
