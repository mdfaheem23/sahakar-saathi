import { NextRequest } from "next/server";
import {
  AUDIO_FORMAT,
  DEVICE_SAMPLE_RATE,
  concatPcm,
  synthesize,
  wavHeader,
} from "@/lib/speech/synthesize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Binary audio for microcontrollers — the ESP32 kiosk speaker.
 *
 * /api/tts returns base64 WAV inside JSON, which is right for a browser and
 * unusable on a device: a 3-second Telugu reply is 176KB of base64, and an
 * ESP32 without PSRAM has about 320KB of DRAM in total, shared with the WiFi
 * and TLS stacks. It cannot hold the response, let alone parse JSON around it.
 *
 * This route streams the bytes instead. Default is a playable WAV; `?pcm=1`
 * drops the 44-byte header so the firmware can pump the body straight into the
 * I2S DMA buffer with no parsing at all.
 *
 *   GET /api/tts/raw?text=...&lang=te-IN[&pcm=1]
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const text = params.get("text")?.trim();
  const lang = params.get("lang") ?? params.get("languageCode") ?? "en-IN";
  const pcmOnly = params.get("pcm") === "1";

  // The caller states the rate it can play, because it usually cannot change
  // it: the ESP32 sets its I2S clock from a compile-time constant. `?pcm=1`
  // means a microcontroller is asking, so it defaults to the device rate
  // rather than the browser's - getting this wrong is not a glitch, it is a
  // reply played 37% slow and a kiosk that sounds broken.
  const requested = Number(params.get("rate"));
  const sampleRate = Number.isFinite(requested) && requested > 0
    ? requested
    : pcmOnly
      ? DEVICE_SAMPLE_RATE
      : AUDIO_FORMAT.sampleRate;

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const { audios, cached } = await synthesize(text, lang, sampleRate);
    const pcm = concatPcm(audios);
    const body = pcmOnly ? pcm : Buffer.concat([wavHeader(pcm.length, sampleRate), pcm]);

    // Format announced in headers so firmware configures I2S from the response
    // rather than hardcoding constants that silently rot if the voice changes.
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": pcmOnly ? "application/octet-stream" : "audio/wav",
        "Content-Length": String(body.length),
        "X-Sample-Rate": String(sampleRate),
        "X-Channels": String(AUDIO_FORMAT.channels),
        "X-Bits-Per-Sample": String(AUDIO_FORMAT.bitsPerSample),
        "X-Duration-Ms": String(Math.round((pcm.length / (sampleRate * 2)) * 1000)),
        "X-Cached": cached ? "1" : "0",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("[tts/raw]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "synthesis failed" },
      { status: 502 }
    );
  }
}
