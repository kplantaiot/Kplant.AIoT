// config.h
#pragma once

// Pines para NodeMCU ESP8266
#define PIN_LED_STATUS LED_BUILTIN  // GPIO2 - LED integrado (lógica invertida)
#define PIN_HX711_DOUT 12           // D6 (GPIO12)
#define PIN_HX711_SCK  13           // D7 (GPIO13)
#define PIN_DHT        14           // D5 (GPIO14)
#define PIN_LDR        A0           // Único pin ADC en ESP8266

// ID del dispositivo
#define DEVICE_ID      "KPCL0035"

// WiFi por defecto
#define WIFI_SSID      "Jeivos"
#define WIFI_PASS      "jdayne212"

// MQTT Broker HiveMQ Cloud
#define MQTT_BROKER    "cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USERNAME  "Kittypau1"
#define MQTT_PASSWORD  "Kittypau1234"

// Topics
#define TOPIC_STATUS   DEVICE_ID "/STATUS"
#define TOPIC_SENSORS  DEVICE_ID "/SENSORS"
#define TOPIC_CMD      DEVICE_ID "/cmd"

// Rangos y límites de Sensores
#define MAX_WEIGHT_G    1000.0f   // Gramos
#define LIGHT_MIN_LUX   0.0f      // Lux mínimo para normalización
#define LIGHT_MAX_LUX   1000.0f   // Lux máximo para normalización
#define MAX_TEMP_C      100.0f    // Grados Celsius
#define MAX_HUMIDITY_PC 100.0f    // Porcentaje
#define ADC_MAX_VALUE   1023.0f   // Valor máximo del ADC en ESP8266 (10-bit)

// Calibración de Sensores
// Este valor es un punto de partida. Debes calibrarlo para tu celda de carga específica.
// Procedimiento:
// 1. Descomenta el código de calibración en `sensors.cpp`.
// 2. Sube el firmware y abre el monitor serie.
// 3. Con la báscula vacía, obtén la lectura del "Valor en bruto".
// 4. Coloca un objeto de peso conocido (ej. 100g) y obtén la nueva lectura.
// 5. Calcula: factor = (lectura_con_peso - lectura_sin_peso) / peso_conocido_en_gramos.
// 6. Coloca el factor calculado aquí.
#define HX711_CALIBRATION_FACTOR 400.0f

// Archivo de calibración
#define CALIBRATION_FILE "/calibration.json"
