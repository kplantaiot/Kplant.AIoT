#include <Arduino.h>
#include <ArduinoJson.h>
#include "wifi_manager.h"
#include "mqtt_manager.h"
#include "sensors.h"

// Macros para convertir macro a string literal
#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)

// Intervalos de publicación (en milisegundos)
#define SENSOR_PUBLISH_INTERVAL 3000
#define STATUS_PUBLISH_INTERVAL 5000 // Publicar estado cada 5 segundos

// Timers
static unsigned long lastSensorPublishTime = 0;
static unsigned long lastStatusPublishTime = 0;

// Contador de muestras publicadas y estado de sensores
static int published_samples_count = 0;
static String last_sensor_health = "Initializing";

// Nueva función para publicar el estado detallado del dispositivo
void publishDeviceStatus() {
    bool wifiOk = isWifiConnected();
    bool mqttOk = isMqttConnected();
    const char* wifi_status_str = wifiOk ? "Conectado" : "Desconectado";
    const char* device_status_str = "Offline";

    // Lógica para determinar si el estado es "Online"
    if (wifiOk && mqttOk && published_samples_count > 3) {
        device_status_str = "Online";
    }

    // Crear el payload JSON
    StaticJsonDocument<256> doc;
    doc["wifi_status"] = wifi_status_str;
    doc[TOSTRING(DEVICE_ID)] = device_status_str; // Cambiado: DEVICE_ID como clave para el estado del dispositivo
    doc["sensor_health"] = last_sensor_health;
    
    char payload[256];
    serializeJson(doc, payload);

    // Publicar el estado
    mqttManagerPublishStatus(payload);
}


void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[KPCL0033] Initializing...");

  // 1. Conectar a WiFi
  wifiManagerInit();

  // 2. Iniciar el gestor de MQTT (carga certificados, etc.)
  mqttManagerInit();

  // 3. Iniciar los sensores
  sensorsInit();

  Serial.println("[KPCL0033] Initialization complete.");
}

void loop() {
  unsigned long now = millis();

  // Mantener la conexión WiFi
  wifiManagerLoop();

  // Mantener la conexión MQTT y procesar mensajes entrantes
  mqttManagerLoop();

  // Publicar datos de sensores periódicamente
  if (now - lastSensorPublishTime > SENSOR_PUBLISH_INTERVAL) {
    lastSensorPublishTime = now;
    last_sensor_health = sensorsReadAndPublish(); // Capturar el estado de los sensores
    // Incrementar contador solo si se pudo haber publicado (MQTT conectado)
    if (isMqttConnected()) {
      published_samples_count++;
    }
  }

  // Publicar estado del dispositivo periódicamente
  if (now - lastStatusPublishTime > STATUS_PUBLISH_INTERVAL) {
    lastStatusPublishTime = now;
    if (isMqttConnected()) { // Solo intentar publicar si hay conexión
      publishDeviceStatus();
    }
  }
}