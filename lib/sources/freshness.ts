import { LangCode, LocalizedText } from "../types";
import { applyOverlay } from "../i18n.overlay";
import { WATCHED_SOURCES, type WatchedSource } from "./registry";
import fingerprints from "./fingerprints.json";
import { activeAlerts, alertsForPassage, sourceIdsForPassage, type SourceAlert } from "./alerts";

/**
 * How much an answer can be trusted right now, and why.
 *
 * This is deliberately not a React component, a banner, or a piece of copy in
 * a page. The service answers on four channels — kiosk, website, mobile and
 * telephone — and only three of them have a screen. A caveat that lives in a
 * `<div>` is invisible to the caller on an IVR line, who is the least able to
 * verify anything and the most likely to be standing next to the man asking
 * for money. So the verdict is computed once, here, and each channel renders
 * it in its own idiom: a badge on a screen, a sentence inside the spoken
 * answer, a line and a QR code on printed paper.
 *
 * The computation is pure and has no network or filesystem dependency, so it
 * gives the same verdict inside the API route, inside a disconnected kiosk's
 * offline fallback, and on the receipt-verification page a member reaches
 * three weeks later with a printout in their hand.
 */
export type TrustTier = "verified" | "unconfirmed" | "expired";

export type TrustReason =
  /** Re-checked against the source document within its review cadence. */
  | "fresh"
  /** No dated source document behind this passage at all. */
  | "undated"
  /** Verified, but longer ago than this document's review cadence allows. */
  | "review-overdue"
  /** The source document itself changed after the passage was verified. */
  | "source-changed"
  /** The source document stopped responding, or its portal stopped accepting. */
  | "source-unreachable"
  /** A source that refuses automated checks is overdue for its human check. */
  | "human-check-overdue"
  /** Past a validity date recorded on the passage. */
  | "past-validity"
  /** Answered by a kiosk that could not reach the network to check anything. */
  | "offline"
  /** No answer at all — the corpus does not cover the question. */
  | "no-answer"
  /** Members report this being refused at the counter, whatever the page says. */
  | "field-rejected"
  /** No payment has been recorded under this scheme for a long time. */
  | "scheme-dormant";

/** How long a document may go unchecked before its passages are downgraded. */
const DEFAULT_REVIEW_DAYS = 180;

/**
 * Reports of a refusal at the counter before a passage is downgraded.
 *
 * Three rather than one, because a single refusal is as likely to be one
 * clerk having a bad morning as it is a dead scheme. Low enough that a real
 * change surfaces within a day at a busy society, and the threshold is worth
 * stating plainly as a trade: a bad actor tapping three times can make this
 * kiosk over-warn about a valid scheme. That is the cheap failure. The
 * expensive one is a farmer paying a fee for a scheme that quietly stopped
 * being honoured, and every other decision in this file leans the same way.
 *
 * Production aggregates these server-side across a district with per-device
 * rate limiting, so three taps on one machine cannot move a national verdict.
 */
export const FIELD_REJECTION_THRESHOLD = 3;

export interface Provenance {
  tier: TrustTier;
  reason: TrustReason;
  /** Document name and clause, as cited in the corpus. */
  source: string | null;
  /** Where that document can be read. Never invented — omitted if unknown. */
  url?: string;
  /** ISO date a human last checked the passage against the document. */
  verifiedOn?: string;
  /** ISO date after which the passage is known not to apply, when known. */
  validTill?: string;
  daysSinceVerified: number | null;
  /** ISO date the passage falls due for re-verification. */
  reviewDueOn?: string;
  /** Localised one-line label for a badge. */
  label: string;
  /** Localised sentence for a screen. Always present. */
  notice: string;
  /**
   * Localised sentence for a channel that speaks. Null when the answer is
   * fresh — a caller should not sit through a caveat that says nothing.
   */
  spokenNotice: string | null;
  /** The standing anti-solicitation line, in the member's language. */
  freeService: string;
  spokenFreeService: string;
}

/* ------------------------------------------------------------------ dates */

const DATE_LOCALE: Record<LangCode, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  or: "or-IN",
};

/**
 * A date a person can read, in their own script.
 *
 * Never an ISO string on a member-facing surface. "2026-08-30" is fine in a
 * log and useless read aloud by a speech engine, which pronounces it as three
 * numbers.
 */
export function formatDate(iso: string | undefined, lang: LangCode): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE[lang] ?? "en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ----------------------------------------------------------------- strings */

function pick(text: LocalizedText, lang: LangCode): string {
  return text[lang] ?? text.en;
}

function fill(text: string, date: string): string {
  return text.replace(/\{date\}/g, date);
}

const TIER_LABEL: Record<TrustTier, LocalizedText> = {
  verified: {
    en: "Checked against the government document",
    hi: "सरकारी दस्तावेज़ से मिलान किया गया",
    ta: "அரசு ஆவணத்துடன் சரிபார்க்கப்பட்டது",
    te: "ప్రభుత్వ పత్రంతో సరిచూశాము",
    kn: "ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
    ml: "സർക്കാർ രേഖയുമായി ഒത്തുനോക്കി",
  },
  unconfirmed: {
    en: "Not confirmed — verify before you act",
    hi: "अपुष्ट — कुछ भी करने से पहले पुष्टि करें",
    ta: "உறுதிப்படுத்தப்படவில்லை — நடவடிக்கைக்கு முன் சரிபார்க்கவும்",
    te: "నిర్ధారించబడలేదు — చర్య తీసుకునే ముందు సరిచూసుకోండి",
    kn: "ಖಚಿತಪಡಿಸಿಲ್ಲ — ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ",
    ml: "സ്ഥിരീകരിച്ചിട്ടില്ല — പ്രവർത്തിക്കും മുൻപ് പരിശോധിക്കുക",
  },
  expired: {
    en: "May no longer be in force",
    hi: "संभवतः अब लागू नहीं",
    ta: "இப்போது அமலில் இல்லாமல் இருக்கலாம்",
    te: "ఇప్పుడు అమలులో ఉండకపోవచ్చు",
    kn: "ಈಗ ಜಾರಿಯಲ್ಲಿ ಇಲ್ಲದಿರಬಹುದು",
    ml: "ഇപ്പോൾ പ്രാബല്യത്തിൽ ഇല്ലായിരിക്കാം",
  },
};

/**
 * The line that does the most work in this entire system.
 *
 * Every fraud this service is meant to prevent ends with money changing hands
 * for something the state gives away. It costs one sentence to say so, and it
 * is printed on every receipt and spoken on every unconfirmed answer, because
 * a member who remembers nothing else should remember this.
 */
