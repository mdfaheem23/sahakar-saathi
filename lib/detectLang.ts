import { LangCode } from "./types";

/**
 * Language detection for typed input.
 *
 * Script detection rather than a statistical model: the three supported
 * languages use three disjoint writing systems, so counting characters is
 * both exact and instant. A statistical detector would be slower and less
 * reliable on the short fragments people actually type.
 *
 * Speech takes a different path — Sarvam reports the language it heard, which
 * is authoritative, so this is only consulted for text.
 */

const SCRIPTS: { lang: LangCode; re: RegExp }[] = [
  { lang: "hi", re: /[\u0900-\u097F]/g }, // Devanagari
  { lang: "ta", re: /[\u0B80-\u0BFF]/g }, // Tamil
  { lang: "te", re: /[\u0C00-\u0C7F]/g }, // Telugu
  { lang: "kn", re: /[\u0C80-\u0CFF]/g }, // Kannada
  { lang: "ml", re: /[\u0D00-\u0D7F]/g }, // Malayalam
];
const LATIN = /[A-Za-z]/g;

export function detectLanguage(text: string, fallback: LangCode = "en"): LangCode {
  if (!text.trim()) return fallback;

  let best: { lang: LangCode; count: number } | null = null;
  for (const { lang, re } of SCRIPTS) {
    const count = text.match(re)?.length ?? 0;
    if (count > 0 && (!best || count > best.count)) best = { lang, count };
  }

  // Any Indic script beats Latin even when mixed: scheme acronyms ("PMFBY",
  // "PACS") and numbers are written in Latin inside otherwise-Indic sentences
  // and would otherwise pull the result to English.
  if (best) return best.lang;
  if ((text.match(LATIN)?.length ?? 0) > 0) return "en";
  return fallback;
}

/** Maps Sarvam's BCP-47 reply (e.g. "ta-IN") back to our internal code. */
export function fromSpeechTag(tag: string | null | undefined, fallback: LangCode): LangCode {
  if (!tag) return fallback;
  const base = tag.toLowerCase().split("-")[0];
  const supported: LangCode[] = ["en", "hi", "ta", "te", "kn", "ml"];
  const hit = supported.find((l) => l === base);
  if (hit) return hit;
  // Sarvam can detect languages we don't yet serve; answering in a language
  // we have no corpus or TTS voice for would be worse than the fallback.
  return fallback;
}
