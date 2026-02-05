// main.cpp
// KittyPaw KPCL0040 - ESP32-CAM with sensors and camera streaming

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include "config.h"
#include "wifi_manager.h"
#include "mqtt_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include "camera_manager.h"

// Intervalos de publicacion (milisegundos)
#define SENSOR_PUBLISH_INTERVAL 20000
#define STATUS_PUBLISH_INTERVAL 20000

// Timers
static unsigned long lastSensorPublishTime = 0;
static unsigned long lastStatusPublishTime = 0;

// Estado del sistema
static int published_samples_count = 0;
static String last_sensor_health = "Initializing";
static bool cameraOk = false;

// Publica el estado detallado del dispositivo
void publishDeviceStatus() {
    bool wifiOk = isWifiConnected();
    bool mqttOk = isMqttConnected();
    const char* wifi_status_str = wifiOk ? "Conectado" : "Desconectado";
    const char* device_status_str = "Offline";

    // Determinar si el dispositivo esta Online
    if (wifiOk && mqttOk && published_samples_count > 3) {
        device_status_str = "Online";
    }

    // Crear payload JSON
    StaticJsonDocument<256> doc;
    doc["wifi_status"] = wifi_status_str;
    doc["KPCL0040"] = device_status_str;
    doc["sensor_health"] = last_sensor_health;
    doc["camera_status"] = cameraOk ? "OK" : "ERROR";

    // Agregar URL de streaming si esta disponible
    if (cameraOk && wifiOk) {
        doc["stream_url"] = getCameraStreamUrl();
    }

    char payload[256];
    serializeJson(doc, payload);

    mqttManagerPublishStatus(payload);
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n========================================");
    Serial.println("  KittyPaw KPCL0040 - ESP32-CAM");
    Serial.println("========================================");
    Serial.println("Iniciando sistema...\n");

    // 1. Inicializar indicador LED
    ledIndicatorInit();

    // 2. Conectar a WiFi
    Serial.println("[1/5] Conectando a WiFi...");
    wifiManagerInit();

    // 3. Inicializar MQTT
    Serial.println("[2/5] Inicializando MQTT...");
    mqttManagerInit();

    // 4. Inicializar sensores
    Serial.println("[3/5] Inicializando sensores...");
    sensorsInit();

    // 5. Inicializar camara
    Serial.println("[4/5] Inicializando camara...");
    cameraOk = cameraInit();

    // 6. Iniciar servidor de streaming (si la camara esta OK)
    Serial.println("[5/5] Iniciando servidor de streaming...");
    if (cameraOk) {
        cameraStartServer();
    } else {
        Serial.println("Advertencia: Camara no disponible, streaming deshabilitado");
    }

    Serial.println("\n========================================");
    Serial.println("  Inicializacion completada");
    Serial.println("========================================");
    if (isWifiConnected()) {
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        if (cameraOk) {
            Serial.print("Stream: http://");
            Serial.print(WiFi.localIP());
            Serial.println("/stream");
        }
    }
    Serial.println("========================================\n");
}

void loop() {
    unsigned long now = millis();

    // Mantener conexion WiFi
    wifiManagerLoop();

    // Actualizar parpadeo LED
    handleLedIndicator();

    // Mantener conexion MQTT
    mqttManagerLoop();

    // Publicar datos de sensores periodicamente
    if (now - lastSensorPublishTime > SENSOR_PUBLISH_INTERVAL) {
        lastSensorPublishTime = now;
        last_sensor_health = sensorsReadAndPublish();

        if (isMqttConnected()) {
            published_samples_count++;
        }
    }

    // Publicar estado del dispositivo periodicamente
    if (now - lastStatusPublishTime > STATUS_PUBLISH_INTERVAL) {
        lastStatusPublishTime = now;
        if (isMqttConnected()) {
            publishDeviceStatus();
        }
    }
}
