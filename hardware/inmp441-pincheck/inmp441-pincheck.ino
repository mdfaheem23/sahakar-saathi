/*
 * INMP441 stage-2 diagnostic.
 *
 * Established so far: every channel/bit-width combination reads exactly 0,
 * and GPIO33 picks up floating noise the moment SD is unplugged. A healthy
 * floating pin that goes to a hard 0 when the mic is attached means the mic
 * is powered and actively driving the line — it is sending silence, not
 * nothing. So the wiring is fine and the remaining suspects are the clocks.
 *
 *   TEST A  Loopback. With SD off the mic and a jumper from GPIO26 into
 *           GPIO33, I2S latches its own bit clock as if it were audio. A
 *           nonzero result proves the peripheral really is clocking and that
 *           GPIO33 receives, which moves the fault onto the mic. Zero here
 *           means the ESP32 is not driving SCK/WS at all and no amount of
 *           mic-side fiddling will help.
 *
 *   TEST B  Sample-rate sweep. The INMP441 needs its bit clock inside roughly
 *           0.5-3.2MHz and goes to sleep below that, outputting a clean zero.
 *           At 64 bit-clocks per frame, 16kHz asks for 1.024MHz, which is
 *           inside spec but close enough to the floor that many of these
 *           modules simply refuse it while running fine at 44.1kHz. This
 *           sweeps the usable rates on both channel slots and reports which
 *           ones produce audio. If a higher rate works, record at that rate
 *           and downsample to the 16kHz the STT API wants.
 *
 *   TEST C  Frame format. A few module revisions latch on the MSB/left-
 *           justified framing rather than standard I2S.
 *
 * Serial at 115200. Make noise near the mic throughout.
 */

#include <driver/i2s.h>

#define MIC_SCK 26
#define MIC_WS  25
#define MIC_SD  33
#define MIC_PORT I2S_NUM_1      // I2S_NUM_0 belongs to the MAX98357A

const int SAMPLES = 512;
int32_t buf[SAMPLES];

struct Result { int32_t peak; int32_t nonZero; int32_t raw[4]; };

Result capture(uint32_t rate, i2s_channel_fmt_t fmt, i2s_comm_format_t comm) {
  i2s_driver_uninstall(MIC_PORT);

  i2s_config_t cfg = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = rate,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = fmt,
    .communication_format = comm,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 256,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };
  i2s_pin_config_t pins = {
    .bck_io_num = MIC_SCK,
    .ws_io_num = MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = MIC_SD
  };
  i2s_driver_install(MIC_PORT, &cfg, 0, NULL);
  i2s_set_pin(MIC_PORT, &pins);
  i2s_zero_dma_buffer(MIC_PORT);
  delay(200);   // the part needs a moment of clock before it wakes and settles

  Result r = {0, 0, {0, 0, 0, 0}};
  bool captured = false;
  for (int pass = 0; pass < 10; pass++) {
    size_t bytesRead = 0;
    i2s_read(MIC_PORT, buf, sizeof(buf), &bytesRead, portMAX_DELAY);
    int n = bytesRead / sizeof(int32_t);
    if (!captured && n >= 4) {
      for (int i = 0; i < 4; i++) r.raw[i] = buf[i];
      captured = true;
    }
    for (int i = 0; i < n; i++) {
      int32_t s = buf[i] >> 8;          // 24 bits live at the top of the word
      if (s != 0) r.nonZero++;
      int32_t a = s < 0 ? -s : s;
      if (a > r.peak) r.peak = a;
    }
  }
  return r;
}

void report(const char* label, Result r) {
  Serial.printf("%-30s peak=%-10ld nonZero=%-6ld raw= %08lX %08lX %08lX %08lX\n",
                label, (long)r.peak, (long)r.nonZero,
                (unsigned long)r.raw[0], (unsigned long)r.raw[1],
                (unsigned long)r.raw[2], (unsigned long)r.raw[3]);
}

void waitForEnter(const char* prompt) {
  Serial.println(prompt);
  Serial.println("   ...then send any character in Serial Monitor to continue.");
  while (Serial.available()) Serial.read();
  while (!Serial.available()) delay(50);
  while (Serial.available()) Serial.read();
}

void setup() {
  Serial.begin(115200);
  delay(600);
  Serial.println("\n=== INMP441 stage-2 diagnostic ===");

  Serial.println("\n--- TEST A: I2S loopback (are the clocks real?) ---");
  waitForEnter("Unplug SD from the mic. Jumper GPIO26 straight into GPIO33.");
  report("loopback SCK->SD", capture(16000, I2S_CHANNEL_FMT_ONLY_LEFT, I2S_COMM_FORMAT_STAND_I2S));
  Serial.println("  Large nonZero (raw full of AAAAAAAA / 55555555 style patterns) = clocks are");
  Serial.println("  running and GPIO33 receives, so the ESP32 side is proven good.");
  Serial.println("  Still zero = the peripheral is not clocking; the mic can never work until");
  Serial.println("  that is fixed. Suspect GPIO26/25 conflicting with something on the board.");

  waitForEnter("\nRemove the jumper. Reconnect SD to the mic.");

  Serial.println("\n--- TEST B: sample-rate sweep, 32-bit ---");
  const uint32_t rates[] = {8000, 16000, 22050, 32000, 44100, 48000};
  for (uint32_t rate : rates) {
    char label[40];
    snprintf(label, sizeof(label), "%luHz LEFT", (unsigned long)rate);
    report(label, capture(rate, I2S_CHANNEL_FMT_ONLY_LEFT, I2S_COMM_FORMAT_STAND_I2S));
    snprintf(label, sizeof(label), "%luHz RIGHT", (unsigned long)rate);
    report(label, capture(rate, I2S_CHANNEL_FMT_ONLY_RIGHT, I2S_COMM_FORMAT_STAND_I2S));
  }

  Serial.println("\n--- TEST C: MSB/left-justified framing at 44100Hz ---");
  report("44100Hz LEFT  MSB", capture(44100, I2S_CHANNEL_FMT_ONLY_LEFT,  I2S_COMM_FORMAT_STAND_MSB));
  report("44100Hz RIGHT MSB", capture(44100, I2S_CHANNEL_FMT_ONLY_RIGHT, I2S_COMM_FORMAT_STAND_MSB));

  Serial.println("\nAny line with peak in the thousands and high nonZero is a working config.");
  Serial.println("If a rate above 16000 works, record there and downsample before sending to STT.");
  Serial.println("If TEST A passed but every rate here reads zero, the module itself is faulty.");
}

void loop() {
  delay(3000);
  report("live 44100Hz LEFT", capture(44100, I2S_CHANNEL_FMT_ONLY_LEFT, I2S_COMM_FORMAT_STAND_I2S));
}
