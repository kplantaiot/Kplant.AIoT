#include "display.h"
#include "config.h"

#include <U8g2lib.h>
#include <Wire.h>
#include <math.h>
#include <time.h>

// SSD1306 72x40 — variant "ER" (the integrated OLED on ESP32-C3 SuperMini)
// HW I2C: (rotation, reset, SCL, SDA)
static U8G2_SSD1306_72X40_ER_F_HW_I2C u8g2(
    U8G2_R0, U8X8_PIN_NONE, I2C_SCL_PIN, I2C_SDA_PIN);

namespace {
// Display dimensions (72x40)
constexpr int kW = 72;
constexpr int kH = 40;

const char* soilTag(const char* condition) {
  if (strcmp(condition, "dry") == 0)  return "SEC";
  if (strcmp(condition, "wet") == 0)  return "MOJ";
  return "OK";
}

bool isTimeValid() {
  time_t now; time(&now);
  struct tm t; localtime_r(&now, &t);
  return t.tm_year >= 120;
}

const char* dayName(int wday) {
  switch (wday) {
    case 0: return "Domingo";
    case 1: return "Lunes";
    case 2: return "Martes";
    case 3: return "Miercoles";
    case 4: return "Jueves";
    case 5: return "Viernes";
    default: return "Sabado";
  }
}
}  // namespace

void displayInit() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  u8g2.begin();
}

void displayShowBoot() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 12, "Kplant");
  u8g2.drawStr(0, 26, "Conectando...");
  u8g2.sendBuffer();
}

void displayUpdate(const SensorData& data, bool wifiConnected, bool charging) {
  char line1[24], line2[24];

  // Line 1: Suelo + batería
  if (charging) {
    snprintf(line1, sizeof(line1), "S:%d%% CHG",
             static_cast<int>(roundf(data.soil_moisture)));
  } else {
    snprintf(line1, sizeof(line1), "S:%d%% B:%d%%",
             static_cast<int>(roundf(data.soil_moisture)),
             data.battery_level);
  }

  // Line 2: Temp / Hum / Lux
  if (isnan(data.temperature_c) || isnan(data.humidity_pct)) {
    snprintf(line2, sizeof(line2), "Sin sensor");
  } else {
    snprintf(line2, sizeof(line2), "%.1fC %.0f%% %dlx",
             data.temperature_c,
             data.humidity_pct,
             static_cast<int>(roundf(isnan(data.light_lux) ? 0 : data.light_lux)));
  }

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 10, line1);
  u8g2.drawStr(0, 24, line2);

  if (!wifiConnected) {
    u8g2.drawStr(48, 38, "NoNet");
  }

  u8g2.sendBuffer();
}

void displayUpdateClock(bool showDate, bool wifiConnected, int batteryLevel) {
  u8g2.clearBuffer();

  if (!isTimeValid()) {
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr(0, 12, "Sync NTP...");
    u8g2.drawStr(0, 26, wifiConnected ? "WiFi OK" : "Sin WiFi");
    u8g2.sendBuffer();
    return;
  }

  time_t now; time(&now);
  struct tm t; localtime_r(&now, &t);

  if (showDate) {
    // Day name centered (small font)
    const char* day = dayName(t.tm_wday);
    int dw = strlen(day) * 6;
    u8g2.setFont(u8g2_font_6x10_tf);
    u8g2.drawStr((kW - dw) / 2, 12, day);

    // DD/MM/YYYY centered (small font — 10 chars × 6 = 60px fits in 72)
    char dateBuf[11];
    snprintf(dateBuf, sizeof(dateBuf), "%02d/%02d/%04d",
             t.tm_mday, t.tm_mon + 1, t.tm_year + 1900);
    int dw2 = 10 * 6;
    u8g2.drawStr((kW - dw2) / 2, 30, dateBuf);

  } else {
    // HH:MM — large font centered
    // u8g2_font_10x20_tf: 10px wide, 20px tall, baseline ~20px from top
    char timeBuf[6];
    snprintf(timeBuf, sizeof(timeBuf), "%02d:%02d", t.tm_hour, t.tm_min);
    u8g2.setFont(u8g2_font_10x20_tf);
    int tw = 5 * 10;  // 5 chars × 10px
    u8g2.drawStr((kW - tw) / 2, 26, timeBuf);

    // Status bar bottom (small font)
    char statusBuf[16];
    snprintf(statusBuf, sizeof(statusBuf), "%s B:%d%%",
             wifiConnected ? "WiFi" : "NoNet", batteryLevel);
    u8g2.setFont(u8g2_font_5x7_tf);
    u8g2.drawStr(0, 39, statusBuf);
  }

  u8g2.sendBuffer();
}
