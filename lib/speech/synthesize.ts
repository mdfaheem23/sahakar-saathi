import { TTLCache, speechKey } from "@/lib/cache";
import { fromSpeechTag } from "@/lib/detectLang";
import { bhashiniSpeak, hasBhashini } from "./bhashini";

/**
 * Text-to-speech, shared by the browser and hardware endpoints so both hit the
 * same cache and the same voice. Bhashini speaks first; Sarvam is the backup.
 */

// Billed per character, and the same answer is read aloud over and over at a
// counter, so identical text is never re-synthesized. Capped because a clip is
// ~100-250KB.
const audioCache = new TTLCache<string[]>(60, 6 * 60 * 60 * 1000);

/** What Sarvam bulbul:v3 returns when no rate is asked for. Browsers take this. */
export const AUDIO_FORMAT = {
  sampleRate: 22050,
  channels: 1,
  bitsPerSample: 16,
  /** Standard WAV header length before PCM samples begin. */
  headerBytes: 44,
} as const;

/**
 * The rate the ESP32 plays at.
 *
 * Not the same as the browser's, and the difference is not cosmetic: the
 * firmware configures its I2S clock once, from a constant, and pumps whatever
 * bytes arrive into the DMA at that rate. Hand it 22050Hz samples and they are
 * played as though they were 16000Hz - 37% too slow, which comes out of the
 * speaker as a deep drawl and reads to everyone in the room as a broken
 * kiosk rather than a wrong number.
 *
 * So the device says what it can play and Sarvam is asked for exactly that,
 * rather than the device being expected to match a default it cannot change.
 */
export const DEVICE_SAMPLE_RATE = 16000;

export interface SynthesisResult {
  /** Base64 WAV clips, in playback order. */
  audios: string[];
  cached: boolean;
}

export async function synthesize(
  text: string,
  languageCode: string,
  sampleRate: number = AUDIO_FORMAT.sampleRate
): Promise<SynthesisResult> {
  // The rate is part of the key. Without it the first caller decides the
  // format for everyone: a browser asking first would leave 22050Hz clips
  // under a key the kiosk then reads and plays at 16000Hz.
  const key = `${speechKey(text, languageCode)}@${sampleRate}`;
  const hit = audioCache.get(key);
  if (hit) return { audios: hit, cached: true };

  let audios: string[] | null = null;

  if (hasBhashini()) {
    const clips = await bhashiniSpeak(text.slice(0, 2500), fromSpeechTag(languageCode, "en"));
    // Bhashini picks its own output rate. The device cannot change its I2S
    // clock, so every clip is brought to the rate the caller asked for.
    if (clips) audios = clips.map((c) => resampleWav(c, sampleRate));
  }

  if (!audios) audios = await sarvamSpeak(text, languageCode, sampleRate);

  audioCache.set(key, audios);
  return { audios, cached: false };
}

async function sarvamSpeak(text: string, languageCode: string, sampleRate: number): Promise<string[]> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("No speech provider configured: set BHASHINI_* or SARVAM_API_KEY");

  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Pinned rather than left to the account default: the default model
      // splits long input into several chunks, and bulbul:v3 also accepts
      // 2500 characters against the older model's 1500.
      model: "bulbul:v3",
      text: text.slice(0, 2500),
      language_code: languageCode,
      speech_sample_rate: sampleRate,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sarvam TTS failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { audios?: string[] };
  const audios = data.audios ?? [];
  if (audios.length === 0) throw new Error("Sarvam returned no audio");
  return audios;
}

/**
 * Re-samples a 16-bit mono WAV clip to `rate`, linearly.
 *
 * Speech is band-limited well below either rate, so linear interpolation is
 * inaudible here; what matters is that the header and the samples agree with
 * what the speaker will be clocked at.
 */
function resampleWav(b64: string, rate: number): string {
  const buf = Buffer.from(b64, "base64");
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") return b64;
  const srcRate = buf.readUInt32LE(24);
  const channels = buf.readUInt16LE(22);
  const bits = buf.readUInt16LE(34);
  if (srcRate === rate || channels !== 1 || bits !== 16) return b64;

  const dataIdx = buf.indexOf("data", 12, "ascii");
  const start = dataIdx >= 0 ? dataIdx + 8 : AUDIO_FORMAT.headerBytes;
  const src = buf.subarray(start);
  const inSamples = Math.floor(src.length / 2);
  const outSamples = Math.floor((inSamples * rate) / srcRate);
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i++) {
    const pos = (i * srcRate) / rate;
    const j = Math.floor(pos);
    const frac = pos - j;
    const a = src.readInt16LE(Math.min(j, inSamples - 1) * 2);
    const b = src.readInt16LE(Math.min(j + 1, inSamples - 1) * 2);
    out.writeInt16LE(Math.round(a + (b - a) * frac), i * 2);
  }
  return Buffer.concat([wavHeader(out.length, rate), out]).toString("base64");
}

/**
 * Concatenates Sarvam's clips into one PCM buffer.
 *
 * A long answer comes back split across clips, each with its own 44-byte
 * header. Playing them back to back on the client is fine; streaming them to a
 * microcontroller is not — the firmware would have to detect and skip a header
 * mid-stream. Stripping them here keeps the device side a plain byte pump.
 */
export function concatPcm(audios: string[]): Buffer {
  const parts = audios.map((b64) => {
    const buf = Buffer.from(b64, "base64");
    const dataIdx = buf.indexOf("data", 0, "ascii");
    // Fall back to the standard offset if the chunk layout is unexpected.
    const start = dataIdx >= 0 ? dataIdx + 8 : AUDIO_FORMAT.headerBytes;
    return buf.subarray(start);
  });
  return Buffer.concat(parts);
}

/** Builds a 44-byte canonical WAV header for a PCM payload of `dataLength`. */
export function wavHeader(
  dataLength: number,
  sampleRate: number = AUDIO_FORMAT.sampleRate
): Buffer {
  const { channels, bitsPerSample } = AUDIO_FORMAT;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + dataLength, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE(blockAlign, 32);
  h.writeUInt16LE(bitsPerSample, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(dataLength, 40);
  return h;
}
