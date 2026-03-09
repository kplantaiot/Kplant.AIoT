#pragma once

#include <Arduino.h>

struct SensorData {
  String timestamp;
  float soil_moisture;
  const char* soil_condition;
  float temperature_c;
  float humidity_pct;
  float light_lux;
  float light_percent;
  const char* light_condition;
  float battery_voltage;
  int battery_level;
  const char* sensor_health;
};

void sensorsInit();
SensorData sensorsReadAll();
String sensorsBuildSensorsPayload(const SensorData& data);

const char* sensorsSoilCondition(float soilPct);
const char* sensorsLightCondition(float lux);
