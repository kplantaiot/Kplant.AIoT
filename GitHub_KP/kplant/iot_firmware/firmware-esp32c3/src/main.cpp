#include "config.h"
#include "display.h"
#include "mqtt_client.h"
#include "sensors.h"
#include "wifi_manager.h"

#include <Arduino.h>
#include <ArduinoJson.h>

namespace {
unsigned long gLastSensorsMs = 0;
unsigned long gLastStatusMs = 0;

SensorData gLastData{};
bool gHasReadOnce = false;
float gPrevBatteryVoltage = 0.0f;
bool gCharging = false;

String buildStatusPayload() {
  JsonDocument doc;
  const bool wifiOk = isWifiConnected();
  const bool mqttOk = isMqttConnected();

  doc["wifi_status"] = wifiOk ? "connected" : "disconnected";
  doc["wifi_ssid"] = wifiSSID();
  doc["wifi_ip"] = wifiLocalIP();
  doc[DEVICE_ID] = (wifiOk && mqttOk) ? "online" : "offline";
  doc["sensor_health"] = gHasReadOnce ? gLastData.sensor_health : "init";
  doc["device_type"] = DEVICE_TYPE;
  doc["device_model"] = DEVICE_MODEL;
  doc["battery_level"] = gHasReadOnce ? gLastData.battery_level : 0;
  doc["battery_voltage"] = gHasReadOnce ? gLastData.battery_voltage : 0.0f;

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

  // Infer charging from increasing voltage trend between cycles.
  gCharging = (currentVoltage - gPrevBatteryVoltage) >= 0.02f;
  gPrevBatteryVoltage = currentVoltage;
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);

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

  if ((now - gLastSensorsMs) >= SENSORS_INTERVAL_MS) {
    gLastSensorsMs = now;

    SensorData data = sensorsReadAll();
    updateChargingState(data.battery_voltage);
    gLastData = data;
    gHasReadOnce = true;

    displayUpdate(data, isWifiConnected(), gCharging);

    const String sensorsPayload = sensorsBuildSensorsPayload(data);
    mqttPublishSensors(sensorsPayload);
  }

  if ((now - gLastStatusMs) >= STATUS_INTERVAL_MS) {
    gLastStatusMs = now;
    const String statusPayload = buildStatusPayload();
    mqttPublishStatus(statusPayload);
  }
}
