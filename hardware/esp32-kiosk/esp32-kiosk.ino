/*
 * Kiosk audio endpoint - hands-free.
 *
 * The ESP32 owns both halves of the audio path: it listens continuously on the
 * MAX4466, decides for itself when someone has started and stopped speaking,
 * streams those samples up to the laptop, and plays back whatever PCM the
 * laptop sends in reply. The laptop keeps every expensive or fragile step -
 * speech-to-text, the assistant reply, text-to-speech - because none of it
 * fits here.
 *
 * Two things changed from the button-and-INMP441 version:
 *
 *   1. The microphone is now a MAX4466, which is analog. It is read through
 *      ADC1 on GPIO34 rather than over I2S, so it has no clocks to get wrong -
 *      but it also has a DC bias at VCC/2 that has to be subtracted in
 *      software before the samples mean anything.
 *
 *   2. The button is no longer required. A simple energy VAD (voice activity
 *      detector) decides when a turn starts and ends on its own: the board
 *      measures the room's noise floor, opens a turn when the level stays
 *      above it, and closes the turn after a stretch of silence. From the
 *      laptop's point of view nothing changed - it still sees 'D', microphone
 *      frames, then 'U'.
 *
 *      The button still works, and while held it overrides the VAD entirely:
 *      the microphone records for exactly as long as the button is down, no
 *      thresholds consulted. That is the escape hatch for a room too loud for
 *      the VAD to hear over, and the only way to interrupt a reply. Leaving
 *      the button unwired is fine - the pull-up reads "not pressed" forever
 *      and the kiosk runs hands-free.
 *
 * Audio is raw PCM in both directions rather than WAV or MP3 on purpose. A
 * codec would cost a library, a large working buffer, and a class of failures
 * that are painful to debug over a serial line; raw samples go straight
 * between the socket and the peripherals with nothing in between.
 *
 * Wire protocol, deliberately small enough to read in a hex dump. Every
 * length is a little-endian uint32 and every payload is 16-bit signed mono.
 *
 *   ESP32 -> laptop   'D' / 'U'   a turn opened / closed (now VAD, not button)
 *                     'M' len ... a chunk of microphone audio at MIC_RATE
 *   laptop -> ESP32   'A' len ... audio to play, at SAMPLE_RATE
 *                     'R'         force capture on (keyboard stand-in)
 *                     'S'         force capture on ff
 *
 * Port assignment is forced and not a preference: the ESP32's built-in-ADC I2S
 * mode exists only on I2S_NUM_0, so the microphone takes port 0 and the
 * amplifier moves to port 1. Sharing one port is not an option either way -
 * whichever peripheral is configured second reconfigures the first out from
 * under it.
 *
 * Pins:
 *   MAX98357A   BCLK 14, LRC 15, DIN 22
 *   MAX4466     OUT -> GPIO34, VCC -> 3V3, GND -> GND
 *   button      between GPIO27 and GND (optional)
 *
 * GPIO34 is input-only and sits on ADC1, which is the half of the ADC that
 * keeps working while WiFi is on. ADC2 pins (GPIO25/26/27, 0/2/4, 12-15) do
 * not, so do not "fix" a quiet mic by moving it to one of those.
 */

#include <WiFi.h>
#include <driver/i2s.h>
#include <driver/adc.h>

// ---- configure these two, everything else can stay ----
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

#define AMP_BCLK 14
#define AMP_LRC  15
#define AMP_DIN  22
#define AMP_PORT I2S_NUM_1        // port 0 is spoken for by the ADC, see above

#define MIC_ADC_CHANNEL ADC1_CHANNEL_6   // GPIO34
#define MIC_PORT I2S_NUM_0               // built-in ADC only exists here

// Digital use of an ADC2 pin, which is fine - only analogRead() on ADC2 is
// broken while WiFi is up, and this is never read as analog.
#define BUTTON_PIN 27

const uint32_t SAMPLE_RATE = 16000;   // playback; must match the laptop script

/*
 * Capture rate. The INMP441 forced 44100 and made the laptop downsample; the
 * ADC has no such constraint, so capture at exactly the rate speech-to-text
 * wants and skip the resampling entirely. Set MIC_RATE = 16000 in
 * kiosk_host.py to match.
 */
