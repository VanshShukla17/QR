import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import { BottomNav } from "@/components/bottom-nav";
import { IconProvider } from "@/components/icon-provider";
import { ThemeProvider } from "@/context/theme-context";

// Satoshi (Fontshare, ITF Free Font License) is self-hosted as a single variable woff2 so the
// 400/500/600/700 weights all resolve without extra requests.
const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-satoshi",
});

// Geist Mono is reserved for small technical labels only (tags, FIG. markers, agent/verdict chips).
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "QRaksha — UPI QR Physical Sticker Verification",
  description:
    "Merchant self-audit tool detecting swapped, cloned, or relocated UPI QR stickers with AI verification & public blockchain anchoring.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "QRaksha — Physical UPI QR Tamper Defense",
    description:
      "Detect when a physical UPI QR sticker has been swapped, cloned, or relocated using AI and public blockchain anchoring.",
    type: "website",
    siteName: "QRaksha",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRaksha — Physical UPI QR Tamper Defense",
    description:
      "Detect when a physical UPI QR sticker has been swapped, cloned, or relocated using AI and public blockchain anchoring.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#E0262F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${satoshi.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('qraksha_theme');var theme=stored;if(!theme){theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',theme);if(theme==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans flex flex-col items-center w-full antialiased selection:bg-[#FF6B5E]/20 selection:text-[#E0262F]">
        <ThemeProvider>
          <IconProvider>
            <div className="w-full min-h-screen flex flex-col bg-[var(--bg-app)] relative">
              {children}
              <BottomNav />
            </div>
          </IconProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
