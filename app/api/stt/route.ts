import { NextRequest, NextResponse } from "next/server";
import { speechTagFor, SUPPORTED_LANGS } from "@/lib/i18n";
import { bhashiniTranscribe, hasBhashini } from "@/lib/speech/bhashini";
import { LangCode } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Speech-to-text. Bhashini first, Sarvam as the backup. Keys stay
 * server-side — the browser only ever talks to this route.
 *
 * Bhashini ASR transcribes in a stated language, so it runs when the caller
 * sends a language hint (the member's interface language) and 16 kHz WAV.
 * Sarvam can detect the language itself, so it serves the calls that arrive
 * with no hint — the walk-up kiosk — and every call Bhashini could not.
 */

// Sarvam validates the upload's Content-Type by exact string match, so a
// parameterised type is rejected outright: Chrome's MediaRecorder reports
// "audio/webm;codecs=opus", Safari reports "audio/mp4;codecs=mp4a.40.2".
// Both are normalised to their base type before forwarding.
const EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/aac": "aac",
};

/** Below this a recording is almost certainly container header only. */
const MIN_AUDIO_BYTES = 1200;

/** A language the caller named, or null for "unknown" or anything we do not serve. */
function hintLang(raw: string | null): LangCode | null {
  if (!raw || raw === "unknown") return null;
  const base = raw.toLowerCase().split("-")[0];
  const lang = (base === "od" ? "or" : base) as LangCode;
  return SUPPORTED_LANGS.includes(lang) ? lang : null;
}

export async function POST(req: NextRequest) {
  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an audio file" },
      { status: 400 }
    );
  }

  const file = incoming.get("file");
  const languageCode = (incoming.get("language_code") as string) || "unknown";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const baseType = (file.type || "audio/webm").split(";")[0].trim().toLowerCase();
  const extension = EXTENSION_BY_TYPE[baseType] ?? "webm";
  const bytes = await file.arrayBuffer();

  if (bytes.byteLength < MIN_AUDIO_BYTES) {
    // Distinct code so the UI can say "hold the button longer" rather than
    // showing a generic failure for what is really a too-short recording.
    return NextResponse.json(
      { error: "Recording too short", code: "too_short" },
      { status: 422 }
    );
  }

  const hint = hintLang(incoming.get("hint") as string | null) ?? hintLang(languageCode);

  if (hasBhashini() && hint && (baseType === "audio/wav" || baseType === "audio/x-wav")) {
    const transcript = await bhashiniTranscribe(Buffer.from(bytes).toString("base64"), hint);
    if (transcript) {
      console.log(`[stt] bhashini heard=${JSON.stringify(transcript)} lang=${hint} bytes=${bytes.byteLength}`);
      return NextResponse.json({
        transcript,
        languageCode: speechTagFor(hint),
        languageProbability: null,
        provider: "bhashini",
      });
    }
    console.warn("[stt] Bhashini could not transcribe; falling back to Sarvam");
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No speech-to-text provider is available" }, { status: 503 });
  }

  const normalized = new Blob([bytes], { type: baseType });

  const forward = new FormData();
  forward.append("file", normalized, `audio.${extension}`);
  // "unknown" asks Sarvam to detect the language rather than trusting a UI
  // toggle. A member should be able to walk up and speak; picking their own
  // language from a menu is a literacy barrier in itself.
  forward.append("language_code", languageCode || "unknown");
  forward.append("mode", "transcribe");

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: forward,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`[stt] Sarvam ${res.status} for ${baseType}:`, detail);
    return NextResponse.json(
      { error: "Sarvam STT request failed", detail },
      { status: res.status }
    );
  }

  const data = await res.json();
  const transcript = (data.transcript ?? "") as string;
  // `languageCode` above is what we asked for; this is what Sarvam decided.
  const detectedLanguage = (data.language_code ?? null) as string | null;
  const languageProbability = (data.language_probability ?? null) as number | null;

  // What the member actually said, as heard. Without this a wrong answer is
  // indistinguishable from a wrong transcription, and the two have completely
  // different fixes — the assistant looks broken when the microphone is.
  console.log(
    `[stt] heard=${JSON.stringify(transcript)} detected=${detectedLanguage} ` +
      `confidence=${languageProbability ?? "n/a"} bytes=${bytes.byteLength}`
  );

  return NextResponse.json({
    transcript,
    languageCode: detectedLanguage,
    languageProbability,
    provider: "sarvam",
  });
}
