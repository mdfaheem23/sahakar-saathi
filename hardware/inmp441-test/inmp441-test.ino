/*
 * INMP441 diagnostic — finds out why the mic reads zero.
 *
 * Reading exactly 0 with SD connected (and floating noise with it removed)
 * means the I2S peripheral is clocking but latching nothing. On this part
 * there are only a few causes, and they are all configuration rather than
 * wiring, so this sketch tries each one and prints what it measured instead
 * of asking you to guess:
 *
 *   1. Sample width. The INMP441 emits 24 bits of data inside a 32-bit slot.
 *      Configure I2S for 16 bits and you latch the top bits of a frame that
 *      has not started yet — which reads as a clean 0, not as garbage.
 *   2. Channel slot. L/R tied to GND puts the mic in the LEFT slot. Ask the
 *      peripheral for the RIGHT slot and it faithfully reports the silence
 *      that is genuinely there. This is the single most common cause of
 *      "exactly zero", and ESP32 boards disagree about the polarity, so the
 *      only reliable move is to measure both.
 *   3. Peripheral collision. The amplifier already uses I2S_NUM_0. The mic
 *      must be on I2S_NUM_1 or one of them gets reconfigured out from under
 *      the other.
 *
 * Wiring under test: VDD->3V3, GND->GND, SCK->26, WS->25, SD->33, L/R->GND
 *
 * Run it, watch Serial at 115200, and speak/tap near the mic during each pass.
 */

#include <driver/i2s.h>

#define MIC_SCK 26
#define MIC_WS  25
#define MIC_SD  33

// I2S_NUM_1 deliberately: I2S_NUM_0 belongs to the MAX98357A.
#define MIC_PORT I2S_NUM_1

const uint32_t SAMPLE_RATE = 16000;   // what Sarvam STT wants
const int      SAMPLES     = 1024;

int32_t buf[SAMPLES];

void startMic(i2s_channel_fmt_t fmt, i2s_bits_per_sample_t bits) {
  i2s_driver_uninstall(MIC_PORT);

  i2s_config_t cfg = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = bits,
    .channel_format = fmt,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
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
}

// Reports peak amplitude over a short listen, plus a few raw words so you can
// see whether bits are arriving at all.
void measure(const char* label, i2s_channel_fmt_t fmt, i2s_bits_per_sample_t bits) {
  startMic(fmt, bits);
  delay(150);  // let the DMA settle before trusting a reading

  int32_t peak = 0;
  int32_t nonZero = 0;
  int32_t firstRaw[4] = {0, 0, 0, 0};
  bool captured = false;

  for (int pass = 0; pass < 12; pass++) {
    size_t bytesRead = 0;
    i2s_read(MIC_PORT, buf, sizeof(buf), &bytesRead, portMAX_DELAY);
    int n = bytesRead / sizeof(int32_t);

    if (!captured && n >= 4) {
      for (int i = 0; i < 4; i++) firstRaw[i] = buf[i];
      captured = true;
    }
    for (int i = 0; i < n; i++) {
      // 24-bit sample sits in the top of the 32-bit word.
      int32_t s = buf[i] >> 8;
      if (s != 0) nonZero++;
      int32_t a = s < 0 ? -s : s;
      if (a > peak) peak = a;
    }
  }

  Serial.printf("%-28s peak=%-10ld nonZeroSamples=%-6ld raw[0..3]= %08lX %08lX %08lX %08lX\n",
                label, (long)peak, (long)nonZero,
                (unsigned long)firstRaw[0], (unsigned long)firstRaw[1],
                (unsigned long)firstRaw[2], (unsigned long)firstRaw[3]);
}

void setup() {
  Serial.begin(115200);
  delay(600);
  Serial.println("\nINMP441 diagnostic — make noise near the mic now\n");

  Serial.println("--- 32-bit slot (correct for INMP441) ---");
  measure("ONLY_LEFT  32-bit", I2S_CHANNEL_FMT_ONLY_LEFT,  I2S_BITS_PER_SAMPLE_32BIT);
  measure("ONLY_RIGHT 32-bit", I2S_CHANNEL_FMT_ONLY_RIGHT, I2S_BITS_PER_SAMPLE_32BIT);

  Serial.println("\n--- 16-bit slot (expected to fail; shown for contrast) ---");
  measure("ONLY_LEFT  16-bit", I2S_CHANNEL_FMT_ONLY_LEFT,  I2S_BITS_PER_SAMPLE_16BIT);
  measure("ONLY_RIGHT 16-bit", I2S_CHANNEL_FMT_ONLY_RIGHT, I2S_BITS_PER_SAMPLE_16BIT);

  Serial.println("\nHow to read this:");
  Serial.println("  A line with peak in the thousands+ and nonZeroSamples high = that config works.");
  Serial.println("  Use it in the kiosk sketch.");
  Serial.println("  All four at peak=0 and raw all 00000000 = no data on SD:");
  Serial.println("    check SD is on GPIO33, VDD on 3V3 (NOT 5V), and GND shared with the ESP32.");
  Serial.println("  raw words all FFFFFFFF = SD floating high; the pin is not actually connected.");
}

void loop() {
  delay(2000);
  measure("live ONLY_LEFT 32-bit", I2S_CHANNEL_FMT_ONLY_LEFT, I2S_BITS_PER_SAMPLE_32BIT);
}
