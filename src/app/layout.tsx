import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { StoreProvider } from "@/store/app-store";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Spelling Lab — IELTS Listening & Spelling Trainer",
  description:
    "Keyboard-first IELTS spelling trainer: listen, recall, type, classify and review with spaced repetition.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1211" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
        <script
          // applied before paint so dark mode never flashes
          dangerouslySetInnerHTML={{
            __html: `try{var c=JSON.parse(localStorage.getItem('ielts-spelling-cache-v2')||'null');if(c&&c.settings&&c.settings.darkMode){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