const FREE_SERVICE: { screen: LocalizedText; spoken: LocalizedText } = {
  screen: {
    en: "This service is free. No agent or official may charge you a fee for a government scheme.",
    hi: "यह सेवा निःशुल्क है। किसी सरकारी योजना के लिए कोई एजेंट या अधिकारी आपसे शुल्क नहीं ले सकता।",
    ta: "இந்தச் சேவை இலவசம். அரசுத் திட்டத்திற்காக எந்த முகவரோ அதிகாரியோ உங்களிடம் கட்டணம் வாங்க முடியாது.",
    te: "ఈ సేవ ఉచితం. ప్రభుత్వ పథకం కోసం ఏ ఏజెంట్ లేదా అధికారి మీ దగ్గర రుసుము తీసుకోకూడదు.",
    kn: "ಈ ಸೇವೆ ಉಚಿತ. ಸರ್ಕಾರಿ ಯೋಜನೆಗಾಗಿ ಯಾವುದೇ ಏಜೆಂಟ್ ಅಥವಾ ಅಧಿಕಾರಿ ನಿಮ್ಮಿಂದ ಶುಲ್ಕ ಪಡೆಯುವಂತಿಲ್ಲ.",
    ml: "ഈ സേവനം സൗജന്യമാണ്. ഒരു സർക്കാർ പദ്ധതിക്കായി ഒരു ഏജന്റിനോ ഉദ്യോഗസ്ഥനോ നിങ്ങളിൽ നിന്ന് ഫീസ് വാങ്ങാൻ കഴിയില്ല.",
  },
  spoken: {
    en: "Remember, this help is free. No agent or official may take money from you for a government scheme.",
    hi: "याद रखें, यह सहायता निःशुल्क है। किसी सरकारी योजना के लिए कोई एजेंट या अधिकारी आपसे पैसे नहीं ले सकता।",
    ta: "நினைவில் கொள்ளுங்கள், இந்த உதவி இலவசம். அரசுத் திட்டத்திற்காக எந்த முகவரோ அதிகாரியோ உங்களிடம் பணம் வாங்க முடியாது.",
    te: "గుర్తుంచుకోండి, ఈ సహాయం ఉచితం. ప్రభుత్వ పథకం కోసం ఏ ఏజెంట్ లేదా అధికారి మీ దగ్గర డబ్బు తీసుకోకూడదు.",
    kn: "ನೆನಪಿಡಿ, ಈ ಸಹಾಯ ಉಚಿತ. ಸರ್ಕಾರಿ ಯೋಜನೆಗಾಗಿ ಯಾವುದೇ ಏಜೆಂಟ್ ಅಥವಾ ಅಧಿಕಾರಿ ನಿಮ್ಮಿಂದ ಹಣ ಪಡೆಯುವಂತಿಲ್ಲ.",
    ml: "ഓർക്കുക, ഈ സഹായം സൗജന്യമാണ്. ഒരു സർക്കാർ പദ്ധതിക്കായി ഒരു ഏജന്റിനോ ഉദ്യോഗസ്ഥനോ നിങ്ങളിൽ നിന്ന് പണം വാങ്ങാൻ കഴിയില്ല.",
  },
};

/**
 * One entry per reason, in both registers.
 *
 * `screen` is written to be scanned; `spoken` is written to be heard once,
 * without a chance to re-read, and therefore leads with the warning word and
 * names the person who can settle it. `{date}` is substituted per reason.
 */
