// mqtt_manager.cpp
// MQTT Manager for ESP32 with HiveMQ Cloud using native WiFiClientSecure

#include "mqtt_manager.h"
#include "config.h"
#include "wifi_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <time.h>
#include <ArduinoJson.h>

// ESP32 native WiFiClientSecure
WiFiClientSecure net;
PubSubClient mqttClient(net);

static bool mqttConnected = false;
static bool timeSynchronized = false;

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    if (t.endsWith("/cmd")) {
        Serial.println("Comando MQTT recibido.");
        blinkLED(2, 100);

        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, payload, length);

        if (error) {
            Serial.print("deserializeJson() fallo: ");
            Serial.println(error.c_str());
            return;
        }

        const char* command = doc["command"];
        if (command && strcmp(command, "ADDWIFI") == 0) {
            const char* ssid = doc["ssid"];
            const char* pass = doc["pass"];

            if (ssid && pass) {
                Serial.print("Anadiendo nueva red WiFi: ");
                Serial.println(ssid);
                wifiManagerAddSSID(ssid, pass);
            } else {
                Serial.println("Error: Faltan 'ssid' o 'pass' en el comando ADDWIFI.");
            }
        } else if (command && strcmp(command, "CALIBRATE_WEIGHT") == 0) {
            const char* action = doc["action"];
            if (action) {
                if (strcmp(action, "tare") == 0) {
                    Serial.println("Comando CALIBRATE_WEIGHT: TARE.");
                    sensorsTareWeight();
                } else if (strcmp(action, "set_scale") == 0) {
                    float factor = doc["factor"];
                    if (factor != 0) {
                        Serial.print("Comando CALIBRATE_WEIGHT: SET_SCALE con factor ");
                        Serial.println(factor);
                        sensorsSetCalibrationFactor(factor);
                    } else {
                        Serial.println("Error: CALIBRATE_WEIGHT SET_SCALE requiere 'factor'.");
                    }
                } else {
                    Serial.print("Error: Accion desconocida para CALIBRATE_WEIGHT: ");
                    Serial.println(action);
                }
            } else {
                Serial.println("Error: CALIBRATE_WEIGHT requiere 'action'.");
            }
        } else if (command && strcmp(command, "REMOVEWIFI") == 0) {
            const char* ssid = doc["ssid"];
            if (ssid) {
                Serial.print("Comando REMOVEWIFI: Eliminando red WiFi ");
                Serial.println(ssid);
                wifiManagerRemoveSSID(ssid);
            } else {
                Serial.println("Error: REMOVEWIFI requiere 'ssid'.");
            }
        } else {
            Serial.println("Comando desconocido o no especificado.");
        }
    }
}

void mqttManagerInit() {
    // HiveMQ Cloud usa TLS con autenticacion por usuario/contraseña
    // setInsecure() permite TLS sin verificar el certificado del servidor
    net.setInsecure();

    // Configurar cliente MQTT con buffer mas grande
    mqttClient.setBufferSize(MQTT_BUFFER_SIZE);
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    Serial.println("MQTT Manager inicializado para HiveMQ Cloud");
    Serial.print("  Broker: ");
    Serial.println(MQTT_BROKER);
    Serial.print("  Puerto: ");
    Serial.println(MQTT_PORT);
}

void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return;

    // Sincronizar hora por NTP (requerido para validacion de certificados)
    if (!timeSynchronized) {
        Serial.print("Sincronizando hora con NTP...");
        // Zona horaria Chile: CLT (UTC-4) con horario de verano CLST (UTC-3)
        configTzTime("CLT4CLST,M9.1.6/24,M4.1.6/24", "pool.ntp.org", "time.nist.gov");

        time_t now = time(nullptr);
        int attempts = 0;
        while (now < 1510644967 && attempts < 20) {
            delay(500);
            now = time(nullptr);
            Serial.print(".");
            attempts++;
        }

        if (now >= 1510644967) {
            Serial.println("\nHora sincronizada.");
            struct tm timeinfo;
            localtime_r(&now, &timeinfo);
            Serial.print("Hora actual (Chile): ");
            Serial.print(asctime(&timeinfo));
            timeSynchronized = true;
        } else {
            Serial.println("\nAdvertencia: No se pudo sincronizar la hora NTP");
        }
    }

    static int mqtt_retries = 0;

    while (!mqttClient.connected()) {
        if (WiFi.status() != WL_CONNECTED) {
            return;
        }

        Serial.print("Intentando conexion MQTT a HiveMQ Cloud...");
        String clientId = DEVICE_ID;

        if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
            Serial.println("Conectado!");
            mqtt_retries = 0;
            mqttConnected = true;
            mqttClient.subscribe(TOPIC_CMD);
            blinkLED(2, 100);
            Serial.print("Suscrito a: ");
            Serial.println(TOPIC_CMD);
        } else {
            mqtt_retries++;
            Serial.print(" Fallo, rc=");
            Serial.print(mqttClient.state());
            Serial.print(" (Intento ");
            Serial.print(mqtt_retries);
            Serial.println(")");

            // Diagnostico de errores comunes
            switch (mqttClient.state()) {
                case -4: Serial.println("  -> MQTT_CONNECTION_TIMEOUT"); break;
                case -3: Serial.println("  -> MQTT_CONNECTION_LOST"); break;
                case -2: Serial.println("  -> MQTT_CONNECT_FAILED"); break;
                case -1: Serial.println("  -> MQTT_DISCONNECTED"); break;
                case 1: Serial.println("  -> MQTT_CONNECT_BAD_PROTOCOL"); break;
                case 2: Serial.println("  -> MQTT_CONNECT_BAD_CLIENT_ID"); break;
                case 3: Serial.println("  -> MQTT_CONNECT_UNAVAILABLE"); break;
                case 4: Serial.println("  -> MQTT_CONNECT_BAD_CREDENTIALS"); break;
                case 5: Serial.println("  -> MQTT_CONNECT_UNAUTHORIZED"); break;
            }

            if (mqtt_retries >= 5) {
                Serial.println("Fallo persistente de MQTT. Forzando reconexion WiFi...");
                WiFi.disconnect();
                mqtt_retries = 0;
                return;
            }

            delay(3000);
        }
    }
}

void mqttManagerLoop() {
    if (!mqttClient.connected()) {
        mqttConnected = false;
        reconnectMQTT();
    }
    mqttClient.loop();
}

void mqttManagerPublishStatus(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_STATUS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_STATUS, payload, true);
        blinkLED(1, 100);
    }
}

void mqttManagerPublishSensorData(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_SENSORS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_SENSORS, payload, false);
        blinkLED(1, 100);
    }
}

bool isMqttConnected() {
    return mqttClient.connected();
}
