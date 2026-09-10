import base64
import io
import json
import os
import queue
import socket
import struct
import sys
import threading
import time
import wave

import numpy as np
import requests

SAMPLE_RATE = 16000        # playback + what the STT API wants
MIC_RATE = 16000           # must match MIC_RATE in esp32-kiosk.ino
TCP_PORT = 8080
CHANNELS = 1

def _load_key() -> str:
    if key := os.environ.get("SARVAM_API_KEY"):
        return key
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                if line.startswith("SARVAM_API_KEY="):
                    return line.split("=", 1)[1].strip().strip("\"'")
    return ""


SARVAM_KEY = _load_key()

# ---------------------------------------------------------------------------
# Where the thinking happens
# ---------------------------------------------------------------------------
#
# The kiosk used to call Sarvam directly from here, which worked and skipped
# the entire service. Retrieval, the grounding contract, the trust verdict on
# the passage an answer rests on, the free-service line that closes every
# spoken reply - all of that lives in the Next.js app, and none of it reached
# the one channel standing in an actual PACS lobby. A farmer at the machine got
# a raw model answer with no citation behind it.
#
# So the three calls now go to the service. This host keeps only the two jobs
# that genuinely need to be near the hardware: holding the socket, and pacing
# audio into the speaker.
#
# Set KIOSK_BACKEND to the machine running `npm run dev` - the LAN address, not
# localhost, if this script and the server are on different machines. Once the
# board speaks to the service itself, this file goes away.
BACKEND = os.environ.get("KIOSK_BACKEND", "http://localhost:3000").rstrip("/")

# The member's state, so state schemes from elsewhere are not offered. A real
# fleet has this set per kiosk at install; here it is one variable.
KIOSK_STATE = os.environ.get("KIOSK_STATE") or None
KIOSK_ID = os.environ.get("KIOSK_ID", "esp32-kiosk")

# Play the recording back instead of answering. The fastest way to tell a
# microphone fault from a service fault without spending an API call.
ECHO_ONLY = os.environ.get("KIOSK_ECHO") == "1"

# Answer straight from Sarvam when the service cannot be reached. Off by
# default and deliberately awkward to turn on: that path has no retrieval
# behind it, so nothing it says carries a citation, a freshness verdict, or
# the free-service line - and a kiosk that quietly degrades to it looks
# exactly like one that is working.
DIRECT_FALLBACK = os.environ.get("KIOSK_DIRECT_FALLBACK") == "1"

# Sarvam names languages "hi-IN"; the service's own LangCode is "hi". Both are
# needed in one turn - the first for speech, the second for retrieval.
SPEECH_TAGS = {
    "en": "en-IN", "hi": "hi-IN", "ta": "ta-IN",
    "te": "te-IN", "kn": "kn-IN", "ml": "ml-IN",
}


def lang_code(speech_tag: str) -> str:
    """'hi-IN' -> 'hi', falling back to the one language always present."""
    short = (speech_tag or "").split("-")[0].lower()
    return short if short in SPEECH_TAGS else "en"


def speech_tag(code: str) -> str:
    return SPEECH_TAGS.get(code, "en-IN")


FALLBACK_LANGUAGE = "hi-IN"   # used only when STT cannot identify the language
SPEAKER = "priya"
CHAT_MODEL = "sarvam-105b-conversations"

SYSTEM_PROMPT = (
    "You are a helpful assistant in a rural cooperative kiosk in India. "
    "Keep replies under two short sentences, because they are read aloud "
    "through a small speaker. Be concrete and practical about schemes, "
    "banking, and farming questions."
)

LANGUAGE_NAMES = {
    "en-IN": "English", "hi-IN": "Hindi", "ta-IN": "Tamil", "te-IN": "Telugu",
    "kn-IN": "Kannada", "ml-IN": "Malayalam", "mr-IN": "Marathi",
    "bn-IN": "Bengali", "gu-IN": "Gujarati", "pa-IN": "Punjabi", "od-IN": "Odia",
}

# The assistant is more useful across a short exchange than one question at a
# time, but an unbounded history would eventually blow the context window, so
# only the last few turns are kept.
history: list[dict] = []
MAX_TURNS = 6