const NOTICE: Record<TrustReason, { screen: LocalizedText; spoken: LocalizedText | null }> = {
  fresh: {
    screen: {
      en: "Checked against the government document on {date}.",
      hi: "सरकारी दस्तावेज़ से {date} को मिलान किया गया।",
      ta: "அரசு ஆவணத்துடன் {date} அன்று சரிபார்க்கப்பட்டது.",
      te: "ప్రభుత్వ పత్రంతో {date} న సరిచూశాము.",
      kn: "ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ {date} ರಂದು ಪರಿಶೀಲಿಸಲಾಗಿದೆ.",
      ml: "സർക്കാർ രേഖയുമായി {date}-ന് ഒത്തുനോക്കിയതാണ്.",
    },
    spoken: null,
  },

  undated: {
    screen: {
      en: "This answer is not tied to a dated government document. Confirm it with your PACS secretary before you act.",
      hi: "यह उत्तर किसी तिथि-अंकित सरकारी दस्तावेज़ से जुड़ा नहीं है। कुछ भी करने से पहले अपने पीएसीएस सचिव से पुष्टि करें।",
      ta: "இந்தப் பதில் தேதியிடப்பட்ட அரசு ஆவணத்துடன் இணைக்கப்படவில்லை. நடவடிக்கை எடுப்பதற்கு முன் உங்கள் பாக்ஸ் செயலாளரிடம் உறுதிப்படுத்துங்கள்.",
      te: "ఈ సమాధానం తేదీతో కూడిన ప్రభుత్వ పత్రంతో అనుసంధానించబడలేదు. ఏదైనా చేసే ముందు మీ PACS కార్యదర్శిని అడిగి నిర్ధారించుకోండి.",
      kn: "ಈ ಉತ್ತರ ದಿನಾಂಕ ಸಹಿತ ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ ಜೋಡಣೆಯಾಗಿಲ್ಲ. ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "ഈ ഉത്തരം തീയതി രേഖപ്പെടുത്തിയ സർക്കാർ രേഖയുമായി ബന്ധിപ്പിച്ചിട്ടില്ല. എന്തെങ്കിലും ചെയ്യുന്നതിനു മുൻപ് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ഉറപ്പുവരുത്തുക.",
    },
    spoken: {
      en: "One caution. This answer is not tied to a dated government document, so confirm it with your PACS secretary before you act.",
      hi: "एक सावधानी। यह उत्तर किसी तिथि-अंकित सरकारी दस्तावेज़ से जुड़ा नहीं है, इसलिए कुछ भी करने से पहले अपने पीएसीएस सचिव से पुष्टि कर लें।",
      ta: "ஒரு எச்சரிக்கை. இந்தப் பதில் தேதியிடப்பட்ட அரசு ஆவணத்துடன் இணைக்கப்படவில்லை, எனவே நடவடிக்கை எடுப்பதற்கு முன் உங்கள் பாக்ஸ் செயலாளரிடம் உறுதிப்படுத்திக் கொள்ளுங்கள்.",
      te: "ఒక హెచ్చరిక. ఈ సమాధానం తేదీతో కూడిన ప్రభుత్వ పత్రంతో అనుసంధానించబడలేదు, కాబట్టి ఏదైనా చేసే ముందు మీ PACS కార్యదర్శిని అడిగి నిర్ధారించుకోండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಈ ಉತ್ತರ ದಿನಾಂಕ ಸಹಿತ ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ ಜೋಡಣೆಯಾಗಿಲ್ಲ, ಆದ್ದರಿಂದ ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. ഈ ഉത്തരം തീയതി രേഖപ്പെടുത്തിയ സർക്കാർ രേഖയുമായി ബന്ധിപ്പിച്ചിട്ടില്ല, അതിനാൽ എന്തെങ്കിലും ചെയ്യുന്നതിനു മുൻപ് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ഉറപ്പുവരുത്തുക.",
    },
  },

  "review-overdue": {
    screen: {
      en: "Last checked against the government document on {date}. Scheme rules change — reconfirm before you act or pay anyone.",
      hi: "सरकारी दस्तावेज़ से आखिरी बार {date} को मिलान किया गया। योजना के नियम बदलते रहते हैं — कुछ भी करने या किसी को पैसे देने से पहले दोबारा पुष्टि करें।",
      ta: "அரசு ஆவணத்துடன் கடைசியாக {date} அன்று சரிபார்க்கப்பட்டது. திட்ட விதிகள் மாறும் — நடவடிக்கை எடுப்பதற்கு அல்லது யாருக்கும் பணம் கொடுப்பதற்கு முன் மீண்டும் உறுதிப்படுத்துங்கள்.",
      te: "ప్రభుత్వ పత్రంతో చివరిసారి {date} న సరిచూశాము. పథకం నిబంధనలు మారుతుంటాయి — ఏదైనా చేసే ముందు లేదా ఎవరికైనా డబ్బు చెల్లించే ముందు మళ్లీ నిర్ధారించుకోండి.",
      kn: "ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ ಕೊನೆಯ ಬಾರಿ {date} ರಂದು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಯೋಜನೆಯ ನಿಯಮಗಳು ಬದಲಾಗುತ್ತವೆ — ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ಅಥವಾ ಯಾರಿಗಾದರೂ ಹಣ ಕೊಡುವ ಮೊದಲು ಮತ್ತೊಮ್ಮೆ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "സർക്കാർ രേഖയുമായി അവസാനം {date}-ന് ഒത്തുനോക്കിയതാണ്. പദ്ധതി നിയമങ്ങൾ മാറാം — എന്തെങ്കിലും ചെയ്യുന്നതിനോ ആർക്കെങ്കിലും പണം നൽകുന്നതിനോ മുൻപ് വീണ്ടും ഉറപ്പുവരുത്തുക.",
    },
    spoken: {
      en: "One caution. This answer was last checked against the government document on {date}. Scheme rules change, so confirm with your PACS secretary before you act or pay anyone.",
      hi: "एक सावधानी। यह उत्तर सरकारी दस्तावेज़ से आखिरी बार {date} को जांचा गया था। योजना के नियम बदलते रहते हैं, इसलिए कुछ भी करने या किसी को पैसे देने से पहले अपने पीएसीएस सचिव से पुष्टि कर लें।",
      ta: "ஒரு எச்சரிக்கை. இந்தப் பதில் அரசு ஆவணத்துடன் கடைசியாக {date} அன்று சரிபார்க்கப்பட்டது. திட்ட விதிகள் மாறும், எனவே நடவடிக்கை எடுப்பதற்கு அல்லது யாருக்கும் பணம் கொடுப்பதற்கு முன் உங்கள் பாக்ஸ் செயலாளரிடம் உறுதிப்படுத்திக் கொள்ளுங்கள்.",
      te: "ఒక హెచ్చరిక. ఈ సమాధానాన్ని ప్రభుత్వ పత్రంతో చివరిసారి {date} న సరిచూశాము. పథకం నిబంధనలు మారుతుంటాయి, కాబట్టి ఏదైనా చేసే ముందు లేదా ఎవరికైనా డబ్బు చెల్లించే ముందు మీ PACS కార్యదర్శిని అడిగి నిర్ధారించుకోండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಈ ಉತ್ತರವನ್ನು ಸರ್ಕಾರಿ ದಾಖಲೆಯೊಂದಿಗೆ ಕೊನೆಯ ಬಾರಿ {date} ರಂದು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಯೋಜನೆಯ ನಿಯಮಗಳು ಬದಲಾಗುತ್ತವೆ, ಆದ್ದರಿಂದ ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ಅಥವಾ ಯಾರಿಗಾದರೂ ಹಣ ಕೊಡುವ ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. ഈ ഉത്തരം സർക്കാർ രേഖയുമായി അവസാനം {date}-ന് പരിശോധിച്ചതാണ്. പദ്ധതി നിയമങ്ങൾ മാറാം, അതിനാൽ എന്തെങ്കിലും ചെയ്യുന്നതിനോ ആർക്കെങ്കിലും പണം നൽകുന്നതിനോ മുൻപ് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ഉറപ്പുവരുത്തുക.",
    },
  },

  "source-changed": {
    screen: {
      en: "The government document this answer rests on changed on {date} and has not been re-checked yet. Treat this as unconfirmed.",
      hi: "जिस सरकारी दस्तावेज़ पर यह उत्तर आधारित है वह {date} को बदल गया और अभी उसकी दोबारा जांच नहीं हुई है। इसे अपुष्ट मानें।",
      ta: "இந்தப் பதிலுக்கு ஆதாரமான அரசு ஆவணம் {date} அன்று மாற்றப்பட்டுள்ளது, இன்னும் மீண்டும் சரிபார்க்கப்படவில்லை. இதை உறுதிப்படுத்தப்படாததாகக் கருதுங்கள்.",
      te: "ఈ సమాధానానికి ఆధారమైన ప్రభుత్వ పత్రం {date} న మారింది, ఇంకా మళ్లీ సరిచూడలేదు. దీన్ని నిర్ధారించబడనిదిగా భావించండి.",
      kn: "ಈ ಉತ್ತರಕ್ಕೆ ಆಧಾರವಾದ ಸರ್ಕಾರಿ ದಾಖಲೆ {date} ರಂದು ಬದಲಾಗಿದೆ, ಇನ್ನೂ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿಲ್ಲ. ಇದನ್ನು ಖಚಿತಪಡಿಸದ್ದೆಂದು ಪರಿಗಣಿಸಿ.",
      ml: "ഈ ഉത്തരത്തിന് ആധാരമായ സർക്കാർ രേഖ {date}-ന് മാറി, ഇതുവരെ വീണ്ടും പരിശോധിച്ചിട്ടില്ല. ഇത് സ്ഥിരീകരിക്കാത്തതായി കണക്കാക്കുക.",
    },
    spoken: {
      en: "Important. The government document this answer rests on has changed and the answer has not been re-checked yet. Do not act on it, and do not pay anyone, until your PACS secretary confirms it.",
      hi: "महत्वपूर्ण सूचना। जिस सरकारी दस्तावेज़ पर यह उत्तर आधारित है वह बदल गया है और उत्तर की दोबारा जांच अभी नहीं हुई है। जब तक आपके पीएसीएस सचिव पुष्टि न करें, इस पर कार्रवाई न करें और किसी को पैसे न दें।",
      ta: "முக்கியம். இந்தப் பதிலுக்கு ஆதாரமான அரசு ஆவணம் மாறியுள்ளது, பதில் இன்னும் மீண்டும் சரிபார்க்கப்படவில்லை. உங்கள் பாக்ஸ் செயலாளர் உறுதிப்படுத்தும் வரை இதன்படி நடக்க வேண்டாம், யாருக்கும் பணம் கொடுக்க வேண்டாம்.",
      te: "ముఖ్యమైన సూచన. ఈ సమాధానానికి ఆధారమైన ప్రభుత్వ పత్రం మారింది, సమాధానాన్ని ఇంకా మళ్లీ సరిచూడలేదు. మీ PACS కార్యదర్శి నిర్ధారించే వరకు దీని ప్రకారం చర్య తీసుకోవద్దు, ఎవరికీ డబ్బు ఇవ్వవద్దు.",
      kn: "ಮುಖ್ಯ ಸೂಚನೆ. ಈ ಉತ್ತರಕ್ಕೆ ಆಧಾರವಾದ ಸರ್ಕಾರಿ ದಾಖಲೆ ಬದಲಾಗಿದೆ ಮತ್ತು ಉತ್ತರವನ್ನು ಇನ್ನೂ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿಲ್ಲ. ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿ ಖಚಿತಪಡಿಸುವವರೆಗೆ ಇದರ ಪ್ರಕಾರ ನಡೆಯಬೇಡಿ, ಯಾರಿಗೂ ಹಣ ಕೊಡಬೇಡಿ.",
      ml: "പ്രധാനം. ഈ ഉത്തരത്തിന് ആധാരമായ സർക്കാർ രേഖ മാറിയിട്ടുണ്ട്, ഉത്തരം ഇതുവരെ വീണ്ടും പരിശോധിച്ചിട്ടില്ല. നിങ്ങളുടെ PACS സെക്രട്ടറി സ്ഥിരീകരിക്കുന്നതുവരെ ഇതനുസരിച്ച് പ്രവർത്തിക്കരുത്, ആർക്കും പണം നൽകരുത്.",
    },
  },

  "source-unreachable": {
    screen: {
      en: "The government source behind this answer has not responded since {date}, so it could not be confirmed. Verify before you act.",
      hi: "इस उत्तर के पीछे का सरकारी स्रोत {date} से प्रतिक्रिया नहीं दे रहा, इसलिए इसकी पुष्टि नहीं हो सकी। कुछ भी करने से पहले सत्यापित करें।",
      ta: "இந்தப் பதிலுக்குப் பின்னால் உள்ள அரசு ஆதாரம் {date} முதல் பதிலளிக்கவில்லை, எனவே இதை உறுதிப்படுத்த முடியவில்லை. நடவடிக்கைக்கு முன் சரிபார்க்கவும்.",
      te: "ఈ సమాధానం వెనుక ఉన్న ప్రభుత్వ మూలం {date} నుండి స్పందించడం లేదు, కాబట్టి దీన్ని నిర్ధారించలేకపోయాము. చర్య తీసుకునే ముందు సరిచూసుకోండి.",
      kn: "ಈ ಉತ್ತರದ ಹಿಂದಿನ ಸರ್ಕಾರಿ ಮೂಲ {date} ರಿಂದ ಪ್ರತಿಕ್ರಿಯಿಸುತ್ತಿಲ್ಲ, ಆದ್ದರಿಂದ ಇದನ್ನು ಖಚಿತಪಡಿಸಲಾಗಲಿಲ್ಲ. ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.",
      ml: "ഈ ഉത്തരത്തിന് പിന്നിലെ സർക്കാർ സ്രോതസ്സ് {date} മുതൽ പ്രതികരിക്കുന്നില്ല, അതിനാൽ ഇത് സ്ഥിരീകരിക്കാൻ കഴിഞ്ഞില്ല. പ്രവർത്തിക്കും മുൻപ് പരിശോധിക്കുക.",
    },
    spoken: {
      en: "One caution. The government source behind this answer could not be reached to confirm it. Check with your PACS secretary before you act or pay anyone.",
      hi: "एक सावधानी। इस उत्तर के पीछे के सरकारी स्रोत तक पुष्टि के लिए पहुंचा नहीं जा सका। कुछ भी करने या किसी को पैसे देने से पहले अपने पीएसीएस सचिव से जांच लें।",
      ta: "ஒரு எச்சரிக்கை. இந்தப் பதிலை உறுதிப்படுத்த அரசு ஆதாரத்தை அணுக முடியவில்லை. நடவடிக்கை எடுப்பதற்கு அல்லது யாருக்கும் பணம் கொடுப்பதற்கு முன் உங்கள் பாக்ஸ் செயலாளரிடம் சரிபார்க்கவும்.",
      te: "ఒక హెచ్చరిక. ఈ సమాధానాన్ని నిర్ధారించడానికి ప్రభుత్వ మూలాన్ని చేరుకోలేకపోయాము. ఏదైనా చేసే ముందు లేదా ఎవరికైనా డబ్బు చెల్లించే ముందు మీ PACS కార్యదర్శిని అడగండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಈ ಉತ್ತರವನ್ನು ಖಚಿತಪಡಿಸಲು ಸರ್ಕಾರಿ ಮೂಲವನ್ನು ತಲುಪಲಾಗಲಿಲ್ಲ. ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ಅಥವಾ ಯಾರಿಗಾದರೂ ಹಣ ಕೊಡುವ ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. ഈ ഉത്തരം സ്ഥിരീകരിക്കാൻ സർക്കാർ സ്രോതസ്സിൽ എത്താൻ കഴിഞ്ഞില്ല. എന്തെങ്കിലും ചെയ്യുന്നതിനോ ആർക്കെങ്കിലും പണം നൽകുന്നതിനോ മുൻപ് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക.",
    },
  },

  "human-check-overdue": {
    screen: {
      en: "This figure comes from an announcement page that cannot be checked automatically, and no one has checked it by hand since {date}. It may have been revised.",
      hi: "यह आंकड़ा एक घोषणा पृष्ठ से है जिसकी स्वतः जांच नहीं हो सकती, और {date} से किसी ने इसे हाथ से नहीं जांचा है। इसमें संशोधन हो सकता है।",
      ta: "இந்த எண்ணிக்கை தானாக சரிபார்க்க முடியாத ஓர் அறிவிப்புப் பக்கத்திலிருந்து வருகிறது, {date} முதல் யாரும் இதை நேரடியாகச் சரிபார்க்கவில்லை. இது திருத்தப்பட்டிருக்கலாம்.",
      te: "ఈ సంఖ్య ఆటోమేటిక్‌గా సరిచూడలేని ఒక ప్రకటన పేజీ నుండి వచ్చింది, {date} నుండి ఎవరూ దీన్ని స్వయంగా సరిచూడలేదు. ఇది సవరించబడి ఉండవచ్చు.",
      kn: "ಈ ಅಂಕಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪರಿಶೀಲಿಸಲಾಗದ ಘೋಷಣಾ ಪುಟದಿಂದ ಬಂದಿದೆ, {date} ರಿಂದ ಯಾರೂ ಇದನ್ನು ಕೈಯಾರೆ ಪರಿಶೀಲಿಸಿಲ್ಲ. ಇದು ಪರಿಷ್ಕರಣೆಯಾಗಿರಬಹುದು.",
      ml: "ഈ കണക്ക് സ്വയമേവ പരിശോധിക്കാനാകാത്ത ഒരു അറിയിപ്പ് പേജിൽ നിന്നാണ്, {date} മുതൽ ആരും ഇത് നേരിട്ട് പരിശോധിച്ചിട്ടില്ല. ഇത് പരിഷ്കരിച്ചിരിക്കാം.",
    },
    spoken: {
      en: "One caution. This figure comes from an announcement page nobody has checked by hand since {date}, and it may have been revised. Confirm the current figure with your PACS secretary before you act.",
      hi: "एक सावधानी। यह आंकड़ा एक घोषणा पृष्ठ से है जिसे {date} से किसी ने हाथ से नहीं जांचा, और इसमें संशोधन हो सकता है। कुछ भी करने से पहले मौजूदा आंकड़ा अपने पीएसीएस सचिव से पुष्टि करें।",
      ta: "ஒரு எச்சரிக்கை. இந்த எண்ணிக்கை {date} முதல் யாரும் நேரடியாகச் சரிபார்க்காத ஓர் அறிவிப்புப் பக்கத்திலிருந்து வருகிறது, இது திருத்தப்பட்டிருக்கலாம். நடவடிக்கைக்கு முன் தற்போதைய எண்ணிக்கையை உங்கள் பாக்ஸ் செயலாளரிடம் உறுதிப்படுத்துங்கள்.",
      te: "ఒక హెచ్చరిక. ఈ సంఖ్య {date} నుండి ఎవరూ స్వయంగా సరిచూడని ఒక ప్రకటన పేజీ నుండి వచ్చింది, ఇది సవరించబడి ఉండవచ్చు. చర్య తీసుకునే ముందు ప్రస్తుత సంఖ్యను మీ PACS కార్యదర్శితో నిర్ధారించుకోండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಈ ಅಂಕಿ {date} ರಿಂದ ಯಾರೂ ಕೈಯಾರೆ ಪರಿಶೀಲಿಸದ ಘೋಷಣಾ ಪುಟದಿಂದ ಬಂದಿದೆ, ಇದು ಪರಿಷ್ಕರಣೆಯಾಗಿರಬಹುದು. ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಪ್ರಸ್ತುತ ಅಂಕಿಯನ್ನು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. ഈ കണക്ക് {date} മുതൽ ആരും നേരിട്ട് പരിശോധിക്കാത്ത ഒരു അറിയിപ്പ് പേജിൽ നിന്നാണ്, ഇത് പരിഷ്കരിച്ചിരിക്കാം. പ്രവർത്തിക്കും മുൻപ് നിലവിലെ കണക്ക് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ഉറപ്പുവരുത്തുക.",
    },
  },

  "past-validity": {
    screen: {
      en: "This rule applied only until {date} and may no longer be in force. Do not pay anyone on the strength of it.",
      hi: "यह नियम केवल {date} तक लागू था और अब शायद लागू न हो। इसके आधार पर किसी को पैसे न दें।",
      ta: "இந்த விதி {date} வரை மட்டுமே பொருந்தியது, இப்போது அமலில் இல்லாமல் இருக்கலாம். இதை நம்பி யாருக்கும் பணம் கொடுக்க வேண்டாம்.",
      te: "ఈ నిబంధన {date} వరకు మాత్రమే వర్తించింది, ఇప్పుడు అమలులో ఉండకపోవచ్చు. దీని ఆధారంగా ఎవరికీ డబ్బు ఇవ్వవద్దు.",
      kn: "ಈ ನಿಯಮ {date} ವರೆಗೆ ಮಾತ್ರ ಅನ್ವಯಿಸುತ್ತಿತ್ತು, ಈಗ ಜಾರಿಯಲ್ಲಿ ಇಲ್ಲದಿರಬಹುದು. ಇದನ್ನು ನಂಬಿ ಯಾರಿಗೂ ಹಣ ಕೊಡಬೇಡಿ.",
      ml: "ഈ നിയമം {date} വരെ മാത്രമേ ബാധകമായിരുന്നുള്ളൂ, ഇപ്പോൾ പ്രാബല്യത്തിൽ ഇല്ലായിരിക്കാം. ഇത് വിശ്വസിച്ച് ആർക്കും പണം നൽകരുത്.",
    },
    spoken: {
      en: "Warning. This rule applied only until {date} and may no longer be in force. Do not pay anyone on the strength of it. Ask your PACS secretary what applies now.",
      hi: "चेतावनी। यह नियम केवल {date} तक लागू था और अब शायद लागू न हो। इसके आधार पर किसी को पैसे न दें। अभी क्या लागू है, यह अपने पीएसीएस सचिव से पूछें।",
      ta: "எச்சரிக்கை. இந்த விதி {date} வரை மட்டுமே பொருந்தியது, இப்போது அமலில் இல்லாமல் இருக்கலாம். இதை நம்பி யாருக்கும் பணம் கொடுக்க வேண்டாம். இப்போது என்ன பொருந்தும் என்பதை உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள்.",
      te: "హెచ్చరిక. ఈ నిబంధన {date} వరకు మాత్రమే వర్తించింది, ఇప్పుడు అమలులో ఉండకపోవచ్చు. దీని ఆధారంగా ఎవరికీ డబ్బు ఇవ్వవద్దు. ఇప్పుడు ఏది వర్తిస్తుందో మీ PACS కార్యదర్శిని అడగండి.",
      kn: "ಎಚ್ಚರಿಕೆ. ಈ ನಿಯಮ {date} ವರೆಗೆ ಮಾತ್ರ ಅನ್ವಯಿಸುತ್ತಿತ್ತು, ಈಗ ಜಾರಿಯಲ್ಲಿ ಇಲ್ಲದಿರಬಹುದು. ಇದನ್ನು ನಂಬಿ ಯಾರಿಗೂ ಹಣ ಕೊಡಬೇಡಿ. ಈಗ ಏನು ಅನ್ವಯಿಸುತ್ತದೆ ಎಂದು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ.",
      ml: "മുന്നറിയിപ്പ്. ഈ നിയമം {date} വരെ മാത്രമേ ബാധകമായിരുന്നുള്ളൂ, ഇപ്പോൾ പ്രാബല്യത്തിൽ ഇല്ലായിരിക്കാം. ഇത് വിശ്വസിച്ച് ആർക്കും പണം നൽകരുത്. ഇപ്പോൾ എന്താണ് ബാധകമെന്ന് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക.",
    },
  },

  offline: {
    screen: {
      en: "This kiosk is offline, so this answer could not be checked against the government source today. Verify before you act.",
      hi: "यह कियोस्क अभी ऑफ़लाइन है, इसलिए आज इस उत्तर का सरकारी स्रोत से मिलान नहीं हो सका। कुछ भी करने से पहले सत्यापित करें।",
      ta: "இந்த கியோஸ்க் தற்போது இணைப்பில் இல்லை, எனவே இன்று இந்தப் பதிலை அரசு ஆதாரத்துடன் சரிபார்க்க முடியவில்லை. நடவடிக்கைக்கு முன் சரிபார்க்கவும்.",
      te: "ఈ కియోస్క్ ప్రస్తుతం ఆఫ్‌లైన్‌లో ఉంది, కాబట్టి ఈ రోజు ఈ సమాధానాన్ని ప్రభుత్వ మూలంతో సరిచూడలేకపోయాము. చర్య తీసుకునే ముందు సరిచూసుకోండి.",
      kn: "ಈ ಕಿಯೋಸ್ಕ್ ಸದ್ಯ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ, ಆದ್ದರಿಂದ ಇಂದು ಈ ಉತ್ತರವನ್ನು ಸರ್ಕಾರಿ ಮೂಲದೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಪರಿಶೀಲಿಸಿ.",
      ml: "ഈ കിയോസ്ക് ഇപ്പോൾ ഓഫ്‌ലൈനാണ്, അതിനാൽ ഇന്ന് ഈ ഉത്തരം സർക്കാർ സ്രോതസ്സുമായി പരിശോധിക്കാൻ കഴിഞ്ഞില്ല. പ്രവർത്തിക്കും മുൻപ് പരിശോധിക്കുക.",
    },
    spoken: {
      en: "One caution. This kiosk is offline, so I could not check this answer against the government source today. Confirm it with your PACS secretary before you act or pay anyone.",
      hi: "एक सावधानी। यह कियोस्क अभी ऑफ़लाइन है, इसलिए आज मैं इस उत्तर का सरकारी स्रोत से मिलान नहीं कर सका। कुछ भी करने या किसी को पैसे देने से पहले अपने पीएसीएस सचिव से पुष्टि कर लें।",
      ta: "ஒரு எச்சரிக்கை. இந்த கியோஸ்க் இணைப்பில் இல்லை, எனவே இன்று இந்தப் பதிலை அரசு ஆதாரத்துடன் என்னால் சரிபார்க்க முடியவில்லை. நடவடிக்கை எடுப்பதற்கு அல்லது யாருக்கும் பணம் கொடுப்பதற்கு முன் உங்கள் பாக்ஸ் செயலாளரிடம் உறுதிப்படுத்துங்கள்.",
      te: "ఒక హెచ్చరిక. ఈ కియోస్క్ ఆఫ్‌లైన్‌లో ఉంది, కాబట్టి ఈ రోజు ఈ సమాధానాన్ని ప్రభుత్వ మూలంతో నేను సరిచూడలేకపోయాను. ఏదైనా చేసే ముందు లేదా ఎవరికైనా డబ్బు చెల్లించే ముందు మీ PACS కార్యదర్శిని అడిగి నిర్ధారించుకోండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಈ ಕಿಯೋಸ್ಕ್ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ, ಆದ್ದರಿಂದ ಇಂದು ಈ ಉತ್ತರವನ್ನು ಸರ್ಕಾರಿ ಮೂಲದೊಂದಿಗೆ ನಾನು ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ಅಥವಾ ಯಾರಿಗಾದರೂ ಹಣ ಕೊಡುವ ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯಿಂದ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. ഈ കിയോസ്ക് ഓഫ്‌ലൈനാണ്, അതിനാൽ ഇന്ന് ഈ ഉത്തരം സർക്കാർ സ്രോതസ്സുമായി എനിക്ക് പരിശോധിക്കാൻ കഴിഞ്ഞില്ല. എന്തെങ്കിലും ചെയ്യുന്നതിനോ ആർക്കെങ്കിലും പണം നൽകുന്നതിനോ മുൻപ് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ഉറപ്പുവരുത്തുക.",
    },
  },
  /**
   * The moment the fraud actually happens.
   *
   * "I do not know, a PACS officer will call you" is the most dangerous
   * sentence this service says. It is the opening the intermediary is waiting
   * for — the machine has just admitted ignorance, and he has not. Every other
   * answer carried the free-service line and this one did not, which meant the
   * warning was present everywhere except where it was needed most.
   */
  "no-answer": {
    screen: {
      en: "I could not answer this from the government documents I hold. Nobody may charge you a fee to find out — ask your PACS secretary, or file it as a grievance so it is on record.",
      hi: "मेरे पास मौजूद सरकारी दस्तावेज़ों से मैं इसका उत्तर नहीं दे सका। यह पता करने के लिए कोई आपसे शुल्क नहीं ले सकता — अपने पीएसीएस सचिव से पूछें, या इसे शिकायत के रूप में दर्ज करें ताकि यह रिकॉर्ड में रहे।",
      ta: "என்னிடம் உள்ள அரசு ஆவணங்களிலிருந்து இதற்கு என்னால் பதிலளிக்க முடியவில்லை. இதை அறிய யாரும் உங்களிடம் கட்டணம் வாங்க முடியாது — உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள், அல்லது பதிவில் இருக்க இதைப் புகாராகப் பதிவு செய்யுங்கள்.",
      te: "నా దగ్గరున్న ప్రభుత్వ పత్రాల నుండి దీనికి నేను సమాధానం ఇవ్వలేకపోయాను. ఇది తెలుసుకోవడానికి ఎవరూ మీ దగ్గర రుసుము తీసుకోకూడదు — మీ PACS కార్యదర్శిని అడగండి, లేదా రికార్డులో ఉండేలా దీన్ని ఫిర్యాదుగా నమోదు చేయండి.",
      kn: "ನನ್ನ ಬಳಿ ಇರುವ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳಿಂದ ಇದಕ್ಕೆ ನಾನು ಉತ್ತರಿಸಲಾಗಲಿಲ್ಲ. ಇದನ್ನು ತಿಳಿಯಲು ಯಾರೂ ನಿಮ್ಮಿಂದ ಶುಲ್ಕ ಪಡೆಯುವಂತಿಲ್ಲ — ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ, ಅಥವಾ ದಾಖಲೆಯಲ್ಲಿ ಇರುವಂತೆ ಇದನ್ನು ದೂರಾಗಿ ದಾಖಲಿಸಿ.",
      ml: "എന്റെ പക്കലുള്ള സർക്കാർ രേഖകളിൽ നിന്ന് ഇതിന് ഉത്തരം നൽകാൻ കഴിഞ്ഞില്ല. ഇത് അറിയാൻ ആർക്കും നിങ്ങളിൽ നിന്ന് ഫീസ് വാങ്ങാൻ കഴിയില്ല — നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക, അല്ലെങ്കിൽ രേഖയിൽ വരാൻ ഇത് പരാതിയായി നൽകുക.",
    },
    spoken: {
      en: "I could not answer this from the government documents I hold, so I am not going to guess. Nobody may charge you a fee to find out. Ask your PACS secretary, and if anyone asks you for money, report it.",
      hi: "मेरे पास मौजूद सरकारी दस्तावेज़ों से मैं इसका उत्तर नहीं दे सका, इसलिए मैं अनुमान नहीं लगाऊंगा। यह पता करने के लिए कोई आपसे शुल्क नहीं ले सकता। अपने पीएसीएस सचिव से पूछें, और अगर कोई आपसे पैसे मांगे तो उसकी शिकायत करें।",
      ta: "என்னிடம் உள்ள அரசு ஆவணங்களிலிருந்து இதற்கு என்னால் பதிலளிக்க முடியவில்லை, எனவே நான் யூகிக்கப் போவதில்லை. இதை அறிய யாரும் உங்களிடம் கட்டணம் வாங்க முடியாது. உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள், யாராவது உங்களிடம் பணம் கேட்டால் புகாரளியுங்கள்.",
      te: "నా దగ్గరున్న ప్రభుత్వ పత్రాల నుండి దీనికి సమాధానం ఇవ్వలేకపోయాను, కాబట్టి నేను ఊహించను. ఇది తెలుసుకోవడానికి ఎవరూ మీ దగ్గర రుసుము తీసుకోకూడదు. మీ PACS కార్యదర్శిని అడగండి, ఎవరైనా మీ దగ్గర డబ్బు అడిగితే ఫిర్యాదు చేయండి.",
      kn: "ನನ್ನ ಬಳಿ ಇರುವ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳಿಂದ ಇದಕ್ಕೆ ಉತ್ತರಿಸಲಾಗಲಿಲ್ಲ, ಆದ್ದರಿಂದ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ. ಇದನ್ನು ತಿಳಿಯಲು ಯಾರೂ ನಿಮ್ಮಿಂದ ಶುಲ್ಕ ಪಡೆಯುವಂತಿಲ್ಲ. ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ, ಯಾರಾದರೂ ನಿಮ್ಮಿಂದ ಹಣ ಕೇಳಿದರೆ ದೂರು ನೀಡಿ.",
      ml: "എന്റെ പക്കലുള്ള സർക്കാർ രേഖകളിൽ നിന്ന് ഇതിന് ഉത്തരം നൽകാൻ കഴിഞ്ഞില്ല, അതിനാൽ ഞാൻ ഊഹിക്കുന്നില്ല. ഇത് അറിയാൻ ആർക്കും നിങ്ങളിൽ നിന്ന് ഫീസ് വാങ്ങാൻ കഴിയില്ല. നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക, ആരെങ്കിലും പണം ചോദിച്ചാൽ പരാതിപ്പെടുക.",
    },
  },

  /**
   * What the counter says, against what the page says.
   *
   * The document is evidence of what was written; a refusal at the window is
   * evidence of what is being done. When they disagree the member is living in
   * the second one, and a system that keeps reciting the first is worse than
   * useless to them.
   */
  "field-rejected": {
    screen: {
      en: "Members have reported being refused this at the counter, even though the government document still says it applies. Ask your PACS secretary what is actually being accepted before you rely on it.",
      hi: "सदस्यों ने बताया है कि काउंटर पर उन्हें यह देने से इनकार किया गया, जबकि सरकारी दस्तावेज़ में यह अब भी लागू है। इस पर भरोसा करने से पहले अपने पीएसीएस सचिव से पूछें कि वास्तव में क्या स्वीकार किया जा रहा है।",
      ta: "அரசு ஆவணத்தில் இது இன்னும் பொருந்தும் என்று இருந்தாலும், கவுண்ட்டரில் இது மறுக்கப்பட்டதாக உறுப்பினர்கள் தெரிவித்துள்ளனர். இதை நம்புவதற்கு முன், உண்மையில் என்ன ஏற்கப்படுகிறது என்பதை உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள்.",
      te: "ప్రభుత్వ పత్రంలో ఇది ఇంకా వర్తిస్తుందని ఉన్నప్పటికీ, కౌంటర్‌లో దీన్ని నిరాకరించారని సభ్యులు తెలిపారు. దీనిపై ఆధారపడే ముందు నిజంగా ఏమి ఆమోదిస్తున్నారో మీ PACS కార్యదర్శిని అడగండి.",
      kn: "ಸರ್ಕಾರಿ ದಾಖಲೆಯಲ್ಲಿ ಇದು ಇನ್ನೂ ಅನ್ವಯಿಸುತ್ತದೆ ಎಂದಿದ್ದರೂ, ಕೌಂಟರ್‌ನಲ್ಲಿ ಇದನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ ಎಂದು ಸದಸ್ಯರು ವರದಿ ಮಾಡಿದ್ದಾರೆ. ಇದನ್ನು ನಂಬುವ ಮೊದಲು ನಿಜವಾಗಿ ಏನು ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿದೆ ಎಂದು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ.",
      ml: "സർക്കാർ രേഖയിൽ ഇത് ഇപ്പോഴും ബാധകമാണെന്ന് പറയുന്നുണ്ടെങ്കിലും, കൗണ്ടറിൽ ഇത് നിരസിക്കപ്പെട്ടതായി അംഗങ്ങൾ റിപ്പോർട്ട് ചെയ്തിട്ടുണ്ട്. ഇതിനെ ആശ്രയിക്കും മുൻപ് യഥാർത്ഥത്തിൽ എന്താണ് സ്വീകരിക്കുന്നതെന്ന് നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക.",
    },
    spoken: {
      en: "One caution. Other members have reported being refused this at the counter, even though the government document still says it applies. Check what is actually being accepted before you act or pay anyone.",
      hi: "एक सावधानी। अन्य सदस्यों ने बताया है कि काउंटर पर उन्हें यह देने से इनकार किया गया, जबकि सरकारी दस्तावेज़ में यह अब भी लागू है। कुछ भी करने या किसी को पैसे देने से पहले जांच लें कि वास्तव में क्या स्वीकार किया जा रहा है।",
      ta: "ஒரு எச்சரிக்கை. அரசு ஆவணத்தில் இது இன்னும் பொருந்தும் என்றிருந்தாலும், கவுண்ட்டரில் இது மறுக்கப்பட்டதாக மற்ற உறுப்பினர்கள் தெரிவித்துள்ளனர். நடவடிக்கை எடுப்பதற்கு அல்லது யாருக்கும் பணம் கொடுப்பதற்கு முன் உண்மையில் என்ன ஏற்கப்படுகிறது என்பதைச் சரிபார்க்கவும்.",
      te: "ఒక హెచ్చరిక. ప్రభుత్వ పత్రంలో ఇది ఇంకా వర్తిస్తుందని ఉన్నా, కౌంటర్‌లో దీన్ని నిరాకరించారని ఇతర సభ్యులు తెలిపారు. ఏదైనా చేసే ముందు లేదా ఎవరికైనా డబ్బు చెల్లించే ముందు నిజంగా ఏమి ఆమోదిస్తున్నారో సరిచూసుకోండి.",
      kn: "ಒಂದು ಎಚ್ಚರಿಕೆ. ಸರ್ಕಾರಿ ದಾಖಲೆಯಲ್ಲಿ ಇದು ಇನ್ನೂ ಅನ್ವಯಿಸುತ್ತದೆ ಎಂದಿದ್ದರೂ, ಕೌಂಟರ್‌ನಲ್ಲಿ ಇದನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ ಎಂದು ಇತರ ಸದಸ್ಯರು ವರದಿ ಮಾಡಿದ್ದಾರೆ. ಏನಾದರೂ ಮಾಡುವ ಮೊದಲು ಅಥವಾ ಯಾರಿಗಾದರೂ ಹಣ ಕೊಡುವ ಮೊದಲು ನಿಜವಾಗಿ ಏನು ಸ್ವೀಕರಿಸಲಾಗುತ್ತಿದೆ ಎಂದು ಪರಿಶೀಲಿಸಿ.",
      ml: "ഒരു മുന്നറിയിപ്പ്. സർക്കാർ രേഖയിൽ ഇത് ഇപ്പോഴും ബാധകമാണെന്ന് പറയുന്നുണ്ടെങ്കിലും, കൗണ്ടറിൽ ഇത് നിരസിക്കപ്പെട്ടതായി മറ്റ് അംഗങ്ങൾ റിപ്പോർട്ട് ചെയ്തിട്ടുണ്ട്. എന്തെങ്കിലും ചെയ്യുന്നതിനോ ആർക്കെങ്കിലും പണം നൽകുന്നതിനോ മുൻപ് യഥാർത്ഥത്തിൽ എന്താണ് സ്വീകരിക്കുന്നതെന്ന് പരിശോധിക്കുക.",
    },
  },

  /**
   * Money is the only fact a department cannot leave up out of habit.
   *
   * A scheme page stays online for years after the scheme ends; a payment run
   * does not happen out of politeness. When the published record shows nothing
   * paid for longer than the scheme's own cycle, the scheme has stopped,
   * whatever its brochure says.
   */
  "scheme-dormant": {
    screen: {
      en: "The last payment recorded under this scheme was on {date}, and nothing has been paid since. It may have stopped, whatever the scheme page still says.",
      hi: "इस योजना के तहत दर्ज अंतिम भुगतान {date} को हुआ था, और उसके बाद कुछ नहीं दिया गया। योजना का पृष्ठ चाहे जो कहे, यह बंद हो चुकी हो सकती है।",
      ta: "இந்தத் திட்டத்தின் கீழ் பதிவான கடைசி பணப்பட்டுவாடா {date} அன்று, அதன் பிறகு எதுவும் வழங்கப்படவில்லை. திட்டப் பக்கம் என்ன சொன்னாலும், இது நிறுத்தப்பட்டிருக்கலாம்.",
      te: "ఈ పథకం కింద నమోదైన చివరి చెల్లింపు {date} న జరిగింది, ఆ తర్వాత ఏమీ చెల్లించలేదు. పథకం పేజీ ఏమి చెప్పినా, ఇది ఆగిపోయి ఉండవచ్చు.",
      kn: "ಈ ಯೋಜನೆಯಡಿ ದಾಖಲಾದ ಕೊನೆಯ ಪಾವತಿ {date} ರಂದು ಆಗಿತ್ತು, ಆ ನಂತರ ಏನೂ ಪಾವತಿಯಾಗಿಲ್ಲ. ಯೋಜನೆಯ ಪುಟ ಏನೇ ಹೇಳಿದರೂ, ಇದು ನಿಂತಿರಬಹುದು.",
      ml: "ഈ പദ്ധതി പ്രകാരം രേഖപ്പെടുത്തിയ അവസാന പേയ്‌മെന്റ് {date}-നാണ്, അതിനുശേഷം ഒന്നും നൽകിയിട്ടില്ല. പദ്ധതിയുടെ പേജ് എന്ത് പറഞ്ഞാലും, ഇത് നിലച്ചിരിക്കാം.",
    },
    spoken: {
      en: "Important. The last payment recorded under this scheme was on {date} and nothing has been paid since, so it may have stopped. Do not pay anyone to apply for it. Ask your PACS secretary first.",
      hi: "महत्वपूर्ण सूचना। इस योजना के तहत दर्ज अंतिम भुगतान {date} को हुआ था और उसके बाद कुछ नहीं दिया गया, इसलिए यह बंद हो चुकी हो सकती है। इसके लिए आवेदन करने के नाम पर किसी को पैसे न दें। पहले अपने पीएसीएस सचिव से पूछें।",
      ta: "முக்கியம். இந்தத் திட்டத்தின் கீழ் பதிவான கடைசி பணப்பட்டுவாடா {date} அன்று, அதன் பிறகு எதுவும் வழங்கப்படவில்லை, எனவே இது நிறுத்தப்பட்டிருக்கலாம். இதற்கு விண்ணப்பிக்க யாருக்கும் பணம் கொடுக்க வேண்டாம். முதலில் உங்கள் பாக்ஸ் செயலாளரிடம் கேளுங்கள்.",
      te: "ముఖ్యమైన సూచన. ఈ పథకం కింద నమోదైన చివరి చెల్లింపు {date} న జరిగింది, ఆ తర్వాత ఏమీ చెల్లించలేదు, కాబట్టి ఇది ఆగిపోయి ఉండవచ్చు. దీనికి దరఖాస్తు చేయడానికి ఎవరికీ డబ్బు ఇవ్వవద్దు. ముందుగా మీ PACS కార్యదర్శిని అడగండి.",
      kn: "ಮುಖ್ಯ ಸೂಚನೆ. ಈ ಯೋಜನೆಯಡಿ ದಾಖಲಾದ ಕೊನೆಯ ಪಾವತಿ {date} ರಂದು ಆಗಿತ್ತು ಮತ್ತು ಆ ನಂತರ ಏನೂ ಪಾವತಿಯಾಗಿಲ್ಲ, ಆದ್ದರಿಂದ ಇದು ನಿಂತಿರಬಹುದು. ಇದಕ್ಕೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಲು ಯಾರಿಗೂ ಹಣ ಕೊಡಬೇಡಿ. ಮೊದಲು ನಿಮ್ಮ PACS ಕಾರ್ಯದರ್ಶಿಯನ್ನು ಕೇಳಿ.",
      ml: "പ്രധാനം. ഈ പദ്ധതി പ്രകാരം രേഖപ്പെടുത്തിയ അവസാന പേയ്‌മെന്റ് {date}-നാണ്, അതിനുശേഷം ഒന്നും നൽകിയിട്ടില്ല, അതിനാൽ ഇത് നിലച്ചിരിക്കാം. ഇതിന് അപേക്ഷിക്കാൻ ആർക്കും പണം നൽകരുത്. ആദ്യം നിങ്ങളുടെ PACS സെക്രട്ടറിയോട് ചോദിക്കുക.",
    },
  },
};

