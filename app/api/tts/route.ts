import { NextRequest, NextResponse } from "next/server";
import { synthesize } from "@/lib/speech/synthesize";

export const runtime = "nodejs";

// Proxies text to speech synthesis (Bhashini, with Sarvam as the backup) and
// returns base64 WAV clips. Shares the cache and voice with the kiosk route.
// No provider key reaches the browser.
export async function POST(req: NextRequest) {
  const { text, languageCode } = (await req.json()) as { text?: string; languageCode?: string };
  if (!text || !languageCode) {
    return NextResponse.json({ error: "text and languageCode are required" }, { status: 400 });
  }

  try {
    const { audios, cached } = await synthesize(text, languageCode);
    return NextResponse.json({ audios, cached });
  } catch (err) {
    console.error("[tts] synthesis failed:", err);
    return NextResponse.json(
      { error: "Speech synthesis failed", detail: String(err) },
      { status: 502 }
    );
  }
}
