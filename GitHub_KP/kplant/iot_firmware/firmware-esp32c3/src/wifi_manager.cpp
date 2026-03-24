#include "wifi_manager.h"

#include "config.h"

#include <WiFi.h>
#include <time.h>

namespace {
bool gConnected = false;
unsigned long gLastAttemptMs = 0;
constexpr unsigned long kReconnectIntervalMs = 10000UL;
}  // namespace

static void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  const unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startMs) < 12000UL) {
    delay(200);
  }

  gConnected = (WiFi.status() == WL_CONNECTED);
  gLastAttemptMs = millis();

  if (gConnected) {
    configTime(TZ_OFFSET_SEC, 0, NTP_SERVER);
  }
}

void wifiManagerInit() {
  connectWifi();
}

void wifiManagerLoop() {
  const bool nowConnected = (WiFi.status() == WL_CONNECTED);
  gConnected = nowConnected;

  if (!nowConnected && (millis() - gLastAttemptMs) > kReconnectIntervalMs) {
    connectWifi();
  }
}

bool isWifiConnected() {
  return gConnected;
}

String wifiLocalIP() {
  if (!gConnected) {
    return "";
  }
  return WiFi.localIP().toString();
}

String wifiSSID() {
  if (!gConnected) {
    return "";
  }
  return WiFi.SSID();
}