/** Every member-facing string table here, for the translation overlay and its generator. */
export const FRESHNESS_TEXT = applyOverlay("fresh", { TIER_LABEL, FREE_SERVICE, NOTICE });

const TIER_FOR_REASON: Record<TrustReason, TrustTier> = {
  fresh: "verified",
  undated: "unconfirmed",
  "review-overdue": "unconfirmed",
  "source-changed": "unconfirmed",
  "source-unreachable": "unconfirmed",
  "human-check-overdue": "unconfirmed",
  "past-validity": "expired",
  offline: "unconfirmed",
  "no-answer": "unconfirmed",
  "field-rejected": "unconfirmed",
  "scheme-dormant": "unconfirmed",
};

/* ---------------------------------------------------------------- assessment */

export interface PassageProvenanceInput {
  passageId: string;
  source?: string;
  url?: string;
  verifiedOn?: string;
  validTill?: string;
  /** Set when the answer came from a kiosk that could not reach the server. */
  offline?: boolean;
  /**
   * How many members have reported being refused this at the counter.
   *
   * The counter is the only place the rule is actually tested. A document says
   * what was written; a refusal says what is being done, and when the two
   * disagree the member is living in the second one.
   */
  fieldRejections?: number;
  now?: Date;
  alerts?: SourceAlert[];
}

