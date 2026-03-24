#pragma once

#include "sensors.h"

enum class DisplayScreen : uint8_t {
  kSensors = 0,
  kClock,
};

void displayInit();
void displayShowBoot();
void displayUpdate(const SensorData& data, bool wifiConnected, bool charging);
void displayUpdateClock(bool showDate, bool wifiConnected, int batteryLevel);
