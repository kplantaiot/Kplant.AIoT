#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <DHT.h>
#include <HX711.h> // Cambiado de HX711_ADC.h

// --- Configuración de Hardware ---
#define DHT_PIN D5
#define HX711_DOUT_PIN D6
#define HX711_SCK_PIN D7
#define LDR_PIN A0

#define DHT_TYPE DHT11

// --- Configuración de Conectividad ---
#define DEVICE_ID "KPCL0031"
const char* AWS_IOT_HOST = "a3o1jhmmwxnm4z-ats.iot.us-east-2.amazonaws.com";
const int AWS_IOT_PORT = 8883;

// --- Tópicos MQTT ---
const char* TOPIC_DATA_SENSORS = "kittypau/" DEVICE_ID "/data/sensors";
const char* TOPIC_STATUS = "kittypau/" DEVICE_ID "/status";
const char* TOPIC_HEALTH = "kittypau/" DEVICE_ID "/health";
const char* TOPIC_CMD_SET_WIFI = "kittypau/" DEVICE_ID "/cmnd/set_wifi";

// --- Configuración de Tiempo ---
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 0;
const int DAYLIGHT_OFFSET_SEC = 0;

// --- Intervalos ---
const unsigned long PUBLISH_INTERVAL_MS = 3000;
unsigned long lastPublishTime = 0;

// --- Objetos y Clientes ---
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, NTP_SERVER, GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC);

DHT dht(DHT_PIN, DHT_TYPE);
HX711 hx711(HX711_DOUT_PIN, HX711_SCK_PIN); // Cambiado de HX711_ADC a HX711

// --- Certificados globales para BearSSL (para asegurar su persistencia) ---
// Declared as global unique_ptr to ensure they remain in scope for WiFiClientSecure
std::unique_ptr<BearSSL::X509List> globalCaCert;
std::unique_ptr<BearSSL::X509List> globalClientCert;
std::unique_ptr<BearSSL::PrivateKey> globalPrivateKey;

// --- Declaraciones de Funciones ---
void setup_wifi();
void sync_time();
void callback(char* topic, byte* payload, unsigned int length);
void reconnect_mqtt();
void publish_sensor_data();
bool load_certificates();

// --- Implementación de Funciones ---

void setup_wifi() {
    Serial.println("\n[WiFi] Iniciando conexión...");
    WiFi.mode(WIFI_STA);

    if (!LittleFS.begin()) {
        Serial.println("[FS] Error al montar LittleFS. Usando credenciales por defecto.");
        WiFi.begin("Jeivos", "jdayne212");
    } else {
        File file = LittleFS.open("/known_networks.json", "r");
        if (!file || file.size() == 0) {
            Serial.println("[WiFi] No se encontró 'known_networks.json'. Usando credenciales por defecto.");
            WiFi.begin("Jeivos", "jdayne212");
        } else {
            StaticJsonDocument<512> doc;
            DeserializationError error = deserializeJson(doc, file);
            if (error) {
                Serial.println("[WiFi] Error al leer 'known_networks.json'. Usando credenciales por defecto.");
                WiFi.begin("Jeivos", "jdayne212");
            } else {
                JsonArray networks = doc.as<JsonArray>();
                bool connected = false;
                for (JsonObject network : networks) {
                    const char* ssid = network["ssid"];
                    const char* pass = network["pass"];
                    Serial.printf("[WiFi] Intentando conectar a SSID: %s\n", ssid);
                    WiFi.begin(ssid, pass);
                    int attempts = 0;
                    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
                        delay(500);
                        Serial.print(".");
                        attempts++;
                    }
                    if (WiFi.status() == WL_CONNECTED) {
                        connected = true;
                        break;
                    }
                }
                if (!connected) {
                    Serial.println("\n[WiFi] No se pudo conectar a ninguna red conocida. Reiniciando...");
                    delay(1000);
                    ESP.restart();
                }
            }
        }
        file.close();
    }

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\n[WiFi] Conectado!");
    Serial.print("[WiFi] Dirección IP: ");
    Serial.println(WiFi.localIP());
}