# --- how the reply is cut up for speaking ---------------------------------
#
# The kiosk used to wait for the whole answer to be written and then the whole
# thing to be synthesized before a single sound came out - measured at 8.15s of
# silence, of which 4.20s was TTS alone, because TTS latency scales with the
# length of what it is asked to say.
#
# So the answer is spoken in pieces. The model is streamed, and each finished
# sentence is synthesized and sent while the next one is still being written.
# The board plays them back to back: the wire protocol already allows several
# 'A' frames in a row, and its output DMA holds ~128ms, which covers the seam.
#
# The sizes are a trade between the two ways this sounds wrong. Too small and
# the sentence is out of the speaker before the next one is synthesized, so the
# reply gets a hole in it; too large and the first sound is late again, which is
# the whole thing being fixed. TTS runs about 2.7x faster than real time
# (1.84s of work for 4.9s of speech), so once the first piece is playing there
# is ample headroom - only the opening needs to be short.
MIN_FIRST_CHARS = 30    # flush the opening as soon as it is this long
MIN_NEXT_CHARS = 100    # later pieces can be bigger; they are made during playback

# Devanagari and most Indic scripts close a sentence with U+0964, Latin with
# .!? - the kiosk answers in both, sometimes in one sentence.
SENTENCE_ENDS = "।॥.!?"

# Clause breaks, used only to get the FIRST piece out.
#
# Waiting for a sentence end sounds right and measured wrong: this model
# answers in Hindi sentences of 150 characters with no terminator until the
# very end, so "split on sentence ends" put 12.6s of audio in the first piece
# and saved under a second. A comma is already a pause in the spoken line, so
# breaking there costs almost nothing prosodically and starts the speaker
# several seconds sooner. Only the opening is cut this way - once sound is
# coming out there is time to wait for a proper sentence.
CLAUSE_BREAKS = ",;:،॰"

# Most audio handed to the board in a single 'A' frame. Two seconds: long
# enough that the seams are inaudible against a ~128ms DMA buffer, short
# enough that a dropped link costs the current breath rather than the rest of
# the answer.
MAX_FRAME_BYTES = 2 * SAMPLE_RATE * 2      # 2s of 16-bit mono


class LinkLost(Exception):
    """The board stopped answering - WiFi dropped, reset, or lost power.

    Its own class because it is the one failure that is not a bug and not
    worth a traceback: a kiosk on a village hotspot loses its link, and the
    right response is to say so and wait for it to come back, not to exit and
    leave the machine dead until somebody notices.
    """