const uint32_t MIC_RATE = 16000;

/*
 * The ADC returns 12 bits (0..4095) centred near 2048, so a sample swings at
 * most +-2048 - a 16-bit sample needs to be scaled up by about 16 to fill the
 * range. 12 leaves headroom for the MAX4466's own gain, which is a trimmer on
 * the back of the board and the first thing to reach for: turn the pot up
 * before touching this number. Raise it if the transcript comes back empty,
 * lower it if loud speech sounds crunchy.
 */
const int MIC_GAIN = 12;

const uint16_t TCP_PORT = 8080;

WiFiServer server(TCP_PORT);
WiFiClient client;

// Mono arrives on the wire; the amplifier is configured stereo because ESP32
// cores disagree about how mono TX frames are laid out, and duplicating into
// both slots behaves identically everywhere.
const int CHUNK_SAMPLES = 512;
int16_t monoBuf[CHUNK_SAMPLES];
int16_t stereoBuf[CHUNK_SAMPLES * 2];

// ---------------------------------------------------------------------------
// Voice activity detection
// ---------------------------------------------------------------------------
/*
 * One frame is the unit everything below is counted in: the VAD scores a whole
 * frame at a time, and the turn boundaries are measured in frames rather than
 * milliseconds. 256 samples at 16kHz is 16ms - short enough that the start of
 * speech is not audibly late, long enough that one loud keyboard click cannot
 * score a frame on its own.
 */
const int FRAME_SAMPLES = 256;
const int FRAME_MS = (FRAME_SAMPLES * 1000) / MIC_RATE;   // 16

uint16_t adcBuf[FRAME_SAMPLES];
int16_t frameOut[FRAME_SAMPLES];

// How many consecutive loud frames open a turn. Requiring a few in a row is
// what separates speech from a door slam: a slam is loud for one frame, a
// spoken word is loud for ten.
const int START_FRAMES = 3;

// Silence that closes a turn. Long enough to survive the pause between two
// sentences, short enough that the reply does not feel late. 900ms.
const int END_SILENCE_FRAMES = 900 / FRAME_MS;

// A turn is cut off here regardless. Without a ceiling, one noisy room means
// one recording that never ends and never gets answered.
const uint32_t MAX_TURN_MS = 12000;

// Below this the turn is dropped rather than sent - it is a cough, not a
// question, and sending it costs a round trip through three paid APIs.
const uint32_t MIN_TURN_MS = 400;

/*
 * A turn is detected a few frames after it actually began, so by the time the
 * VAD says "speech" the first syllable is already gone. This ring holds the
 * recent past so it can be sent as the front of the recording - without it
 * every question arrives at STT missing its first consonant, which is exactly
 * the kind of error that looks like a bad microphone.
 */
const int PREROLL_FRAMES = 8;   // 128ms
int16_t preroll[PREROLL_FRAMES][FRAME_SAMPLES];
int prerollHead = 0;
int prerollCount = 0;

// The bias the MAX4466 sits at, tracked rather than assumed: it is nominally
// VCC/2 but drifts with supply and temperature, and a wrong centre point shows
// up as a DC step that the VAD reads as permanent loudness.
int32_t dcLevel = 2048 << 8;    // 8 fractional bits

// Room tone, measured at boot and then re-measured continuously whenever the
// board is not in a turn. Adaptive because a kiosk's noise floor at 9am and at
// noon are different numbers, and a fixed threshold is wrong at one of them.
int32_t noiseFloor = 40;

// How far above the noise floor counts as speech. Lower it if the board
// ignores you, raise it if it starts turns on its own in an empty room. The
// absolute term is the floor for a very quiet room, where 3x almost nothing
// is still almost nothing.
const int VAD_MULTIPLIER = 4;
const int32_t VAD_ABSOLUTE_MIN = 60;