/** Review cadence for a passage: the strictest of the sources backing it. */
export function reviewDaysFor(passageId: string): number {
  const ids = sourceIdsForPassage(passageId);
  const cadences = WATCHED_SOURCES.filter((s) => ids.includes(s.id)).map(
    (s) => s.reviewDays ?? DEFAULT_REVIEW_DAYS
  );
  return cadences.length ? Math.min(...cadences) : DEFAULT_REVIEW_DAYS;
}

/**
 * The verdict on one passage, in one language.
 *
 * Reasons are evaluated worst-first and the first hit wins, so an answer that
 * is both past its validity date and backed by a changed document is reported
 * as expired rather than merely unconfirmed. Understating is the only error
 * that costs a member money.
 */
export function assessPassage(input: PassageProvenanceInput, lang: LangCode): Provenance {
  const now = input.now ?? new Date();
  const alerts = input.alerts ?? alertsForPassage(input.passageId);

  const reviewDays = reviewDaysFor(input.passageId);
  const daysSinceVerified = input.verifiedOn
    ? daysBetween(new Date(input.verifiedOn), now)
    : null;
  const reviewDueOn = input.verifiedOn ? addDays(input.verifiedOn, reviewDays) : undefined;

  // Worst-first. `dateFor` is the date the chosen notice interpolates.
  let reason: TrustReason;
  let dateFor: string | undefined;

  const changed = alerts.find((a) => a.kind === "source-changed");
  const unreachable = alerts.find(
    (a) => a.kind === "source-unreachable" || a.kind === "portal-dead"
  );
  const dormant = alerts.find((a) => a.kind === "scheme-dormant");
  const humanOverdue = overdueHumanChecks(input.passageId, now)[0];

  if (input.validTill && new Date(input.validTill).getTime() < now.getTime()) {
    reason = "past-validity";
    dateFor = input.validTill;
  } else if (input.offline) {
    reason = "offline";
  } else if ((input.fieldRejections ?? 0) >= FIELD_REJECTION_THRESHOLD) {
    // Ranked above every document signal deliberately. A refusal at the window
    // is newer evidence than any PDF, and it is the only signal that catches a
    // rule that was quietly stopped without a single byte of the page changing
    // — which is exactly the case this system is accused of missing.
    reason = "field-rejected";
  } else if (dormant) {
    reason = "scheme-dormant";
    dateFor = dormant.detectedOn;
  } else if (changed) {
    reason = "source-changed";
    dateFor = changed.detectedOn;
  } else if (unreachable) {
    reason = "source-unreachable";
    dateFor = unreachable.detectedOn;
  } else if (!input.verifiedOn) {
    reason = "undated";
  } else if (daysSinceVerified !== null && daysSinceVerified > reviewDays) {
    reason = "review-overdue";
    dateFor = input.verifiedOn;
  } else if (humanOverdue) {
    reason = "human-check-overdue";
    dateFor = humanOverdue.lastHumanCheck;
  } else {
    reason = "fresh";
    dateFor = input.verifiedOn;
  }

  const readable = formatDate(dateFor, lang);
  const copy = NOTICE[reason];

  return {
    tier: TIER_FOR_REASON[reason],
    reason,
    source: input.source ?? null,
    url: input.url,
    verifiedOn: input.verifiedOn,
    validTill: input.validTill,
    daysSinceVerified,
    reviewDueOn,
    label: pick(TIER_LABEL[TIER_FOR_REASON[reason]], lang),
    notice: fill(pick(copy.screen, lang), readable),
    spokenNotice: copy.spoken ? fill(pick(copy.spoken, lang), readable) : null,
    freeService: pick(FREE_SERVICE.screen, lang),
    spokenFreeService: pick(FREE_SERVICE.spoken, lang),
  };
}

