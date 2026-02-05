#include "mqtt_manager.h"
#include "config.h"
#include "wifi_manager.h"
#include "sensors.h"
#include "led_indicator.h"
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <LittleFS.h>
#include <time.h>                       // Para NTP

#include <ArduinoJson.h>                  // Para parsear JSON

// Aumentar buffer para conexiones TLS (defecto es 256, muy pequeño)
#define MQTT_MAX_PACKET_SIZE 512

// Certificado raíz ISRG Root X1 (Let's Encrypt) - usado por HiveMQ Cloud
static const char ca_cert[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

X509List caCertX509(ca_cert);
WiFiClientSecure net;
PubSubClient mqttClient(net);

static bool mqttConnected = false;
static bool timeSynchronized = false;   // Flag para sincronizar la hora solo una vez

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
        } else {
            Serial.println("Comando desconocido o no especificado.");
        }
    }
}

void mqttManagerInit() {
    // Configurar certificado raíz de Let's Encrypt para HiveMQ Cloud
    net.setTrustAnchors(&caCertX509);

    // Buffers más grandes para TLS handshake con HiveMQ Cloud
    net.setBufferSizes(1024, 1024);

    // Aumentar buffer MQTT
    mqttClient.setBufferSize(512);

    // Timeout más largo para conexión TLS (en segundos)
    mqttClient.setSocketTimeout(30);

    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

    Serial.println("MQTT Manager inicializado para HiveMQ Cloud");
    Serial.println("Usando certificado ISRG Root X1 (Let's Encrypt)");
    Serial.print("Broker: ");
    Serial.println(MQTT_BROKER);
    Serial.print("Puerto: ");
    Serial.println(MQTT_PORT);
    Serial.print("Usuario: ");
    Serial.println(MQTT_USERNAME);
    Serial.print("Heap libre: ");
    Serial.println(ESP.getFreeHeap());
}


void reconnectMQTT() {
    if (WiFi.status() != WL_CONNECTED) return;

    // Sincronizar la hora por NTP solo una vez, después de conectar a WiFi
    if (!timeSynchronized) {
        Serial.print("Sincronizando hora con NTP...");
        // Servidores NTP, zona horaria UTC-5 (ej. Colombia)
        configTime(-5 * 3600, 0, "pool.ntp.org", "time.nist.gov");

        // Esperar con timeout y yield para evitar WDT reset
        unsigned long ntpStart = millis();
        time_t now = time(nullptr);
        while (now < 1510644967 && (millis() - ntpStart < 15000)) {
            delay(100);
            yield();  // Alimentar el watchdog
            now = time(nullptr);
            Serial.print(".");
        }

        if (now >= 1510644967) {
            Serial.println("\nHora sincronizada.");
            struct tm timeinfo;
            gmtime_r(&now, &timeinfo);
            Serial.print("Hora actual (UTC): ");
            Serial.print(asctime(&timeinfo));
            timeSynchronized = true;
        } else {
            Serial.println("\nTimeout en NTP, continuando sin sincronización.");
            timeSynchronized = true;  // Marcar como hecho para no bloquear
        }
    }

    // Si ya está conectado, no hacer nada
    if (mqttClient.connected()) return;

    // Contador para reintentos de conexión MQTT
    static int mqtt_retries = 0;
    static unsigned long lastMqttAttempt = 0;

    // Solo intentar cada 5 segundos para no bloquear
    if (millis() - lastMqttAttempt < 5000 && lastMqttAttempt != 0) {
        return;
    }
    lastMqttAttempt = millis();

    // Si ya no hay conexión WiFi, salir
    if (WiFi.status() != WL_CONNECTED) {
        return;
    }

    Serial.print("Intentando conexión MQTT a HiveMQ... ");
    Serial.print("(Heap: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(")");

    // Debug: intentar conexión TCP primero
    Serial.print("Conectando TCP a ");
    Serial.print(MQTT_BROKER);
    Serial.print(":");
    Serial.println(MQTT_PORT);
    yield();  // Alimentar watchdog antes de operación costosa

    String clientId = DEVICE_ID;
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
        Serial.println("¡Conectado!");
        mqtt_retries = 0;
        mqttConnected = true;
        mqttClient.subscribe(TOPIC_CMD);
        blinkLED(2, 100);
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
            mqtt_retries = 0;
        }
    }
    yield();  // Alimentar watchdog después de operación costosa
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
