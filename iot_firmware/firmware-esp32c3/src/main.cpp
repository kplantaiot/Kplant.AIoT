#include "config.h"
#include "display.h"
#include "mqtt_client.h"
#include "sensors.h"
#include "wifi_manager.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace {
unsigned long gLastSensorsMs = 0;
unsigned long gLastStatusMs  = 0;
unsigned long gLastDisplayMs = 0;

SensorData gLastData{};
bool gHasReadOnce = false;
float gPrevBatteryVoltage = 0.0f;
bool gCharging = false;

// ── Display screen state ──────────────────────────────────────────────────────
DisplayScreen gScreen    = DisplayScreen::kSensors;
bool gDateActive         = false;
unsigned long gDateStartMs = 0;

// ── Button state ──────────────────────────────────────────────────────────────
bool gBtnPrev        = false;
unsigned long gBtnPressMs = 0;

String buildStatusPayload() {
  JsonDocument doc;
  const bool wifiOk = isWifiConnected();
  const bool mqttOk = isMqttConnected();

  doc["wifi_status"]    = wifiOk ? "connected" : "disconnected";
  doc["wifi_ssid"]      = wifiSSID();
  doc["wifi_ip"]        = wifiLocalIP();
  doc[DEVICE_ID]        = (wifiOk && mqttOk) ? "online" : "offline";
  doc["sensor_health"]  = gHasReadOnce ? gLastData.sensor_health : "init";
  doc["device_type"]    = DEVICE_TYPE;
  doc["device_model"]   = DEVICE_MODEL;
  doc["battery_level"]  = gHasReadOnce ? gLastData.battery_level  : 0;
  doc["battery_voltage"]= gHasReadOnce ? gLastData.battery_voltage: 0.0f;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

void updateChargingState(float currentVoltage) {
  if (!gHasReadOnce) {
    gCharging = false;
    gPrevBatteryVoltage = currentVoltage;
    return;
  }
  gCharging = (currentVoltage - gPrevBatteryVoltage) >= 0.02f;
  gPrevBatteryVoltage = currentVoltage;
}

void refreshDisplay() {
  if (gScreen == DisplayScreen::kClock) {
    displayUpdateClock(gDateActive, isWifiConnected(),
                       gHasReadOnce ? gLastData.battery_level : 0);
  } else if (gHasReadOnce) {
    displayUpdate(gLastData, isWifiConnected(), gCharging);
  }
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_BUTTON, INPUT_PULLUP);

  displayInit();
  displayShowBoot();

  wifiManagerInit();
  mqttClientInit();
  sensorsInit();
}

void loop() {
  const unsigned long now = millis();

  wifiManagerLoop();
  mqttClientLoop();

  // ── Button handling ─────────────────────────────────────────────────────────
  const bool btnNow = (digitalRead(PIN_BUTTON) == LOW);

  if (btnNow && !gBtnPrev) {
    // Falling edge — record press start
    gBtnPressMs = now;
  }

  if (!btnNow && gBtnPrev) {
    // Rising edge — evaluate hold duration
    const unsigned long held = now - gBtnPressMs;

    if (held >= BUTTON_LONG_PRESS_MS) {
      // Long press: show date if clock is active
      if (gScreen == DisplayScreen::kClock) {
        gDateActive  = true;
        gDateStartMs = now;
        refreshDisplay();
      }
    } else {
      // Short press: toggle sensor ↔ clock
      gScreen     = (gScreen == DisplayScreen::kSensors)
                    ? DisplayScreen::kClock
                    : DisplayScreen::kSensors;
      gDateActive = false;
      refreshDisplay();
    }
  }

  gBtnPrev = btnNow;

  // ── Auto-dismiss date after DATE_SHOW_MS ───────────────────────────────────
  if (gDateActive && (now - gDateStartMs) >= DATE_SHOW_MS) {
    gDateActive = false;
    refreshDisplay();
  }

  // ── Periodic display refresh ───────────────────────────────────────────────
  if ((now - gLastDisplayMs) >= DISPLAY_INTERVAL_MS) {
    gLastDisplayMs = now;
    refreshDisplay();
  }

  // ── Sensor read + publish ─────────────────────────────────────────────────
  if ((now - gLastSensorsMs) >= SENSORS_INTERVAL_MS) {
    gLastSensorsMs = now;

    SensorData data = sensorsReadAll();
    updateChargingState(data.battery_voltage);
    gLastData    = data;
    gHasReadOnce = true;

    if (gScreen == DisplayScreen::kSensors) {
      displayUpdate(data, isWifiConnected(), gCharging);
    }

    const String sensorsPayload = sensorsBuildSensorsPayload(data);
    mqttPublishSensors(sensorsPayload);
  }

  // ── Status publish ────────────────────────────────────────────────────────
  if ((now - gLastStatusMs) >= STATUS_INTERVAL_MS) {
    gLastStatusMs = now;
    const String statusPayload = buildStatusPayload();
    mqttPublishStatus(statusPayload);
  }
}