bool capturing = false;
bool forcedCapture = false;      // 'R'/'S' from the laptop override the VAD
bool buttonHeld = false;         // and so does the button, for as long as it is down
bool manualTurn = false;         // this turn was opened by hand, so only a hand ends it
int loudRun = 0;                 // consecutive loud frames while idle
int silentRun = 0;               // consecutive quiet frames while capturing
uint32_t turnStartedAt = 0;
uint32_t vadMutedUntil = 0;      // set after playback, see endPlayback()
uint32_t lastReportAt = 0;

// Measured before MIC_GAIN is applied. The laptop only ever sees scaled
// samples, so it cannot tell "the mic drove nothing" from "the mic drove
// something too small to survive the scaling" - and those are different faults
// with different fixes. This is the number that settles it.
int32_t rawPeak = 0;
uint32_t rawSamples = 0;

void startAmp() {
  i2s_config_t cfg = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = true,   // play silence on underrun instead of buzzing
    .fixed_mclk = 0
  };
  i2s_pin_config_t pins = {
    .bck_io_num = AMP_BCLK,
    .ws_io_num = AMP_LRC,
    .data_out_num = AMP_DIN,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  i2s_driver_install(AMP_PORT, &cfg, 0, NULL);
  i2s_set_pin(AMP_PORT, &pins);
  i2s_zero_dma_buffer(AMP_PORT);
}

/*
 * The I2S peripheral drives the ADC here rather than analogRead() in the loop.
 * analogRead is at the mercy of whatever else the loop is doing, and the
 * resulting jitter in sample spacing is heard by STT as a warble; the I2S DMA
 * clocks conversions in hardware at exactly MIC_RATE and hands over finished
 * blocks, which is the only way to get audio out of an ADC that holds up.
 *
 * No i2s_set_pin call: in built-in-ADC mode the channel selects the pin.
 */
void startMic() {
  i2s_config_t cfg = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX | I2S_MODE_ADC_BUILT_IN),
    .sample_rate = MIC_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  i2s_driver_install(MIC_PORT, &cfg, 0, NULL);
  i2s_set_adc_mode(ADC_UNIT_1, MIC_ADC_CHANNEL);
  // 11dB attenuation puts full scale near 3.3V. The MAX4466 swings around
  // VCC/2 and can approach both rails when its trimmer is up, so anything
  // narrower clips the loud half of every word.
  adc1_config_channel_atten(MIC_ADC_CHANNEL, ADC_ATTEN_DB_11);
  i2s_adc_enable(MIC_PORT);
  i2s_zero_dma_buffer(MIC_PORT);
}

// Blocking read of exactly n bytes, so a frame split across TCP packets does
// not desynchronise the stream. Returns false if the peer disappears.
bool readExact(uint8_t* dest, size_t n) {
  size_t got = 0;
  uint32_t deadline = millis() + 5000;
  while (got < n) {
    if (!client.connected()) return false;
    int r = client.read(dest + got, n - got);
    if (r > 0) {
      got += r;
      deadline = millis() + 5000;
    } else if (millis() > deadline) {
      Serial.println("[audio] timed out mid-frame, dropping connection");
      return false;
    } else {
      delay(1);
    }
  }
  return true;
}

void sendTag(uint8_t tag) {
  if (client && client.connected()) client.write(tag);
}

void sendMicFrame(const int16_t* samples, int count) {
  if (!(client && client.connected())) return;
  uint32_t bytes = (uint32_t)count * sizeof(int16_t);
  uint8_t header[5] = {'M',
                       (uint8_t)(bytes & 0xFF), (uint8_t)((bytes >> 8) & 0xFF),
                       (uint8_t)((bytes >> 16) & 0xFF), (uint8_t)((bytes >> 24) & 0xFF)};
  client.write(header, sizeof(header));
  client.write((const uint8_t*)samples, bytes);
}

/*
 * Reads one frame, removes the DC bias, scales it, and returns the frame's
 * mean absolute level - the number the VAD thresholds against. Mean absolute
 * rather than RMS because it needs no square root, tracks speech just as well
 * at these thresholds, and cannot overflow an int32 over 256 samples.
 *
 * Returns -1 when the DMA had nothing ready, which is normal and not an error.
 */
