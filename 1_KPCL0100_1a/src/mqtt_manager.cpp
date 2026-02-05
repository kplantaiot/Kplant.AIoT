
#include "mqtt_manager.h"
#include "config.h"
#include "wifi_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include "camera_manager.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <FS.h>
#include <LittleFS.h>
#include <time.h>                       // Para NTP

#include <ArduinoJson.h>                  // Para parsear JSON

WiFiClientSecure net;
PubSubClient mqttClient(net);

static bool mqttConnected = false;
static bool timeSynchronized = false;   // Flag para sincronizar la hora solo una vez

// Declaración anticipada para la función que toma y publica la foto
void takeAndPublishPhoto();

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    if (t.endsWith("/cmd")) {
        Serial.println("Comando MQTT recibido.");
        blinkLED(2, 100); // Dos parpadeos para suscripción
        
        StaticJsonDocument<256> doc;
        DeserializationError error = deserializeJson(doc, payload, length);

        if (error) {
            Serial.print("deserializeJson() falló: ");
            Serial.println(error.c_str());
            return;
        }

        const char* command = doc["command"];
        if (command && strcmp(command, "ADDWIFI") == 0) {
            const char* ssid = doc["ssid"];
            const char* pass = doc["pass"];

            if (ssid && pass) {
                Serial.print("Añadiendo nueva red WiFi: ");
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
                    Serial.print("Error: Acción desconocida para CALIBRATE_WEIGHT: ");
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
                    } else if (command && strcmp(command, "TAKE_PHOTO") == 0) {
                        Serial.println("Comando TAKE_PHOTO recibido.");
                        takeAndPublishPhoto();
                    } else {
                        Serial.println("Comando desconocido o no especificado.");
                    }
                }}

void mqttManagerInit() {
    // Cargar certificados desde LittleFS
    File ca = LittleFS.open(CERT_CA, "r");
    if (!ca) {
        Serial.println("Error al abrir el archivo del certificado CA");
        return;
    }
    String caStr = ca.readString();
    ca.close();

    File crt = LittleFS.open(CERT_CRT, "r");
    if (!crt) {
        Serial.println("Error al abrir el archivo del certificado del dispositivo (CRT)");
        return;
    }
    String crtStr = crt.readString();
    crt.close();

    File key = LittleFS.open(CERT_KEY, "r");
    if (!key) {
        Serial.println("Error al abrir el archivo de la clave privada (KEY)");
        return;
    }
    String keyStr = key.readString();
    key.close();

    Serial.println("Certificados cargados correctamente.");

    // Configurar los certificados en el cliente WiFi seguro
    net.setCACert(caStr.c_str());
    net.setCertificate(crtStr.c_str());
    net.setPrivateKey(keyStr.c_str());

    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
}


void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return;

    // Sincronizar la hora por NTP solo una vez, después de conectar a WiFi
    if (!timeSynchronized) {
        Serial.print("Sincronizando hora con NTP...");
        // Servidores NTP, zona horaria UTC-5 (ej. Colombia)
        configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");
        time_t now = time(nullptr);
        while (now < 1510644967) { // Esperar a que la hora sea razonable
            delay(500);
            now = time(nullptr);
            Serial.print(".");
        }
        Serial.println("\nHora sincronizada.");
        struct tm timeinfo;
        gmtime_r(&now, &timeinfo);
        Serial.print("Hora actual (UTC): ");
        Serial.print(asctime(&timeinfo));
        timeSynchronized = true;
    }

    // En ESP32, la hora del sistema se usa automáticamente para la validación de certificados
    // net.setX509Time(time(nullptr));

    // Contador para reintentos de conexión MQTT
    static int mqtt_retries = 0;

    while (!mqttClient.connected()) {
        // Si ya no hay conexión WiFi, salir para que el wifiManager actúe
        if (WiFi.status() != WL_CONNECTED) {
            return;
        }

        Serial.print("Intentando conexión MQTT...");
        String clientId = DEVICE_ID;
        if (mqttClient.connect(clientId.c_str())) {
            Serial.println("¡Conectado!");
            mqtt_retries = 0; // Reiniciar contador en éxito
            mqttConnected = true;
            mqttClient.subscribe(TOPIC_CMD);
            blinkLED(2, 100); // Dos parpadeos para suscripción
            // Ya no publicamos "Online" aquí. El estado general se publica desde main.cpp
        } else {
            mqtt_retries++;
            Serial.print(" Falló, rc=");
            Serial.print(mqttClient.state());
            Serial.print(" (Intento ");
            Serial.print(mqtt_retries);
            Serial.println(")");

            // Si fallamos varias veces, forzar reconexión WiFi
            if (mqtt_retries >= 5) {
                Serial.println("Fallo persistente de MQTT. Forzando reconexión WiFi...");
                WiFi.disconnect();
                mqtt_retries = 0; // Reiniciar contador
                return; // Salir para que el wifiManager actúe
            }

            delay(3000);
        }
    }
}

void takeAndPublishPhoto() {
    if (!mqttClient.connected()) {
        Serial.println("MQTT no conectado. No se puede enviar foto.");
        return;
    }

    Serial.println("Capturando foto...");
    camera_fb_t *fb = cameraCapture();
    if (!fb) {
        Serial.println("Fallo al capturar la foto.");
        return;
    }

    Serial.print("Foto capturada. Tamaño: ");
    Serial.print(fb->len);
    Serial.println(" bytes. Publicando...");

    if (mqttClient.publish(TOPIC_IMAGE, fb->buf, fb->len, false)) {
        Serial.println("Foto publicada con éxito.");
    } else {
        Serial.println("Fallo al publicar la foto. ¿El tamaño del paquete es suficiente?");
    }

    // Liberar el buffer del frame
    esp_camera_fb_return(fb);
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
        blinkLED(1, 100); // Un parpadeo para publicación
    }
}

void mqttManagerPublishSensorData(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_SENSORS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_SENSORS, payload, false);
        blinkLED(1, 100); // Un parpadeo para publicación
    }
}

bool isMqttConnected() {
    return mqttClient.connected();
}