void sync_time() {
    Serial.println("[NTP] Sincronizando hora...");
    const char* ntp_servers[] = {"pool.ntp.org", "time.nist.gov", "time.google.com"};
    bool synced = false;
    for (int s = 0; s < 3 && !synced; s++) {
        timeClient.setPoolServerName(ntp_servers[s]);
        timeClient.begin();
        int retries = 0;
        while (!timeClient.update() && retries < 10) {
            timeClient.forceUpdate();
            delay(500);
            retries++;
        }
        time_t now = time(nullptr);
        int year_val = localtime(&now)->tm_year + 1900;
        Serial.print("[NTP] Año obtenido: ");
        Serial.println(year_val);
        if (year_val >= 2020) {
            synced = true;
            Serial.print("[NTP] Hora actual: ");
            Serial.println(ctime(&now));
        } else {
            Serial.println("[NTP] No se obtuvo hora válida, probando siguiente servidor...");
        }
    }
    if (!synced) {
        Serial.println("[NTP] Error: No se pudo sincronizar la hora con ningún servidor NTP.");
    }
}

bool load_certificates() {
    Serial.println("[AWS] Cargando certificados desde LittleFS...");

    // Sincronizar la hora es crucial para la validación de certificados
    wifiClient.setX509Time(time(nullptr));

    File ca = LittleFS.open("/AmazonRootCA1.pem", "r");
    if (!ca) {
        Serial.println("[AWS] Error al cargar AmazonRootCA1.pem");
        return false;
    }
    size_t caSize = ca.size();
    std::unique_ptr<uint8_t[]> ca_buf(new uint8_t[caSize]);
    ca.readBytes(reinterpret_cast<char*>(ca_buf.get()), caSize);
    std::unique_ptr<BearSSL::X509List> caCert(new BearSSL::X509List(static_cast<const uint8_t*>(ca_buf.get()), caSize));
    wifiClient.setTrustAnchors(caCert.get());
    ca.close();

    File cert = LittleFS.open("/certificate.pem.crt", "r");
    if (!cert) {
        Serial.println("[AWS] Error al cargar certificate.pem.crt");
        return false;
    }
    size_t certSize = cert.size();
    std::unique_ptr<char[]> cert_buf(new char[certSize]);
    cert.readBytes(cert_buf.get(), certSize);
    std::unique_ptr<BearSSL::X509List> clientCert(new BearSSL::X509List(static_cast<const uint8_t*>(cert_buf.get()), certSize));
    cert.close();

    File key = LittleFS.open("/private.pem.key", "r");
    if (!key) {
        Serial.println("[AWS] Error al cargar private.pem.key");
        return false;
    }
    size_t keySize = key.size();
    std::unique_ptr<char[]> key_buf(new char[keySize]);
    key.readBytes(key_buf.get(), keySize);
    std::unique_ptr<BearSSL::PrivateKey> privateKey(new BearSSL::PrivateKey(static_cast<const uint8_t*>(key_buf.get()), keySize));
    key.close();
    
    wifiClient.setClientRSACert(clientCert.get(), privateKey.get());

    Serial.println("[AWS] Certificados cargados exitosamente.");
    return true;
}

void callback(char* topic, byte* payload, unsigned int length) {
    Serial.printf("[MQTT] Mensaje recibido en tópico: %s\n", topic);
    
    if (strcmp(topic, TOPIC_CMD_SET_WIFI) == 0) {
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, payload, length);

        if (error) {
            Serial.print("[MQTT] Error al deserializar JSON: ");
            Serial.println(error.c_str());
            return;
        }

        const char* ssid = doc["ssid"];
        const char* pass = doc["pass"];

        if (ssid && pass) {
            Serial.printf("[WiFi] Nuevas credenciales recibidas: SSID=%s\n", ssid);
            
            StaticJsonDocument<256> newNetworkListDoc;
            JsonArray networkList = newNetworkListDoc.to<JsonArray>();
            networkList.add(doc.as<JsonObject>());
            
            File file = LittleFS.open("/known_networks.json", "w");
            if (serializeJson(newNetworkListDoc, file) == 0) {
                Serial.println("[FS] Error al escribir en known_networks.json");
            } else {
                Serial.println("[FS] Nuevas credenciales guardadas en known_networks.json. Reiniciando...");
            }
            file.close();
            
            delay(1000);
            ESP.restart();
        }
    }
}