int32_t readFrame() {
  size_t bytesRead = 0;
  esp_err_t err = i2s_read(MIC_PORT, adcBuf, sizeof(adcBuf), &bytesRead, pdMS_TO_TICKS(20));
  if (err != ESP_OK || bytesRead == 0) return -1;

  int n = bytesRead / sizeof(uint16_t);
  int32_t sum = 0;
  rawSamples += n;

  for (int i = 0; i < n; i++) {
    // The top four bits carry the channel number, not signal. Masking them off
    // is not optional: left in, they read as a huge constant offset.
    int32_t raw = adcBuf[i] & 0x0FFF;

    // One-pole tracking of the bias. Slow (>>9 per sample, a time constant of
    // several hundred milliseconds) so that it follows supply drift but not
    // the speech sitting on top of it - a fast filter would subtract the
    // voice along with the bias.
    dcLevel += ((raw << 8) - dcLevel) >> 9;
    int32_t centred = raw - (dcLevel >> 8);

    int32_t mag = centred < 0 ? -centred : centred;
    sum += mag;
    if (mag > rawPeak) rawPeak = mag;

    int32_t s = centred * MIC_GAIN;
    if (s > 32767) s = 32767;
    else if (s < -32768) s = -32768;
    frameOut[i] = (int16_t)s;
  }

  // Short frames would make the level incomparable between frames, and the
  // ring below assumes a full one, so pad rather than special-case.
  for (int i = n; i < FRAME_SAMPLES; i++) frameOut[i] = 0;

  return sum / n;
}

void pushPreroll() {
  memcpy(preroll[prerollHead], frameOut, sizeof(frameOut));
  prerollHead = (prerollHead + 1) % PREROLL_FRAMES;
  if (prerollCount < PREROLL_FRAMES) prerollCount++;
}

// Oldest first, so the recording is in the order it was spoken.
void flushPreroll() {
  int start = (prerollHead - prerollCount + PREROLL_FRAMES) % PREROLL_FRAMES;
  for (int i = 0; i < prerollCount; i++) {
    sendMicFrame(preroll[(start + i) % PREROLL_FRAMES], FRAME_SAMPLES);
  }
  prerollCount = 0;
}

/*
 * Debounced edge detection; INPUT_PULLUP means pressed reads LOW. The serial
 * line gets every edge whether or not a laptop is attached, which is what
 * makes this the test for a miswired button: no print at all means the pin
 * never moved, so the fault is in the wiring rather than in the network.
 */
void pollButton() {
  static int stable = HIGH;
  static int candidate = HIGH;
  static uint32_t changedAt = 0;

  int now = digitalRead(BUTTON_PIN);
  if (now != candidate) {
    candidate = now;
    changedAt = millis();
  } else if (candidate != stable && millis() - changedAt > 30) {
    stable = candidate;
    buttonHeld = (stable == LOW);
    Serial.println(buttonHeld ? "[button] down" : "[button] up");
  }
}

// A hand on the button, or the laptop's keyboard stand-in. Either one runs the
// microphone directly and the VAD does not get a vote.
bool manualCaptureWanted() {
  return buttonHeld || forcedCapture;
}

/*
 * fromButton distinguishes the two ways a turn opens, and it is not only for
 * the log line: a VAD turn needs its pre-roll, because detection lags the
 * first syllable. A held button does not - the user presses and then speaks,
 * so the pre-roll holds only the room and the click of the switch itself, and
 * sending it puts a transient at the front of every recording.
 */
void openTurn(bool fromButton) {
  capturing = true;
  manualTurn = fromButton;
  silentRun = 0;
  loudRun = 0;
  turnStartedAt = millis();
  rawPeak = 0;
  rawSamples = 0;
  sendTag('D');
  if (fromButton) {
    prerollCount = 0;
    Serial.println("[mic] button held - recording");
  } else {
    Serial.printf("[vad] speech detected (floor %ld) - recording\n", (long)noiseFloor);
    flushPreroll();
  }
}