class Kiosk:
    def __init__(self, host):
        self.sock = socket.create_connection((host, TCP_PORT), timeout=10)
        self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        self.sock.settimeout(None)
        self.stream = self.sock.makefile("rb")
        print(f"[net] connected to {host}:{TCP_PORT}")
        self.alive = True
        self.events = queue.Queue()   # 'D' / 'U' turn boundaries from the VAD
        self.audio = queue.Queue()    # microphone payloads, MIC_RATE int16 LE
        threading.Thread(target=self._read_stream, daemon=True).start()

    def _read(self, n: int):
        try:
            buf = self.stream.read(n)
        except OSError:
            return None
        return buf if buf and len(buf) == n else None

    def _read_stream(self):
        while True:
            tag = self._read(1)
            if tag is None:
                break
            if tag in (b"D", b"U"):
                self.events.put(tag.decode())
            elif tag == b"M":
                header = self._read(4)
                if header is None:
                    break
                payload = self._read(struct.unpack("<I", header)[0])
                if payload is None:
                    break
                self.audio.put(payload)
            else:
                print(f"[net] unexpected byte {tag!r}, resynchronising")
        self.alive = False
        print("[net] link closed")

    def play(self, pcm: bytes):
        """Sends audio as one or more 'A' frames, matching the sketch.

        Split rather than sent whole because the board accepts bytes only as
        fast as the speaker plays them: a ten-second reply handed over in one
        frame leaves that audio in flight for ten seconds, and a WiFi drop
        anywhere in that window kills the whole reply mid-sentence. Frames of
        a couple of seconds bound the loss to the piece being spoken - and
        cost nothing, because the firmware already reads 'A' frames back to
        back and its output DMA holds ~128ms, which covers the seam.
        """
        total = len(pcm)
        print(f"[net] sending {total} bytes ({total / 2 / SAMPLE_RATE:.1f}s) - playing now")
        try:
            for start in range(0, total, MAX_FRAME_BYTES):
                frame = pcm[start : start + MAX_FRAME_BYTES]
                self.sock.sendall(b"A" + struct.pack("<I", len(frame)) + frame)
        except OSError as err:
            raise LinkLost(f"board went away mid-playback: {err}") from err
        print("[net] playback finished")

    def request_capture(self, on: bool):
        """Force a recording open or closed, overriding the board's VAD."""
        try:
            self.sock.sendall(b"R" if on else b"S")
        except OSError as err:
            raise LinkLost(f"board went away: {err}") from err

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass

    def drain(self):
        """Whatever arrived while the last turn was in the API calls belongs to
        no turn at all. Without this, speech picked up while the assistant was
        thinking fires a phantom recording the moment it finishes."""
        for q in (self.events, self.audio):
            while not q.empty():
                q.get_nowait()

    def released(self) -> bool:
        """True once the board has sent the 'U' that closes a VAD turn."""
        try:
            return self.events.get_nowait() == "U"
        except queue.Empty:
            return False

    def collect_until(self, stop) -> np.ndarray:
        """Accumulate microphone frames until stop() returns true."""
        chunks = []
        while not stop():
            if not self.alive:
                raise LinkLost("link dropped mid-recording")
            try:
                chunks.append(self.audio.get(timeout=0.05))
            except queue.Empty:
                pass
        # The stop edge overtakes the last frames it was sent with, so sweep up
        # whatever is still queued or the tail of every question gets clipped.
        while not self.audio.empty():
            chunks.append(self.audio.get_nowait())
        return np.frombuffer(b"".join(chunks), dtype=np.int16)


