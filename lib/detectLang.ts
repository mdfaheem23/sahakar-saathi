import { LangCode } from "./types";
import { SUPPORTED_LANGS } from "./i18n";

/**
 * Language detection for typed input.
 *
 * Script detection rather than a statistical model: almost every supported
 * language has a writing system of its own, so counting characters is both
 * exact and instant. A statistical detector would be slower and less reliable
 * on the short fragments people actually type.
 *
 * The one shared script is Devanagari, which Hindi and Marathi both use. That
 * split is settled by vocabulary — see `devanagariLang`.
 *
 * Speech takes a different path — Sarvam reports the language it heard, which
 * is authoritative, so this is only consulted for text.
 */

const SCRIPTS: { lang: LangCode; re: RegExp }[] = [
  { lang: "hi", re: /[ऀ-ॿ]/g }, // Devanagari (Hindi or Marathi)
  { lang: "bn", re: /[ঀ-৿]/g }, // Bengali
  { lang: "pa", re: /[਀-੿]/g }, // Gurmukhi
  { lang: "gu", re: /[઀-૿]/g }, // Gujarati
  { lang: "or", re: /[଀-୿]/g }, // Odia
  { lang: "ta", re: /[஀-௿]/g }, // Tamil
  { lang: "te", re: /[ఀ-౿]/g }, // Telugu
  { lang: "kn", re: /[ಀ-೿]/g }, // Kannada
  { lang: "ml", re: /[ഀ-ൿ]/g }, // Malayalam
];
const LATIN = /[A-Za-z]/g;

/**
 * Function words that occur constantly in Marathi and almost never in Hindi.
 *
 * Content words are useless here — "फसल", "बीमा", "कर्ज" are shared — but the
 * grammar is not: Marathi says "आहे" where Hindi says "है", "मध्ये" where
 * Hindi says "में". A question of any length carries at least one of these.
 */
const MARATHI_MARKERS = [
  "आहे", "आहेत", "नाही", "मध्ये", "काय", "कसे", "कसा", "कशी", "कधी", "माझ्या", "माझा", "माझी", "माझे",
  "तुम्ही", "आम्ही", "करावी", "करावे", "करायचे", "मिळेल", "मिळाले", "पाहिजे", "झाले", "होते", "आणि", "किंवा",
  "साठी", "च्या", "ला", "ची", "चा", "चे", "सांगा", "कुठे", "केव्हा", "द्या", "घ्या",
];
const HINDI_MARKERS = [
  "है", "हैं", "नहीं", "में", "क्या", "कैसे", "कब", "मेरा", "मेरी", "मेरे", "आप", "हम", "करें", "मिलेगा",
  "चाहिए", "और", "या", "के लिए", "का", "की", "के", "बताइए", "कहाँ", "कहां", "दीजिए",
];

function devanagariLang(text: string): LangCode {
  const words = text.split(/[\s,.?!।॥:;"'()]+/).filter(Boolean);
  const set = new Set(words);
  let mr = 0;
  let hi = 0;
  for (const m of MARATHI_MARKERS) if (set.has(m)) mr++;
  for (const m of HINDI_MARKERS) if (m.includes(" ") ? text.includes(m) : set.has(m)) hi++;
  // The Marathi-only letter ळ settles it on its own.
  if (text.includes("ळ")) mr += 2;
  return mr > hi ? "mr" : "hi";
}

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
  if (best) {
    if (best.lang !== "hi") return best.lang;
    // A member whose interface is already Marathi and who types a two-word
    // fragment with no grammar in it most likely wrote Marathi.
    const guess = devanagariLang(text);
    if (guess === "hi" && fallback === "mr" && !HINDI_MARKERS.some((m) => text.includes(m))) {
      return "mr";
    }
    return guess;
  }
  if ((text.match(LATIN)?.length ?? 0) > 0) return "en";
  return fallback;
}

/** Maps Sarvam's BCP-47 reply (e.g. "ta-IN") back to our internal code. */
export function fromSpeechTag(tag: string | null | undefined, fallback: LangCode): LangCode {
  if (!tag) return fallback;
  let base = tag.toLowerCase().split("-")[0];
  // Sarvam tags Odia "od"; internally it is the ISO "or".
  if (base === "od") base = "or";
  const hit = SUPPORTED_LANGS.find((l) => l === base);
  if (hit) return hit;
  // Sarvam can detect languages we don't yet serve; answering in a language
  // we have no corpus or TTS voice for would be worse than the fallback.
  return fallback;
}