void closeTurn(const char* why) {
  uint32_t ms = millis() - turnStartedAt;
  capturing = false;
  manualTurn = false;
  loudRun = 0;
  silentRun = 0;
  sendTag('U');
  Serial.printf("[vad] %s after %lums - raw peak %ld\n", why, (unsigned long)ms, (long)rawPeak);

  if (ms < MIN_TURN_MS) {
    Serial.println("[vad] that was too short to be a question; the laptop will drop it");
  }
  if (rawPeak == 0) {
    Serial.println("[mic] raw peak is exactly 0: the ADC read a dead flat line.");
    Serial.println("      Check OUT is really on GPIO34, VCC on 3V3 and GND on GND,");
    Serial.println("      then confirm the MAX4466's gain trimmer is not at minimum.");
  } else if (rawPeak < 30) {
    Serial.printf("[mic] the mic IS moving, just barely (%ld of 2048). Turn the\n", (long)rawPeak);
    Serial.printf("      MAX4466 trimmer up first, then raise MIC_GAIN (now %d).\n", MIC_GAIN);
  }
}

/*
 * One pass of the VAD. Called every loop; does nothing expensive when there is
 * no frame ready.
 *
 * The noise floor is only updated while idle and only from quiet frames.
 * Updating it during a turn would let a long answer raise the floor above the
 * speaker's own voice, and the turn would end mid-sentence.
 */
void pumpAudio() {
  int32_t level = readFrame();
  if (level < 0) return;

  /*
   * The manual path first and unconditionally: while the button is down the
   * microphone records, whatever the thresholds or the post-playback mute
   * think. That is the whole point of having a button on a kiosk - it is what
   * still works in a room the VAD cannot hear over.
   */
  if (manualCaptureWanted()) {
    if (!capturing) openTurn(true);
    // Pressing the button part-way through a turn the VAD started hands
    // control over rather than leaving two owners for one recording: release
    // now ends it, which is what someone holding a button expects.
    manualTurn = true;
    sendMicFrame(frameOut, FRAME_SAMPLES);
    // The ceiling still applies. A button stuck down by a jammed panel would
    // otherwise record until the board is reset.
    if (millis() - turnStartedAt > MAX_TURN_MS) closeTurn("hit the length limit");
    return;
  }

  // Releasing the button ends the turn it started, immediately - waiting for
  // the VAD's silence timer would append a second of room tone to every
  // push-to-talk question.
  if (capturing && manualTurn) {
    closeTurn("button released");
    return;
  }

  // Everything the microphone heard while the speaker was playing is the
  // speaker, and the tail of that is still ringing in the room afterwards.
  if (millis() < vadMutedUntil) {
    prerollCount = 0;
    return;
  }

  int32_t threshold = noiseFloor * VAD_MULTIPLIER;
  if (threshold < VAD_ABSOLUTE_MIN) threshold = VAD_ABSOLUTE_MIN;

  if (!capturing) {
    pushPreroll();

    if (level > threshold) {
      loudRun++;
      if (loudRun >= START_FRAMES) openTurn(false);
    } else {
      loudRun = 0;
      // Asymmetric on purpose: the floor rises slowly and falls quickly, so a
      // passing truck does not deafen the kiosk for the next minute.
      if (level > noiseFloor) noiseFloor += (level - noiseFloor) >> 5;
      else noiseFloor += (level - noiseFloor) >> 3;
      if (noiseFloor < 5) noiseFloor = 5;
    }

    // A heartbeat, so a kiosk that never triggers can be diagnosed by reading
    // the two numbers rather than by guessing at them.
    if (millis() - lastReportAt > 3000) {
      lastReportAt = millis();
      Serial.printf("[vad] idle - level %ld, floor %ld, threshold %ld\n",
                    (long)level, (long)noiseFloor, (long)threshold);
    }
    return;
  }

  sendMicFrame(frameOut, FRAME_SAMPLES);

  // Hysteresis: it takes a clearly loud frame to open a turn but only a
  // half-loud one to keep it open, so the quiet end of a word does not look
  // like the end of the sentence.
  if (level > threshold / 2) silentRun = 0;
  else silentRun++;

  if (silentRun >= END_SILENCE_FRAMES) closeTurn("silence");
  else if (millis() - turnStartedAt > MAX_TURN_MS) closeTurn("hit the length limit");
}

