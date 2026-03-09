#pragma once

#include <Arduino.h>

void wifiManagerInit();
void wifiManagerLoop();
bool isWifiConnected();
String wifiLocalIP();
String wifiSSID();