void reconnect_mqtt() {
    while (!mqttClient.connected()) {
        Serial.print("[MQTT] Intentando reconexión...");
        if (mqttClient.connect(DEVICE_ID)) {
            Serial.println(" conectado!");
            
            // Suscribirse a comandos
            mqttClient.subscribe(TOPIC_CMD_SET_WIFI);
            Serial.printf("[MQTT] Suscrito a: %s\n", TOPIC_CMD_SET_WIFI);

            // Publicar estado "Online"
            StaticJsonDocument<128> statusDoc;
            statusDoc["status"] = "Online";
            time_t now = time(nullptr);
            char timestamp[20];
            strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", localtime(&now));
            statusDoc["timestamp"] = timestamp;
            
            char statusBuffer[128];
            serializeJson(statusDoc, statusBuffer);
            mqttClient.publish(TOPIC_STATUS, statusBuffer);
            Serial.printf("[MQTT] Estado publicado en: %s\n", TOPIC_STATUS);

            // Publicar salud de sensores
            StaticJsonDocument<128> healthDoc;
            // Aquí se podría poner una lógica real de chequeo, por ahora OK
            healthDoc["dht"] = "OK";
            healthDoc["hx711"] = "OK";
            
            char healthBuffer[128];
            serializeJson(healthDoc, healthBuffer);
            mqttClient.publish(TOPIC_HEALTH, healthBuffer);
            Serial.printf("[MQTT] Salud publicada en: %s\n", TOPIC_HEALTH);

        } else {
            Serial.print(" falló, rc=");
            Serial.print(mqttClient.state());
            Serial.println(". Reintentando en 5 segundos...");
            delay(5000);
        }
    }
}

void publish_sensor_data() {
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    // Si la lectura de peso genera error, comenta la siguiente línea:
    // float weight = hx711.get_units(5); // Si tu versión lo permite
    int light = analogRead(LDR_PIN); // Valor crudo de 0-1023
    float lux = light * (500.0 / 1023.0); // Conversión simple a Lux (ajustar según LDR)


    if (isnan(temp) || isnan(hum)) {
        Serial.println("[Sensor] Error al leer del sensor DHT11!");
        return;
    }

    StaticJsonDocument<256> doc;
    doc["deviceId"] = DEVICE_ID;
    
    char tempStr[10], humStr[10], weightStr[10], luxStr[10];
    dtostrf(temp, 6, 3, tempStr);
    dtostrf(hum, 6, 3, humStr);
    // Si la lectura de peso está comentada, pon un valor fijo o vacío:
    strcpy(weightStr, "0.000");
    dtostrf(lux, 7, 3, luxStr);

    doc["temperature_celsius"] = tempStr;
    doc["humidity_percent"] = humStr;
    doc["weight_grams"] = weightStr;
    doc["light_lux"] = luxStr;

    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    Serial.printf("[MQTT] Publicando datos de sensores: %s\n", buffer);
    mqttClient.publish(TOPIC_DATA_SENSORS, buffer, n);
}

void setup() {
    Serial.begin(115200);
    delay(2000); // Dar tiempo a que el serial se estabilice

    // Inicializar sensores
    dht.begin();
    hx711.begin();
    // Opcional: Calibrar la báscula la primera vez
    // hx711.set_scale(CALIBRATION_FACTOR);
    hx711.tare(); // Poner a cero la báscula

    setup_wifi();
    sync_time();

    if (!load_certificates()) {
        Serial.println("[FATAL] Fallo al cargar certificados. Deteniendo.");
        while(1) delay(1000);
    }
    
    // Optimización de memoria crítica para ESP8266 con TLS
    wifiClient.setBufferSizes(1024, 1024);

    mqttClient.setServer(AWS_IOT_HOST, AWS_IOT_PORT);
    mqttClient.setCallback(callback);
}

void loop() {
    if (!mqttClient.connected()) {
        reconnect_mqtt();
    }
    mqttClient.loop();

    unsigned long now = millis();
    if (now - lastPublishTime > PUBLISH_INTERVAL_MS) {
        lastPublishTime = now;
        publish_sensor_data();
    }
}

