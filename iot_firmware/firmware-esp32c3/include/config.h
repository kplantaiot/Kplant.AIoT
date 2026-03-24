#pragma once

// config.h - Kplant IoT (ESP32-C3 SuperMini)

#define PROJECT_NAME "Kplant"
#define FIRMWARE_VERSION "1.0.0"

// --- ESP32-C3 SuperMini pins ---
#define PIN_LED_STATUS 8  // GPIO8 - onboard LED (inverted: LOW=on)
#define PIN_SOIL_ADC 0    // GPIO0 - capacitive soil moisture sensor (analog)
#define PIN_BATT_ADC 3    // GPIO3 - battery voltage via 1:1 divider
#define I2C_SDA_PIN 5     // GPIO5 - I2C SDA (AHT10 + VEML7700 + SSD1306)
#define I2C_SCL_PIN 6     // GPIO6 - I2C SCL (AHT10 + VEML7700 + SSD1306)

// --- I2C addresses ---
#define AHT10_I2C_ADDR 0x38
#define VEML7700_I2C_ADDR 0x10
#define SSD1306_I2C_ADDR 0x3C

// --- Device metadata ---
#define DEVICE_ID "KPPL0001"
#define DEVICE_TYPE "plant_monitor"
#define DEVICE_MODEL "ESP32-C3 SuperMini"

// --- WiFi defaults (replace per device/environment) ---
#define WIFI_SSID "Suarez_Mujica_891"
#define WIFI_PASS "SuarezMujica891"

// --- MQTT HiveMQ Cloud ---
#define MQTT_BROKER "175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "Kplant_broker"
#define MQTT_PASS "Kplant1234"

// --- MQTT topics ---
#define TOPIC_STATUS DEVICE_ID "/STATUS"
#define TOPIC_SENSORS DEVICE_ID "/SENSORS"
#define TOPIC_CMD DEVICE_ID "/cmd"

// --- Soil calibration (ESP32 ADC 12-bit: 0-4095) ---
// Calibrate with dry and fully wet soil for each sensor batch.
#define SOIL_ADC_DRY 2800
#define SOIL_ADC_WET 1200

// --- Light normalization (indoor scale) ---
#define LIGHT_LUX_MAX 10000.0f

// --- Battery monitoring ---
// Divider 1:1 (R1=R2=100k): Vgpio = Vbat / 2
// Use analogReadMilliVolts(PIN_BATT_ADC), then:
// battery_voltage = (mV * BATT_DIVIDER) / 1000.0
#define BATT_V_MIN 3.0f
#define BATT_V_MAX 4.2f
#define BATT_DIVIDER 2.0f

// --- Button ---
#define PIN_BUTTON 9             // GPIO9 - BOOT button (active LOW, internal pull-up)
#define BUTTON_LONG_PRESS_MS 3000UL

// --- NTP / Time ---
#define NTP_SERVER "pool.ntp.org"
#define TZ_OFFSET_SEC (-3 * 3600)  // UTC-3 Chile
#define DATE_SHOW_MS 5000UL        // How long to show date on long press

// --- Timing ---
#define SENSORS_INTERVAL_MS 60000UL  // SENSORS every 60s
#define STATUS_INTERVAL_MS 30000UL   // STATUS every 30s
#define DISPLAY_INTERVAL_MS 1000UL   // Display refresh (1s for clock)