/**
 * The verdict when there is no answer at all.
 *
 * Every answer this service gives carries the free-service line, and until now
 * the one reply that did not was "I could not answer that" — which is the
 * single sentence an intermediary is waiting for. The machine has just
 * admitted it does not know; he is about to say that he does, for a fee. The
 * warning has to be loudest exactly where the system is weakest.
 */
export function escalationProvenance(lang: LangCode): Provenance {
  const copy = NOTICE["no-answer"];
  return {
    tier: "unconfirmed",
    reason: "no-answer",
    source: null,
    daysSinceVerified: null,
    label: pick(TIER_LABEL.unconfirmed, lang),
    notice: pick(copy.screen, lang),
    spokenNotice: copy.spoken ? pick(copy.spoken, lang) : null,
    freeService: pick(FREE_SERVICE.screen, lang),
    spokenFreeService: pick(FREE_SERVICE.spoken, lang),
  };
}

/**
 * Sources backing this passage that refuse automated checks and are overdue
 * for their manual one.
 *
 * PIB is the live example: it returns 401 to anything that looks like a bot,
 * and it is where the KCC loan-limit revision is announced. A source nobody
 * can poll is not a source that can be assumed unchanged — after its interval
 * elapses, every figure resting on it is reported as possibly revised.
 */
