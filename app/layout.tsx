import type { Metadata } from "next";
import {
  Fraunces,
  Source_Serif_4,
  Noto_Serif_Devanagari,
  Noto_Serif_Tamil,
  Noto_Serif_Telugu,
  Noto_Serif_Kannada,
  Noto_Serif_Malayalam,
} from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import { DistrictProvider } from "@/lib/DistrictContext";

// Editorial serif for display type — gives the product institutional weight
// rather than generic-SaaS neutrality.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// Body copy is also serif: this product is mostly long-form legal and scheme
// text, and a text-face serif reads as a document rather than an app screen.
const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Indic faces are loaded explicitly: the Latin stack has no Devanagari or
// Tamil coverage, and browser fallbacks for these scripts are inconsistent
// on the low-end Android devices this is meant to run on.
const notoDevanagari = Noto_Serif_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari"],
  display: "swap",
});

const notoTamil = Noto_Serif_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
  display: "swap",
});

const notoTelugu = Noto_Serif_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu"],
  display: "swap",
});

const notoKannada = Noto_Serif_Kannada({
  variable: "--font-noto-kannada",
  subsets: ["kannada"],
  display: "swap",
});

const notoMalayalam = Noto_Serif_Malayalam({
  variable: "--font-noto-malayalam",
  subsets: ["malayalam"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PACS Sahayak — Multilingual Cooperative Assistant",
  description:
    "An AI assistant for PACS members and farmers that tells you what you never thought to ask for, checks what you were told, and turns complaints into evidence. SIH Problem Statement 26088.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${notoDevanagari.variable} ${notoTamil.variable} ${notoTelugu.variable} ${notoKannada.variable} ${notoMalayalam.variable} h-full`}
      // Extensions (QuillBot, Grammarly and friends) stamp attributes onto
      // <html> before React hydrates, which React reports as a mismatch. This
      // waives the check for this element's own attributes only — the tree
      // below it is still fully checked.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <LangProvider>
          <DistrictProvider>{children}</DistrictProvider>
        </LangProvider>
      </body>
    </html>
  );
}