// Discards the rest of a frame without playing it, leaving the socket exactly
// where the next marker begins.
void discardFrame(uint32_t remaining) {
  while (remaining > 0) {
    size_t want = remaining < sizeof(monoBuf) ? remaining : sizeof(monoBuf);
    if (!readExact((uint8_t*)monoBuf, want)) return;
    remaining -= want;
  }
}

/*
 * Playback deafens the board on purpose. With one microphone in the same
 * enclosure as the speaker there is no way to tell the assistant's voice from
 * a user's, so a VAD left running would hear the reply, open a turn, and send
 * the kiosk's own words back to be transcribed - a loop that answers itself
 * until the API bill notices. The mute extends past the last sample for the
 * room's reverb tail.
 */
void endPlayback() {
  i2s_zero_dma_buffer(MIC_PORT);   // drop everything captured during the reply
  prerollCount = 0;
  loudRun = 0;
  vadMutedUntil = millis() + 500;
}

void playFrame(uint32_t byteCount) {
  uint32_t remaining = byteCount;
  while (remaining > 0) {
    /*
     * Polling here rather than only in loop() is what keeps the button alive
     * during playback. Without it a ten second reply is ten seconds in which
     * presses are never sampled at all - and since the VAD is deliberately
     * deaf while the speaker is running, the button is the only thing left
     * that can interrupt an answer the user has already heard enough of.
     */
    pollButton();
    if (buttonHeld) {
      Serial.println("[audio] button pressed mid-reply, stopping playback");
      i2s_zero_dma_buffer(AMP_PORT);
      discardFrame(remaining);
      // Not endPlayback(): its mute is there to stop the VAD hearing the
      // speaker, and the user is holding the button precisely because they
      // want to talk now. Only the stale capture needs dropping.
      i2s_zero_dma_buffer(MIC_PORT);
      prerollCount = 0;
      return;
    }

    size_t want = remaining < sizeof(monoBuf) ? remaining : sizeof(monoBuf);
    if (!readExact((uint8_t*)monoBuf, want)) {
      endPlayback();
      return;
    }

    int samples = want / sizeof(int16_t);
    for (int i = 0; i < samples; i++) {
      stereoBuf[i * 2]     = monoBuf[i];
      stereoBuf[i * 2 + 1] = monoBuf[i];
    }

    size_t written = 0;
    i2s_write(AMP_PORT, stereoBuf, samples * 2 * sizeof(int16_t), &written, portMAX_DELAY);
    remaining -= want;
  }
  Serial.printf("[audio] played %lu bytes\n", (unsigned long)byteCount);
  endPlayback();
}

/*
 * Half a second of the room with nobody talking, so the first turn is judged
 * against a real floor instead of the guess in the initialiser. Run at boot,
 * before the network, because that is the quiet moment the kiosk is guaranteed
 * to get; the adaptive update in pumpAudio keeps it honest afterwards.
 */
void calibrateNoiseFloor() {
  Serial.println("[vad] measuring the room - stay quiet for half a second");
  int32_t total = 0;
  int frames = 0;
  uint32_t deadline = millis() + 500;
  while (millis() < deadline) {
    int32_t level = readFrame();
    if (level < 0) continue;
    total += level;
    frames++;
  }
  if (frames > 0) noiseFloor = total / frames;
  if (noiseFloor < 5) noiseFloor = 5;
  rawPeak = 0;
  rawSamples = 0;
  Serial.printf("[vad] noise floor %ld, so speech starts above %ld\n",
                (long)noiseFloor,
                (long)max((int32_t)(noiseFloor * VAD_MULTIPLIER), VAD_ABSOLUTE_MIN));
}

// Turns a failed association into an explanation. The common causes look
// identical from the outside - a 5GHz-only hotspot, a typo, a network out of
// range - so the scan is what separates them: if the SSID does not appear at
// all, the ESP32's 2.4GHz-only radio cannot see it and no password will help.
const char* wifiStatusName(wl_status_t s) {
  switch (s) {
    case WL_IDLE_STATUS:     return "IDLE";
    case WL_NO_SSID_AVAIL:   return "NO_SSID_AVAIL (network not found on 2.4GHz)";
    case WL_SCAN_COMPLETED:  return "SCAN_COMPLETED";
    case WL_CONNECTED:       return "CONNECTED";
    case WL_CONNECT_FAILED:  return "CONNECT_FAILED (usually a wrong password)";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED:    return "DISCONNECTED";
    default:                 return "UNKNOWN";
  }
}