export function overdueHumanChecks(passageId: string, now = new Date()) {
  const ids = sourceIdsForPassage(passageId);
  return WATCHED_SOURCES.filter((s) => {
    if (!ids.includes(s.id) || s.strategy !== "blocked") return false;
    if (!s.lastHumanCheck) return true;
    const interval = s.humanCheckDays ?? DEFAULT_REVIEW_DAYS;
    return daysBetween(new Date(s.lastHumanCheck), now) > interval;
  });
}

/**
 * Fleet-wide freshness, for the officer who has to answer for it.
 *
 * The supervision this system needs is not an approval queue. An approval
 * queue makes every answer wait on someone opening a portal, and the first
 * week nobody does, the service stops. This is the inverse: a standing list of
 * what is due and what is doubted, which is already correct when nobody looks
 * at it. A nodal officer opening it sees in one screen which documents are in
 * date and which are not, and the members' answers have already been
 * downgraded either way.
 *
 * Two clocks, kept apart because they mean different things. The machine
 * clock says when the document was last fetched and compared; the human clock
 * says when a person last read it and re-checked the passages drawn from it.
 * Only the second one can find a paragraph that was rewritten to mean
 * something new, and only the second one falls due.
 */
export interface LedgerRow {
  id: string;
  title: string;
  url: string;
  strategy: WatchedSource["strategy"];
  affects: string[];
  intervalDays: number;
  lastAutomatedCheck?: string;
  lastHumanCheck?: string;
  dueOn?: string;
  daysUntilDue: number | null;
  alert: SourceAlert | null;
  state: "flagged" | "overdue" | "current" | "never-verified";
}

