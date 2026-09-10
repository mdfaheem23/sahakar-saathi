"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fromSpeechTag } from "./detectLang";
import { LangCode } from "./types";

// Real Sarvam-backed speech layer: records mic audio with MediaRecorder and
// sends it to our /api/stt route (Sarvam STT), and sends text to /api/tts
// (Sarvam TTS) for spoken replies. The Sarvam API key never reaches the
// browser — both routes proxy server-side.

export type SpeechError = "denied" | "too_short" | "failed" | null;

/**
 * Playback is exclusive app-wide, not per-hook.
 *
 * Each speak() used to construct its own Audio element, so two taps produced
 * two voices talking over each other. A module-level handle means a new
 * utterance always replaces the current one, whichever component asked for it.
 */
let currentAudio: HTMLAudioElement | null = null;
/** Guards against a slow TTS response starting playback after a newer one. */
let playbackToken = 0;
/** Settles the in-flight clip promise when playback is cancelled. */
let cancelCurrentClip: (() => void) | null = null;

/**
 * How long to wait for a clip to actually start sounding before giving up.
 *
 * Generous, because the first clip has to decode: this is a safety net for
 * "never starts", not a latency budget.
 */
const PLAYBACK_START_TIMEOUT_MS = 8000;

function stopCurrentAudio() {
  cancelCurrentClip?.();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

type ClipResult = "ended" | "failed" | "cancelled";

/**
 * Plays one clip and resolves when it is genuinely finished, failed, or
 * cancelled.
 *
 * A media element that never gets to decode fires neither `ended` nor
 * `error` — a backgrounded tab defers loading, an autoplay hold can resolve
 * play() without producing sound, and a stalled decode just sits at
 * readyState 0. Awaiting only those two events therefore hangs forever, and
 * that hang is what left `speaking` stuck true: the button froze on "Stop",
 * so every later tap was read as a stop request and nothing ever played
 * again. The watchdog below is what guarantees this promise always settles.
 */
function playClip(clip: string): Promise<ClipResult> {
  return new Promise<ClipResult>((resolve) => {
    // A blob URL rather than a ~300KB base64 data: URI — the browser keeps one
    // copy of the bytes instead of parsing a giant string per utterance, and
    // it can be revoked as soon as the clip is done.
    const bytes = Uint8Array.from(atob(clip), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));

    const audio = new Audio();
    currentAudio = audio;

    let settled = false;
    // Nullable and assigned after the element is wired up, so a synchronous
    // error during load() cannot reach clearTimeout before it exists.
    let startWatchdog: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: ClipResult) => {
      if (settled) return;
      settled = true;
      if (startWatchdog) clearTimeout(startWatchdog);
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      cancelCurrentClip = null;
      URL.revokeObjectURL(url);
      resolve(result);
    };

    cancelCurrentClip = () => finish("cancelled");

    audio.onended = () => finish("ended");
    audio.onerror = () => finish("failed");
    // Sound is actually coming out, so `ended` is now guaranteed to arrive and
    // the "never started" watchdog is no longer needed.
    audio.onplaying = () => {
      if (startWatchdog) clearTimeout(startWatchdog);
    };

    audio.preload = "auto";
    audio.src = url;
    audio.load();

    startWatchdog = setTimeout(() => finish("failed"), PLAYBACK_START_TIMEOUT_MS);

    // Rejects when autoplay policy blocks playback without a user gesture.
    audio.play().catch(() => finish("failed"));
  });
}