def resample(samples: np.ndarray, src_rate: int, dst_rate: int = SAMPLE_RATE) -> np.ndarray:
    """MIC_RATE down to what STT wants.

    A no-op now that the ADC captures at 16kHz directly — kept because it is
    the only thing standing between a changed MIC_RATE on the board and a
    transcript of chipmunks.
    """
    if src_rate == dst_rate or len(samples) == 0:
        return samples.astype(np.int16)

    x = samples.astype(np.float32)
    # Anti-aliasing, crudely: a box filter as wide as the decimation ratio.
    # A proper FIR would be sharper, but dropping samples with no filter at all
    # folds everything above 8kHz back down into the speech band as noise, and
    # STT hears that as words that were never said.
    width = max(1, int(src_rate // dst_rate))
    if width > 1:
        x = np.convolve(x, np.ones(width, dtype=np.float32) / width, mode="same")

    positions = np.linspace(0, len(x) - 1, int(round(len(x) * dst_rate / src_rate)))
    out = np.interp(positions, np.arange(len(x)), x)
    return np.clip(out, -32768, 32767).astype(np.int16)


def to_wav_bytes(samples: np.ndarray) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(CHANNELS)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(samples.tobytes())
    return buf.getvalue()


# --- the three service calls, kept separate so each can be swapped alone ---

def _sarvam(path: str, headers: dict, timeout: int = 60, **kwargs) -> dict:
    """POST to Sarvam and hand back the decoded body, or raise."""
    resp = requests.post(f"https://api.sarvam.ai/{path}", headers=headers, timeout=timeout, **kwargs)
    resp.raise_for_status()
    return resp.json()


def speech_to_text(wav_bytes: bytes):
    """Returns the transcript and the language STT detected, so the reply can
    be spoken back in the language the user actually used."""
    body = _sarvam(
        "speech-to-text",
        {"api-subscription-key": SARVAM_KEY},
        files={"file": ("query.wav", wav_bytes, "audio/wav")},
        data={"model": "saarika:v2.5"},
    )
    return body.get("transcript", ""), body.get("language_code") or FALLBACK_LANGUAGE


# --- the service, which is the normal path ---------------------------------

def backend_stt(wav_bytes: bytes) -> tuple[str, str]:
    """Transcript and the language Sarvam decided it heard, via the service."""
    resp = requests.post(
        f"{BACKEND}/api/stt",
        files={"file": ("query.wav", wav_bytes, "audio/wav")},
        # "unknown" asks for detection. A kiosk cannot make a farmer pick their
        # language off a menu first; that menu is itself a literacy barrier.
        data={"language_code": "unknown"},
        timeout=60,
    )
    resp.raise_for_status()
    body = resp.json()
    return body.get("transcript", ""), body.get("languageCode") or FALLBACK_LANGUAGE


def backend_ask(question: str, code: str) -> dict:
    """The grounded answer, with the trust verdict attached."""
    resp = requests.post(
        f"{BACKEND}/api/ask",
        # 'voice' because this answer is spoken once through a small speaker
        # to someone who cannot re-read it - it asks for two sentences rather
        # than the paragraph a screen can hold.
        json={"question": question, "lang": code, "state": KIOSK_STATE, "mode": "voice"},
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()


def backend_ask_stream(question: str, code: str):
    """Yields the answer in speakable pieces, as the service writes them.

    The one-shot /api/ask cannot start a speaker early: it returns a single
    body, so nothing can be synthesized until the last word is written. This
    reads the streaming route instead, so sentence one goes to TTS while
    sentence two is still being generated.

    The caveat and the free-service line arrive last, as `spokenTail`, and are
    yielded like any other piece - so they are still spoken, still inside the
    audio, on every answer including a refusal.
    """
    resp = requests.post(
        f"{BACKEND}/api/ask/stream",
        json={"question": question, "lang": code, "state": KIOSK_STATE},
        stream=True,
        timeout=90,
    )
    resp.raise_for_status()

    for line in resp.iter_lines():
        if not line:
            continue
        try:
            event = json.loads(line)
        except ValueError:
            continue

        kind = event.get("type")
        if kind == "say":
            yield event["text"]
        elif kind in ("done", "escalate"):
            prov = event.get("provenance") or {}
            print(f"[ask] tier={prov.get('tier')} reason={prov.get('reason')} "
                  f"passage={event.get('passageId')}"
                  + (" ESCALATED" if kind == "escalate" else ""))
            if event.get("source"):
                print(f"[src] {event['source']}")
            tail = (event.get("spokenTail") or "").strip()
            if tail:
                yield tail
        elif kind == "error":
            raise RuntimeError(event.get("message", "service error"))


def backend_tts(text: str, tag: str) -> bytes:
    """Raw PCM at the rate this board's I2S clock is set to.

    `pcm=1` gets bare samples with no WAV header, and `rate` states what the
    firmware can play rather than accepting the browser default - the service
    synthesizes at 22050Hz for a browser, and those samples pushed through a
    16000Hz I2S clock come out 37% slow.
    """
    resp = requests.get(
        f"{BACKEND}/api/tts/raw",
        params={"text": text, "lang": tag, "pcm": "1", "rate": str(SAMPLE_RATE)},
        timeout=60,
    )
    resp.raise_for_status()

    got = int(resp.headers.get("X-Sample-Rate", SAMPLE_RATE))
    if got != SAMPLE_RATE:
        raise RuntimeError(
            f"service returned {got}Hz but the board plays at {SAMPLE_RATE}Hz"
        )
    return resp.content


def split_for_speech(text: str):
    """Cuts a finished answer into the same pieces the streaming path yields.

    The service does not stream its answer, so the model-side saving is not
    available on this path - but TTS was the larger cost anyway (4.20s of the
    8.15s measured), and that saving survives: the first piece is spoken while
    the rest is still being synthesized.
    """
    buf, first = text.strip(), True
    while buf:
        ready, rest = _take_sentence(
            buf + " ",   # a sentinel so a trailing terminator is not deferred
            MIN_FIRST_CHARS if first else MIN_NEXT_CHARS,
            clauses=first,
        )
        if not ready:
            yield buf
            return
        yield ready
        buf, first = rest.strip(), False


def _messages(text: str, language: str) -> list[dict]:
    """The full prompt for one question, without touching `history`.

    Built rather than appended so that a call which fails partway leaves no
    trace: the old code pushed the user's turn before the request and, if the
    request then raised, left a question in the history that was never
    answered - and every later turn was conditioned on it.
    """
    spoken = LANGUAGE_NAMES.get(language, "English")
    directive = (
        f"The user spoke {spoken}. Reply only in {spoken}, whatever place or "
        f"scheme names the question mentions. Do not switch languages."
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "system", "content": directive},
        *history,
        {"role": "user", "content": text},
    ]


def _remember(question: str, answer: str) -> None:
    """Commits a completed exchange. Both halves or neither."""
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})
    del history[: max(0, len(history) - MAX_TURNS * 2)]


