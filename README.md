# AI Learn Lang 🇯🇵

Yapay zeka destekli dil öğrenme platformu. YouTube videolarındaki sesleri analiz ederek Japonca (Kanji/Romaji) ve İngilizce altyazıları otomatik olarak oluşturur. Tamamen yerel modeller kullanarak çalışır (Local AI).

## Özellikler

*   **YouTube Entegrasyonu:** Video linki yapıştırın, izleyin ve öğrenin.
*   **Otomatik Deşifre (Transcription):** `Transformers.js` (Whisper) kullanarak tarayıcı/sunucu üzerinde sesi metne çevirir.
*   **Yerel Çeviri (Translation):** `Ollama` (Llama 3.2) kullanarak metinleri Japonca (Kanji/Kana), Romaji ve İngilizce'ye çevirir.
*   **Akıllı Arayüz:** Video ile senkronize akan altyazı listesi.
*   **Hız ve Gizlilik:** Tüm işlem yerel makinenizde gerçekleşir, API maliyeti yoktur.

## Teknolojiler

*   **Framework:** Next.js 16 (App Router)
*   **Dil:** TypeScript
*   **Stil:** Sass (SCSS Modules)
*   **State Yönetimi:** TanStack Store
*   **AI & NLP:**
    *   Ollama (Llama 3.2) - Çeviri
    *   Transformers.js (Whisper) - Ses Tanıma
*   **Araçlar:** `yt-dlp`, `ffmpeg`

## Gereksinimler

Projenin çalışması için aşağıdaki araçların sisteminizde yüklü olması gerekir:

1.  **Node.js** (v18+)
2.  **Ollama:** Yerel LLM sunucusu. [İndir](https://ollama.com/)
    *   Modeli çekin: `ollama pull llama3.2`
3.  **yt-dlp:** YouTube ses indirme aracı.
    *   Mac (Homebrew): `brew install yt-dlp`
4.  **ffmpeg:** Ses dönüştürme için gerekli.
    *   Mac (Homebrew): `brew install ffmpeg`

## Kurulum

1.  Depoyu klonlayın ve bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

2.  **Ollama Sunucusunu Başlatın:**
    Uygulamayı çalıştırmadan önce Ollama'nın çalıştığından emin olun (Genellikle arkaplanda çalışır, terminalden kontrol edebilirsiniz).
    ```bash
    ollama serve
    ```

3.  Geliştirme sunucusunu başlatın:
    ```bash
    npm run dev
    ```

4.  Tarayıcıda `http://localhost:3000` adresine gidin.

## Kullanım

1.  Ana sayfada bir YouTube video linki girin.
2.  "Watch" sayfasına yönlendirileceksiniz.
3.  **"Generate Subtitles"** butonuna tıklayın.
    *   **Not:** Geliştirme modunda (`DEV_MODE`), işlem hızı için sadece videonun ilk 10 saniyesi işlenir.
    *   İlk çalıştırmada Whisper modelinin yüklenmesi biraz zaman alabilir, sonraki işlemler çok daha hızlıdır.
4.  Altyazılar oluştuktan sonra video ile senkronize olarak takip edebilirsiniz.

## Yapılandırma

*   **Dev Mode:** `src/app/api/process/route.ts` dosyasındaki `DEV_MODE` değişkeni `true` ise sadece 10 saniyelik ses işlenir. Prodüksiyon için `false` yapabilirsiniz.