export function useSpeech(speechTag: string) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<SpeechError>(null);
  const [speaking, setSpeaking] = useState(false);

  // Resolved after mount rather than during initial state: the server renders
  // with no `navigator`, so deriving this inline makes the first client render
  // disagree with the server HTML and trips a hydration mismatch.
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok =
      !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
    if (ok) queueMicrotask(() => setSupported(true));
  }, []);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);

  const startListening = useCallback(
    async (onResult: (text: string, detected: LangCode) => void) => {
      if (!supported) return;
      setError(null);

      // Never record while the speaker is still talking.
      playbackToken += 1;
      stopCurrentAudio();
      setSpeaking(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];
        startedAtRef.current = Date.now();

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          setListening(false);
          streamRef.current?.getTracks().forEach((track) => track.stop());

          // MediaRecorder reports a parameterised type ("audio/webm;codecs=opus").
          // Sarvam matches Content-Type exactly and rejects the parameterised
          // form, so the blob is rebuilt with the bare base type.
          const rawType = recorder.mimeType || "audio/webm";
          const baseType = rawType.split(";")[0].trim();
          const blob = new Blob(chunksRef.current, { type: baseType });

          const heldMs = Date.now() - startedAtRef.current;
          if (blob.size === 0 || heldMs < 700) {
            setError("too_short");
            return;
          }

          setProcessing(true);
          try {
            const extension = baseType.includes("mp4") ? "mp4" : "webm";
            const form = new FormData();
            form.append("file", blob, `audio.${extension}`);
            // Left unset so Sarvam auto-detects; the UI language is only a
            // fallback for when detection returns something we don't serve.
            form.append("language_code", "unknown");

            const res = await fetch("/api/stt", { method: "POST", body: form });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
              // Surfaced rather than swallowed: a silent failure here looks
              // identical to the app simply not responding.
              console.error("[speech] STT failed", res.status, data);
              setError(data?.code === "too_short" ? "too_short" : "failed");
              return;
            }

            const transcript = (data.transcript ?? "").trim();
            if (!transcript) {
              setError("too_short");
              return;
            }
            const uiLang = fromSpeechTag(speechTag, "en");
            onResult(transcript, fromSpeechTag(data.languageCode, uiLang));
          } catch (err) {
            console.error("[speech] STT request error", err);
            setError("failed");
          } finally {
            setProcessing(false);
          }
        };

        recorderRef.current = recorder;
        recorder.start();
        setListening(true);
      } catch (err) {
        console.error("[speech] microphone unavailable", err);
        setListening(false);
        setError("denied");
      }
    },
    [supported, speechTag]
  );

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else setListening(false);
  }, []);

  const speak = useCallback(
    async (text: string, langOverride?: LangCode) => {
      // Claim this playback slot; anything already sounding is cancelled and
      // any in-flight request older than this one is ignored on arrival.
      const token = ++playbackToken;
      stopCurrentAudio();
      setError(null);
      setSpeaking(true);

      /**
       * Every exit path settles the speaking state. Missing one is not a
       * cosmetic bug: the button label flips to "Stop", so the next tap is
       * read as a stop request and the member can never start playback again.
       * A newer utterance owns the state, so an superseded call leaves it be.
       */
      const settle = (failure?: boolean) => {
        if (token !== playbackToken) return;
        if (failure) setError("failed");
        setSpeaking(false);
      };

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            languageCode: langOverride ? `${langOverride}-IN` : speechTag,
          }),
        });
        const data = await res.json();

        if (token !== playbackToken) return; // superseded while fetching

        const clips: string[] = data.audios ?? [];
        if (!res.ok || clips.length === 0) {
          console.error("[speech] TTS failed", res.status, data);
          settle(true);
          return;
        }

        // A long answer comes back as several clips. Play them strictly in
        // order, waiting for each to finish — anything else overlaps the
        // speaker with itself.
        for (const clip of clips) {
          if (token !== playbackToken) return; // cancelled mid-sequence

          const result = await playClip(clip);

          // Cancelled means someone deliberately stopped playback or started a
          // newer utterance; that is not a failure to report.
          if (result === "cancelled" || token !== playbackToken) return;
          if (result === "failed") {
            console.error("[speech] clip did not play");
            settle(true);
            return;
          }
        }

        currentAudio = null;
        settle();
      } catch (err) {
        console.error("[speech] TTS request error", err);
        settle(true);
      }
    },
    [speechTag]
  );

  const stopSpeaking = useCallback(() => {
    playbackToken += 1;
    stopCurrentAudio();
    setSpeaking(false);
  }, []);

  // Leaving the page should not leave a voice playing.
  useEffect(() => stopSpeaking, [stopSpeaking]);

  const clearError = useCallback(() => setError(null), []);

  return {
    listening,
    processing,
    supported,
    error,
    speaking,
    clearError,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