void scanAndReport() {
  Serial.println("[wifi] scanning for 2.4GHz networks in range...");
  int n = WiFi.scanNetworks();
  if (n <= 0) {
    Serial.println("[wifi] nothing visible at all - the radio sees no 2.4GHz networks");
    return;
  }
  bool found = false;
  for (int i = 0; i < n; i++) {
    bool match = WiFi.SSID(i) == String(WIFI_SSID);
    if (match) found = true;
    Serial.printf("   %-32s rssi=%-5d %s\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                  match ? "  <-- this is the one you configured" : "");
  }
  WiFi.scanDelete();
  if (!found) {
    Serial.printf("[wifi] '%s' is NOT in the list. The ESP32 has no 5GHz radio, so a\n", WIFI_SSID);
    Serial.println("       hotspot running on 5GHz is invisible to it. On iPhone turn on");
    Serial.println("       Settings > Personal Hotspot > Maximize Compatibility. On Android");
    Serial.println("       set the hotspot band to 2.4GHz. Then reset the board.");
  } else {
    Serial.println("[wifi] the network IS visible, so the radio is fine - check the password.");
  }
}

// Retries indefinitely, but reports after every attempt rather than hanging.
void joinWiFi() {
  for (int attempt = 1; ; attempt++) {
    Serial.printf("\n[wifi] attempt %d joining '%s'", attempt, WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    uint32_t deadline = millis() + 15000;
    while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
      delay(400);
      Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) return;

    Serial.printf("[wifi] failed: %s\n", wifiStatusName(WiFi.status()));
    WiFi.disconnect(true);
    delay(200);
    scanAndReport();
    delay(2000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(600);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  startAmp();
  startMic();
  Serial.printf("[mic] MAX4466 on GPIO34 via ADC1 at %luHz, gain %d\n",
                (unsigned long)MIC_RATE, MIC_GAIN);

  calibrateNoiseFloor();

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);   // clear any credentials cached from an earlier flash
  delay(200);
  joinWiFi();
  Serial.printf("[wifi] connected, IP %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[net] listening on port %u - put this IP in the laptop script\n", TCP_PORT);
  server.begin();

  // WiFi coming up shifts the supply and therefore the ADC's idea of quiet, so
  // the floor measured before it is now slightly wrong. The adaptive update
  // corrects that within a second; muting until then stops the correction
  // itself from looking like someone talking.
  vadMutedUntil = millis() + 1000;
  Serial.println("[vad] listening - speak and it records on its own, or hold the");
  Serial.println("      button to record for exactly as long as you hold it");
}

void loop() {
  if (!client || !client.connected()) {
    WiFiClient incoming = server.available();
    if (incoming) {
      client = incoming;
      client.setNoDelay(true);   // audio latency matters more than packet efficiency
      Serial.println("[net] laptop connected");
      // Anything captured before there was anywhere to send it is stale, and
      // a turn opened against no listener would send its 'U' to a socket that
      // never saw the 'D'.
      if (capturing) closeTurn("connection reset the turn");
      vadMutedUntil = millis() + 300;
    }
  }

  pollButton();
  pumpAudio();

  if (client && client.connected() && client.available() > 0) {
    int marker = client.read();
    if (marker == 'A') {
      uint8_t lenBytes[4];
      if (readExact(lenBytes, 4)) {
        uint32_t byteCount = (uint32_t)lenBytes[0] | ((uint32_t)lenBytes[1] << 8) |
                             ((uint32_t)lenBytes[2] << 16) | ((uint32_t)lenBytes[3] << 24);
        playFrame(byteCount);
      } else {
        client.stop();
      }
    } else if (marker == 'R') {
      forcedCapture = true;
    } else if (marker == 'S') {
      forcedCapture = false;
      if (capturing) closeTurn("laptop stopped the capture");
    } else if (marker >= 0) {
      Serial.printf("[net] unexpected byte 0x%02X, resynchronising\n", marker);
    }
  }
}
