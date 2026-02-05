// config.h
#pragma once

// Pines
#define PIN_HX711_DOUT D6
#define PIN_HX711_SCK  D7
#define PIN_DHT        D5
#define PIN_LDR        A0

// ID del dispositivo
#define DEVICE_ID      "KPCL0033"

// WiFi por defecto
#define WIFI_SSID      "Jeivos"
#define WIFI_PASS      "jdayne212"

// MQTT Broker AWS IoT
#define MQTT_BROKER    "a3o1jhmmwxnm4z-ats.iot.us-east-2.amazonaws.com"
#define MQTT_PORT      8883

// Topics
#define TOPIC_STATUS   DEVICE_ID "/STATUS"
#define TOPIC_SENSORS  DEVICE_ID "/SENSORS"
#define TOPIC_CMD      DEVICE_ID "/cmd"

// Rutas de certificados (deben estar en la raíz de LittleFS: /data)
#define CERT_CA        "/AmazonRootCA1.pem"
#define CERT_CRT       "/certificate.pem.crt"
#define CERT_KEY       "/private.pem.key"

// Rangos y límites de Sensores
#define MAX_WEIGHT_G    1000.0f   // Gramos
#define MAX_LUX         500.0f    // Lux
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