def _take_sentence(buf: str, minimum: int, clauses: bool = False) -> tuple[str, str]:
    """Splits off the leading speakable piece once it is worth synthesizing.

    Returns (ready, rest). `ready` is empty until a break lands past `minimum`
    characters, so a reply that opens with "हाँ।" waits and goes out attached
    to what follows instead of as its own two-word clip.

    With `clauses`, a comma will do as well as a full stop - see CLAUSE_BREAKS.
    """
    breaks = SENTENCE_ENDS + CLAUSE_BREAKS if clauses else SENTENCE_ENDS
    for i, ch in enumerate(buf):
        if ch not in breaks:
            continue
        # Never decide on the last character in the buffer. Mid-stream it is
        # not yet known what follows, and "6," looks exactly like the end of a
        # clause until the "000" arrives in the next token - which is precisely
        # how the first version cut a rupee figure in half and made the kiosk
        # say "six" and "thousand rupees" as two separate breaths. More is
        # always coming; the final piece is flushed by the caller instead.
        if i + 1 >= len(buf):
            break
        # Neither a full stop nor a comma inside 1.5 or 6,000 is a break.
        if ch in ".," and buf[i + 1].isdigit():
            continue
        if i + 1 >= minimum:
            return buf[: i + 1].strip(), buf[i + 1 :].lstrip()
    return "", buf


def stream_reply(text: str, language: str = FALLBACK_LANGUAGE):
    """Yields the answer in speakable pieces as the model writes it.

    The history is committed only once the stream finishes, so an answer cut
    off halfway is not remembered as though it were complete.
    """
    resp = requests.post(
        "https://api.sarvam.ai/v1/chat/completions",
        headers={"Authorization": f"Bearer {SARVAM_KEY}", "Content-Type": "application/json"},
        json={
            "model": CHAT_MODEL,
            "messages": _messages(text, language),
            "max_tokens": 120,
            "stream": True,
        },
        stream=True,
        timeout=90,
    )
    resp.raise_for_status()

    buf, pieces = "", []
    for line in resp.iter_lines():
        if not line or not line.startswith(b"data: "):
            continue
        chunk = line[6:]
        if chunk == b"[DONE]":
            break
        try:
            delta = json.loads(chunk)["choices"][0]["delta"].get("content") or ""
        except (ValueError, KeyError, IndexError):
            # A malformed or keep-alive frame is not worth ending a reply over.
            continue
        buf += delta
        opening = not pieces
        ready, buf = _take_sentence(
            buf,
            MIN_FIRST_CHARS if opening else MIN_NEXT_CHARS,
            clauses=opening,
        )
        if ready:
            pieces.append(ready)
            yield ready

    tail = buf.strip()
    if tail:
        pieces.append(tail)
        yield tail

    if pieces:
        _remember(text, " ".join(pieces))


def get_reply(text: str, language: str = FALLBACK_LANGUAGE) -> str:
    """Whole answer in one call. The fallback when streaming fails."""
    body = _sarvam(
        "v1/chat/completions",
        {"Authorization": f"Bearer {SARVAM_KEY}", "Content-Type": "application/json"},
        timeout=90,
        json={
            "model": CHAT_MODEL,
            "messages": _messages(text, language),
            "max_tokens": 120,
        },
    )
    answer = body["choices"][0]["message"]["content"].strip()
    _remember(text, answer)
    return answer


