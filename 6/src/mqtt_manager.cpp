
#include "mqtt_manager.h"
#include "config.h"
#include "wifi_manager.h"
#include "sensors.h"
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <FS.h>
#include <LittleFS.h>
#include <time.h>                       // Para NTP

#include <ArduinoJson.h>                  // Para parsear JSON

BearSSL::WiFiClientSecure net;
PubSubClient mqttClient(net);

static bool mqttConnected = false;
static bool timeSynchronized = false;   // Flag para sincronizar la hora solo una vez

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String t = String(topic);
    if (t.endsWith("/cmd")) {
        Serial.println("Comando MQTT recibido.");
        blinkLED(2); // Dos parpadeos para suscripción
        
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
                    } else {
                        Serial.println("Comando desconocido o no especificado.");
                    }
                }}

void mqttManagerInit() {
    pinMode(LED_BUILTIN, OUTPUT); // Inicializar el LED integrado
    digitalWrite(LED_BUILTIN, HIGH); // Apagar el LED (normalmente HIGH para ESP8266)

    // Reducir uso de memoria en ESP8266
    net.setBufferSizes(512, 512);

    // Cargar certificados
    File ca = LittleFS.open(CERT_CA, "r");
    File crt = LittleFS.open(CERT_CRT, "r");
    File key = LittleFS.open(CERT_KEY, "r");
    if (!ca || !crt || !key) {
        Serial.println("Certificados no encontrados");
        return;
    }
    
    // Usar unique_ptr para asegurar que la memoria se libere
    size_t caLen = ca.size();
    std::unique_ptr<char[]> caBuf(new char[caLen + 1]);
    ca.readBytes(caBuf.get(), caLen);
    caBuf[caLen] = 0;

    size_t crtLen = crt.size();
    std::unique_ptr<char[]> crtBuf(new char[crtLen + 1]);
    crt.readBytes(crtBuf.get(), crtLen);
    crtBuf[crtLen] = 0;

    size_t keyLen = key.size();
    std::unique_ptr<char[]> keyBuf(new char[keyLen + 1]);
    key.readBytes(keyBuf.get(), keyLen);
    keyBuf[keyLen] = 0;
    
    // No cerrar los archivos aquí si se usan los punteros directamente
    ca.close();
    crt.close();
    key.close();

    // Configurar certificados en el cliente BearSSL
    // Es crucial que los punteros sigan siendo válidos.
    // BearSSL::X509List y PrivateKey hacen copias, así que es seguro.
    net.setTrustAnchors(new BearSSL::X509List(caBuf.get()));
    net.setClientRSACert(new BearSSL::X509List(crtBuf.get()), new BearSSL::PrivateKey(keyBuf.get()));

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

    // Establecer la hora para la validación de certificados
    net.setX509Time(time(nullptr));

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
            blinkLED(2); // Dos parpadeos para suscripción
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
        blinkLED(1); // Un parpadeo para publicación
    }
}

void mqttManagerPublishSensorData(const char* payload) {
    if (mqttClient.connected()) {
        Serial.print(TOPIC_SENSORS);
        Serial.print(": ");
        Serial.println(payload);
        mqttClient.publish(TOPIC_SENSORS, payload, false);
        blinkLED(1); // Un parpadeo para publicación
    }
}

bool isMqttConnected() {
    return mqttClient.connected();
}

// Variables para el parpadeo de LED no bloqueante para WiFi
bool wifiBlinkEnable = false;
unsigned long wifiLastBlinkMillis = 0;
bool wifiLedState = HIGH; // HIGH = LED apagado para ESP8266

void startWifiBlink() {
    wifiBlinkEnable = true;
    wifiLastBlinkMillis = millis();
    wifiLedState = HIGH; // Asegurar que el LED se apague al inicio del ciclo
    digitalWrite(LED_BUILTIN, wifiLedState);
}

void stopWifiBlink() {
    wifiBlinkEnable = false;
    digitalWrite(LED_BUILTIN, HIGH); // Apagar el LED cuando se detiene el parpadeo
}

void handleWifiBlink() {
    if (!wifiBlinkEnable) return;

    // Lógica para parpadear el LED 3 veces continuamente (ciclo de 3 encendidos y 3 apagados)
    // Con 250ms ON y 250ms OFF
    if (millis() - wifiLastBlinkMillis >= 250) {
        wifiLastBlinkMillis = millis();
        wifiLedState = !wifiLedState;
        digitalWrite(LED_BUILTIN, wifiLedState);
    }
}

// Blocking blink for MQTT events
void blinkLED(int blinks) {
    // Deshabilitar el parpadeo de WiFi temporalmente si está activo
    bool wasWifiBlinking = wifiBlinkEnable;
    if (wasWifiBlinking) {
        stopWifiBlink();
        digitalWrite(LED_BUILTIN, HIGH); // Asegurar LED apagado antes de parpadeo bloqueante
    }
    
    for (int i = 0; i < blinks; i++) {
        digitalWrite(LED_BUILTIN, LOW);  // Encender el LED
        delay(100);
        digitalWrite(LED_BUILTIN, HIGH); // Apagar el LED
        delay(100);
    }

    // Restaurar el parpadeo de WiFi si estaba activo
    if (wasWifiBlinking) {
        startWifiBlink();
    }
}
