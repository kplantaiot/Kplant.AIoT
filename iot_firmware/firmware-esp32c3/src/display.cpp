#include "display.h"

#include "config.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include <math.h>

namespace {
constexpr int kDisplayWidth = 128;
constexpr int kDisplayHeight = 32;
constexpr int kDisplayResetPin = -1;

Adafruit_SSD1306 gDisplay(kDisplayWidth, kDisplayHeight, &Wire, kDisplayResetPin);

const char* soilTag(const char* condition) {
  if (strcmp(condition, "dry") == 0) {
    return "DRY";
  }
  if (strcmp(condition, "wet") == 0) {
    return "WET";
  }
  return "OK";
}
}  // namespace

void displayInit() {
  gDisplay.begin(SSD1306_SWITCHCAPVCC, SSD1306_I2C_ADDR);
  gDisplay.clearDisplay();
  gDisplay.setTextSize(1);
  gDisplay.setTextColor(SSD1306_WHITE);
  gDisplay.display();
}

void displayShowBoot() {
  gDisplay.clearDisplay();
  gDisplay.setCursor(0, 0);
  gDisplay.println("Kplant");
  gDisplay.println("Conectando...");
  gDisplay.display();
}

void displayUpdate(const SensorData& data, bool wifiConnected, bool charging) {
  gDisplay.clearDisplay();
  gDisplay.setCursor(0, 0);

  // Line 1: Soil + battery/charge status
  gDisplay.print("Suelo:");
  gDisplay.print(static_cast<int>(roundf(data.soil_moisture)));
  gDisplay.print("% ");
  gDisplay.print("[");
  gDisplay.print(soilTag(data.soil_condition));
  gDisplay.print("] ");

  if (charging) {
    gDisplay.print("CHG...");
  } else if (data.battery_level < 20) {
    gDisplay.print("BAT!");
  } else {
    gDisplay.print("BAT:");
    gDisplay.print(data.battery_level);
    gDisplay.print("%");
  }

  // Line 2: Temp/Hum/Lux
  gDisplay.setCursor(0, 16);
  if (isnan(data.temperature_c) || isnan(data.humidity_pct) || isnan(data.light_lux)) {
    gDisplay.print("Error sensor");
  } else {
    gDisplay.print(data.temperature_c, 1);
    gDisplay.print("C ");
    gDisplay.print(data.humidity_pct, 0);
    gDisplay.print("% ");
    gDisplay.print(static_cast<int>(roundf(data.light_lux)));
    gDisplay.print("lx");
  }

  if (!wifiConnected) {
    gDisplay.setCursor(98, 16);
    gDisplay.print("NoNet");
  }

  gDisplay.display();
}
