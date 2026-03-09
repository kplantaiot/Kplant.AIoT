#include "sensors.h"

#include "config.h"

#include <Adafruit_AHTX0.h>
#include <Adafruit_VEML7700.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <math.h>
#include <time.h>

namespace {
Adafruit_AHTX0 gAht10;
Adafruit_VEML7700 gVeml7700;

bool gAhtOk = false;
bool gVemlOk = false;

float clampf(float value, float minValue, float maxValue) {
  return fmaxf(minValue, fminf(maxValue, value));
}

float round2(float value) {
  return roundf(value * 100.0f) / 100.0f;
}

String iso8601NowUTC() {
  time_t now = time(nullptr);
  if (now < 100000) {
    return "1970-01-01T00:00:00Z";
  }

  struct tm tmUtc;
  gmtime_r(&now, &tmUtc);

  char buffer[21];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &tmUtc);
  return String(buffer);
}

float readSoilMoisturePct() {
  int adc = analogRead(PIN_SOIL_ADC);  // 0..4095 in 12-bit mode
  const float denominator = static_cast<float>(SOIL_ADC_DRY - SOIL_ADC_WET);

  if (denominator == 0.0f) {
    return 0.0f;
  }

  // WET -> 100%, DRY -> 0%
  float pct = (static_cast<float>(SOIL_ADC_DRY - adc) * 100.0f) / denominator;
  return clampf(pct, 0.0f, 100.0f);
}

float readBatteryVoltage() {
  int mv = analogReadMilliVolts(PIN_BATT_ADC);
  return (static_cast<float>(mv) * BATT_DIVIDER) / 1000.0f;
}

int batteryLevelPct(float voltage) {
  float pct = ((voltage - BATT_V_MIN) / (BATT_V_MAX - BATT_V_MIN)) * 100.0f;
  pct = clampf(pct, 0.0f, 100.0f);
  return static_cast<int>(roundf(pct));
}
}  // namespace

void sensorsInit() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_SOIL_ADC, ADC_11db);
  analogSetPinAttenuation(PIN_BATT_ADC, ADC_11db);

  gAhtOk = gAht10.begin(&Wire, AHT10_I2C_ADDR);

  gVemlOk = gVeml7700.begin();
  if (gVemlOk) {
    gVeml7700.setGain(VEML7700_GAIN_1);
    gVeml7700.setIntegrationTime(VEML7700_IT_100MS);
  }
}

const char* sensorsSoilCondition(float soilPct) {
  if (soilPct < 30.0f) {
    return "dry";
  }
  if (soilPct <= 70.0f) {
    return "optimal";
  }
  return "wet";
}

const char* sensorsLightCondition(float lux) {
  if (lux < 100.0f) {
    return "dark";
  }
  if (lux < 500.0f) {
    return "low";
  }
  if (lux < 2000.0f) {
    return "partial_shade";
  }
  if (lux < 5000.0f) {
    return "bright";
  }
  return "full_sun";
}

SensorData sensorsReadAll() {
  SensorData data{};

  data.timestamp = iso8601NowUTC();

  data.soil_moisture = round2(readSoilMoisturePct());
  data.soil_condition = sensorsSoilCondition(data.soil_moisture);

  data.temperature_c = NAN;
  data.humidity_pct = NAN;
  if (gAhtOk) {
    sensors_event_t humidityEvent;
    sensors_event_t tempEvent;
    gAht10.getEvent(&humidityEvent, &tempEvent);
    data.temperature_c = round2(tempEvent.temperature);
    data.humidity_pct = round2(humidityEvent.relative_humidity);
  }

  data.light_lux = NAN;
  data.light_percent = NAN;
  if (gVemlOk) {
    float lux = gVeml7700.readLux();
    lux = fmaxf(lux, 0.0f);
    data.light_lux = round2(lux);
    data.light_percent = round2(clampf((lux / LIGHT_LUX_MAX) * 100.0f, 0.0f, 100.0f));
    data.light_condition = sensorsLightCondition(lux);
  } else {
    data.light_condition = "dark";
  }

  data.battery_voltage = round2(readBatteryVoltage());
  data.battery_level = batteryLevelPct(data.battery_voltage);

  if (gAhtOk && gVemlOk) {
    data.sensor_health = "ok";
  } else if (!gAhtOk && !gVemlOk) {
    data.sensor_health = "err_multiple";
  } else if (!gAhtOk) {
    data.sensor_health = "err_aht10";
  } else {
    data.sensor_health = "err_veml7700";
  }

  return data;
}

String sensorsBuildSensorsPayload(const SensorData& data) {
  JsonDocument doc;

  doc["timestamp"] = data.timestamp;
  doc["soil_moisture"] = data.soil_moisture;
  doc["soil_condition"] = data.soil_condition;

  if (isnan(data.temperature_c)) {
    doc["temp"] = nullptr;
  } else {
    doc["temp"] = data.temperature_c;
  }

  if (isnan(data.humidity_pct)) {
    doc["hum"] = nullptr;
  } else {
    doc["hum"] = data.humidity_pct;
  }

  JsonObject light = doc["light"].to<JsonObject>();
  if (isnan(data.light_lux)) {
    light["lux"] = nullptr;
    light["%"] = nullptr;
    light["condition"] = nullptr;
  } else {
    light["lux"] = data.light_lux;
    light["%"] = data.light_percent;
    light["condition"] = data.light_condition;
  }

  JsonObject battery = doc["battery"].to<JsonObject>();
  battery["voltage"] = data.battery_voltage;
  battery["level"] = data.battery_level;

  String payload;
  serializeJson(doc, payload);
  return payload;
}