export function sourceLedger(now = new Date()): LedgerRow[] {
  const alerts = activeAlerts();
  const seen = fingerprints as Record<string, { checkedAt?: string }>;

  return WATCHED_SOURCES.map((source): LedgerRow => {
    const alert = alerts.find((a) => a.sourceId === source.id) ?? null;
    const intervalDays =
      source.strategy === "blocked"
        ? (source.humanCheckDays ?? DEFAULT_REVIEW_DAYS)
        : (source.reviewDays ?? DEFAULT_REVIEW_DAYS);

    const lastHumanCheck = source.lastHumanCheck;
    const dueOn = lastHumanCheck ? addDays(lastHumanCheck, intervalDays) : undefined;
    const daysUntilDue = dueOn ? daysBetween(now, new Date(dueOn)) : null;

    const state: LedgerRow["state"] = alert
      ? "flagged"
      : !lastHumanCheck
        ? "never-verified"
        : daysUntilDue !== null && daysUntilDue < 0
          ? "overdue"
          : "current";

    return {
      id: source.id,
      title: source.title,
      url: source.url,
      strategy: source.strategy,
      affects: source.affects,
      intervalDays,
      // Blocked sources are never fetched, so they have no machine clock at
      // all — which is exactly why their human clock is the short one.
      lastAutomatedCheck: seen[source.id]?.checkedAt,
      lastHumanCheck,
      dueOn,
      daysUntilDue,
      alert,
      state,
    };
  });
}
