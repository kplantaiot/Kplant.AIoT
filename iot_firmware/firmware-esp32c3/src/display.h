#pragma once

#include "sensors.h"

void displayInit();
void displayShowBoot();
void displayUpdate(const SensorData& data, bool wifiConnected, bool charging);
