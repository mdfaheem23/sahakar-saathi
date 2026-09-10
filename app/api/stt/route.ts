import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies audio to Sarvam's Speech-to-Text API. The API key stays server-side
 * — the browser never sees it, it only ever talks to this route.
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SARVAM_API_KEY is not configured" }, { status: 500 });
  }

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
  });
}
