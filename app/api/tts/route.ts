import { NextRequest, NextResponse } from "next/server";
import { TTLCache, speechKey } from "@/lib/cache";

// Speech synthesis is billed per character and the same answer is read aloud
// over and over, so identical text never gets re-synthesized. Entries are
// capped because base64 WAV is ~100KB each.
const audioCache = new TTLCache<string[]>(60, 6 * 60 * 60 * 1000);

// Proxies text to Sarvam's Text-to-Speech API and returns base64 WAV audio.
// The API key stays server-side.
export async function POST(req: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SARVAM_API_KEY is not configured" }, { status: 500 });
  }

  const { text, languageCode } = (await req.json()) as { text?: string; languageCode?: string };
  if (!text || !languageCode) {
    return NextResponse.json({ error: "text and languageCode are required" }, { status: 400 });
  }

  const cacheKey = speechKey(text, languageCode);
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return NextResponse.json({ audios: cached, cached: true });
  }

  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Pinned rather than left to the account default: the default model
      // splits long input into several chunks, and bulbul:v3 also accepts
      // 2500 characters against the older model's 1500.
      model: "bulbul:v3",
      text: text.slice(0, 2500),
      language_code: languageCode,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ error: "Sarvam TTS request failed", detail }, { status: res.status });
  }

  const data = await res.json();
  // Sarvam may return the utterance split across several clips. Taking only
  // the first truncates the answer mid-sentence, so every clip is returned
  // and the client plays them back to back.
  const audios = (data.audios ?? []) as string[];
  if (audios.length === 0) {
    return NextResponse.json({ error: "No audio returned" }, { status: 502 });
  }

  audioCache.set(cacheKey, audios);
  return NextResponse.json({ audios, cached: false });
}