def text_to_speech(text: str, language: str = FALLBACK_LANGUAGE) -> bytes:
    """Returns raw 16-bit mono PCM at SAMPLE_RATE, ready for the ESP32."""
    body = _sarvam(
        "text-to-speech",
        {"api-subscription-key": SARVAM_KEY, "Content-Type": "application/json"},
        json={
            "inputs": [text],
            "target_language_code": language,
            "speaker": SPEAKER,
            "speech_sample_rate": SAMPLE_RATE,
        },
    )

    # Strip the WAV container; the ESP32 wants bare samples.
    with wave.open(io.BytesIO(base64.b64decode(body["audios"][0])), "rb") as w:
        if w.getframerate() != SAMPLE_RATE:
            raise RuntimeError(
                f"TTS returned {w.getframerate()}Hz but the ESP32 is configured "
                f"for {SAMPLE_RATE}Hz; change one to match the other"
            )
        pcm = w.readframes(w.getnframes())
        if w.getnchannels() == 2:
            pcm = np.frombuffer(pcm, dtype=np.int16).reshape(-1, 2).mean(axis=1).astype(np.int16).tobytes()
    return pcm


def speak_pieces(kiosk: Kiosk, pieces, synth) -> int:
    """Speaks an answer as it becomes available, overlapping work with sound.

    One worker walks `pieces` and synthesizes each with `synth`, while the main
    thread plays what is ready. `Kiosk.play` blocks for as long as the audio
    lasts - the board accepts bytes only as fast as the speaker gets through
    them - and that blocking is what makes the overlap free: the next piece is
    synthesized during the seconds the previous one is already being spoken.

    Both answer paths share this, because the pacing problem is the same
    whether the words arrive from a stream or all at once.

    Returns how many pieces were played, so the caller can tell a failure that
    left the kiosk silent from one that interrupted a reply already in progress.
    """
    pcm_queue: queue.Queue = queue.Queue()
    failure: list[Exception] = []

    def produce():
        try:
            for piece in pieces:
                print(f"[ai]  {piece!r}")
                pcm_queue.put(synth(piece))
        except Exception as err:      # noqa: BLE001 - reported on the main thread
            failure.append(err)
        finally:
            pcm_queue.put(None)

    threading.Thread(target=produce, daemon=True).start()

    played = 0
    while True:
        pcm = pcm_queue.get()
        if pcm is None:
            break
        played += 1
        kiosk.play(pcm)

    if failure:
        if played == 0:
            raise failure[0]
        # Some of the answer was spoken. Saying so is more useful than
        # replaying it from the top, which would repeat what was just heard.
        print(f"[warn] reply cut short after {played} piece(s): {failure[0]}")
    return played


def handle_turn(kiosk: Kiosk, captured: np.ndarray):
    seconds = len(captured) / MIC_RATE
    peak = int(np.abs(captured).max()) if len(captured) else 0
    print(f"[audio] captured {seconds:.1f}s at {MIC_RATE}Hz, peak {peak}")
    if seconds < 0.3:
        print("[audio] too short, ignoring")
        return
    if peak == 0:
        # Deliberately not "every sample is zero": the board subtracts the DC
        # bias and scales by MIC_GAIN before sending, so a signal too small to
        # survive that arrives here as 0 too. The sketch prints the pre-gain
        # peak on serial, which is the number that tells the two apart.
        print("[mic] nothing survived the gain. Check Serial Monitor for the "
              "'[vad] ... raw peak' line: 0 means the ADC read a flat line "
              "(wiring), nonzero means it is only a gain problem — turn the "
              "MAX4466 trimmer up first.")
        return

    samples = resample(captured, MIC_RATE)

    if ECHO_ONLY:
        print("[echo] KIOSK_ECHO=1 - playing the recording straight back")
        kiosk.play(samples.tobytes())
        return

    question, tag = backend_stt(to_wav_bytes(samples))
    print(f"[stt] ({tag}) {question!r}")
    if not question.strip():
        print("[stt] nothing recognised, ignoring")
        return

    code = lang_code(tag)
    out_tag = speech_tag(code)
    try:
        speak_pieces(kiosk, backend_ask_stream(question, code),
                     lambda t: backend_tts(t, out_tag))
        return
    except LinkLost:
        raise
    except Exception as err:      # noqa: BLE001
        if not DIRECT_FALLBACK:
            print(f"[error] service unreachable at {BACKEND}: {err}")
            print("        Is `npm run dev` running, and is KIOSK_BACKEND its")
            print("        LAN address? Set KIOSK_DIRECT_FALLBACK=1 to answer")
            print("        from Sarvam directly - ungrounded, no citation.")
            return
        print(f"[warn] service unreachable ({err}); answering WITHOUT provenance")
        answer = get_reply(question, tag)
        print(f"[ai]  {answer!r}")
        speak_pieces(kiosk, split_for_speech(answer),
                     lambda t: text_to_speech(t, tag))
        return

