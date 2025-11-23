import type { Metadata } from "next";
import "./global.scss";

export const metadata: Metadata = {
  title: "AI Learn Lang",
  description: "Learn languages with AI-powered video subtitles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