def wait_for_start(kiosk: Kiosk, keyboard: queue.Queue) -> str:
    """Blocks until a turn opens, and says which input opened it."""
    while True:
        if not kiosk.alive:
            raise LinkLost("link dropped while waiting for a turn")
        try:
            # Only a 'D' opens a turn. Accepting any event would let the 'U'
            # that ends one immediately start the next.
            if kiosk.events.get(timeout=0.1) == "D":
                return "vad"
        except queue.Empty:
            pass
        if not keyboard.empty():
            keyboard.get()
            return "keyboard"


def serve(kiosk: Kiosk, keyboard: queue.Queue):
    """Answers turns until the board goes away."""
    while True:
        kiosk.drain()

        # The keyboard stand-in is drained here too, and not inside
        # Kiosk.drain, because it is this side's queue rather than the board's.
        # Leaving it out meant a stray Return - one typed during a reply, or
        # left over from a previous turn - sat in the queue indefinitely and
        # opened a recording the instant the next turn was waited for, which
        # on the log looked exactly like the board deciding to record by
        # itself with nobody touching the button.
        stale = 0
        while not keyboard.empty():
            keyboard.get_nowait()
            stale += 1
        if stale:
            print(f"[input] discarded {stale} stray Return(s) from before this turn")

        source = wait_for_start(kiosk, keyboard)
        # Which input opened the turn, because the three ways in fail
        # differently and the log could not previously tell them apart:
        # 'vad' is the board hearing something, 'keyboard' is this terminal.
        # The button prints '[button] down' on the board's own serial line.
        print(f"[audio] recording... (opened by {source})")

        if source == "vad":
            captured = kiosk.collect_until(kiosk.released)
        else:
            # Keyboard turns run the board's microphone directly, so the second
            # Return both stops the capture and is consumed here.
            kiosk.request_capture(True)
            captured = kiosk.collect_until(lambda: not keyboard.empty())
            kiosk.request_capture(False)
            keyboard.get()

        handle_turn(kiosk, captured)


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python kiosk_host.py <esp32-ip>")
    host = sys.argv[1]

    # Return on this terminal is a stand-in for the physical button, and drives
    # the ESP32's microphone over 'R'/'S' rather than any local one.
    keyboard = queue.Queue()
    threading.Thread(
        target=lambda: [keyboard.put("toggle") for _ in sys.stdin], daemon=True
    ).start()

    print("Just speak — the kiosk starts and stops on its own — or hold its "
          "button to\ntalk for exactly as long as you hold it. Return here "
          "forces a recording open/closed.")
    print(f"[net] answers come from {BACKEND}")

    # A kiosk that dies with the WiFi is a kiosk somebody has to walk over to
    # and restart. The board is the server here, so reconnecting is this
    # side's job: keep trying, and say plainly which state we are in.
    attempt = 0
    while True:
        kiosk = None
        try:
            kiosk = Kiosk(host)
            attempt = 0
            serve(kiosk, keyboard)
        except LinkLost as err:
            print(f"[net] {err}")
        except (OSError, ConnectionError) as err:
            if attempt == 0:
                print(f"[net] cannot reach the board at {host}:{TCP_PORT}: {err}")
                print("      Is it powered and on the same network? Its IP can")
                print("      change after a reboot - check the serial monitor.")
        except KeyboardInterrupt:
            print("\n[net] stopping")
            return
        finally:
            if kiosk is not None:
                kiosk.close()

        # Backing off to 5s rather than hammering: the usual cause is a board
        # that is rebooting, and it needs a few seconds before it listens.
        attempt += 1
        wait = min(5, attempt)
        print(f"[net] reconnecting in {wait}s (attempt {attempt})...")
        time.sleep(wait)


if __name__ == "__main__":
    main()
