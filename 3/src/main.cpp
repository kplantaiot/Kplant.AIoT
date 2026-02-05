#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <WiFiClientSecure.h>
#include <WiFiUDP.h>
#include <NTPClient.h>

// Librerías de sensores
#include <HX711_ADC.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>

// ------------------- CONFIGURACIÓN GENERAL -------------------
// Sustituye con los pines correctos para tu montaje
#define DHT_PIN    D5 // Pin para el sensor DHT22/11
#define LDR_PIN    A0 // Pin para el LDR (Analógico)
#define HX711_DOUT D6 // Pin DOUT para el HX711
#define HX711_SCK  D7 // Pin SCK para el HX711

// Tipo de sensor DHT (DHT11 o DHT22)
#define DHT_TYPE DHT11

// ID único del dispositivo KittyPau
const char* DEVICE_ID = "KPCL0030"; // ACTUALIZADO por petición del usuario

// ------------------- CONFIGURACIÓN WIFI -------------------
// Credenciales por defecto (se usarán si no hay nada guardado en LittleFS)
const char* INITIAL_SSID = "Jeivos";
const char* INITIAL_PASS = "jdayne212";

// Archivo para guardar la lista de redes conocidas
const char* KNOWN_NETWORKS_FILE = "/known_networks.json";

// Documento JSON para mantener la lista de redes en memoria
StaticJsonDocument<1024> knownNetworksDoc;

// ------------------- CONFIGURACIÓN AWS IOT (MQTT) -------------------
const char* MQTT_BROKER_HOST = "a3o1jhmmwxnm4z-ats.iot.us-east-2.amazonaws.com"; // AWS IoT Core endpoint
const int MQTT_BROKER_PORT = 8883;

// Nombres de los archivos de certificados (deben coincidir con los de la carpeta data)
const char* AWS_CERT_CA_FILE   = "/AmazonRootCA1.pem"; // ACTUALIZADO POR PETICIÓN DEL USUARIO
const char* AWS_CERT_CRT_FILE  = "/certificate.pem.crt";
const char* AWS_CERT_PRIVATE_FILE = "/private.pem.key";

// Topics MQTT
char TOPIC_STATUS[50];
char TOPIC_HEALTH[50];
char TOPIC_SENSORS_DATA[50];
char TOPIC_COMMAND_SET_WIFI[50];

// ------------------- OBJETOS Y VARIABLES GLOBALES -------------------
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -4 * 3600);

// Punteros inteligentes para gestionar la memoria de los certificados de forma segura
std::unique_ptr<BearSSL::X509List> ca_cert;
std::unique_ptr<BearSSL::X509List> client_cert;
std::unique_ptr<BearSSL::PrivateKey> client_key;

DHT dht(DHT_PIN, DHT_TYPE);
HX711_ADC LoadCell(HX711_DOUT, HX711_SCK);

// Variables para lecturas de sensores
float temperature, humidity, weight, light_level;

// Para la reconexión de MQTT
long lastReconnectAttempt = 0;

// Declaración de funciones
bool setup_wifi();
void loadWifiCredentials();
void saveWifiCredentials(String ssid, String pass);
void connect_mqtt();
void mqtt_callback(char* topic, byte* payload, unsigned int length);
String check_sensors();
String getHealthStatus(float temp, float hum);
void publishSensorData(float temp, float hum);
void publishStatus();
void publishHealth(float temp, float hum);
bool setClock();

// ======================= SETUP =======================
void setup() {
    Serial.begin(115200);
    Serial.println("\nInicializando Dispositivo KittyPau (versión simplificada)...");

    // 1. Inicializar sensores primero para darles tiempo a estabilizarse
    dht.begin();
    LoadCell.begin();
    LoadCell.tare(); // Poner la balanza a cero al inicio
    delay(2000); // Pausa extra para la estabilización de los sensores

    // Inicializar LittleFS
    if (!LittleFS.begin()) {
        Serial.println("Error al montar el sistema de archivos LittleFS.");
        return;
    }

    // Configurar topics MQTT
    snprintf(TOPIC_STATUS, sizeof(TOPIC_STATUS), "kittypau/%s/status", DEVICE_ID);
    snprintf(TOPIC_HEALTH, sizeof(TOPIC_HEALTH), "kittypau/%s/health", DEVICE_ID);
    snprintf(TOPIC_SENSORS_DATA, sizeof(TOPIC_SENSORS_DATA), "kittypau/%s/data/sensors", DEVICE_ID);
    snprintf(TOPIC_COMMAND_SET_WIFI, sizeof(TOPIC_COMMAND_SET_WIFI), "kittypau/%s/cmnd/set_wifi", DEVICE_ID);

    // Cargar redes WiFi conocidas desde la memoria
    loadWifiCredentials();

    // Iniciar WiFi
    setup_wifi();

    // Iniciar NTPClient
    timeClient.begin();

    // Sincronizar la hora (necesario para la validación de certificados de AWS)
    setClock();

    // Cargar certificados desde LittleFS
    Serial.println("Cargando certificados...");
    File cert_ca = LittleFS.open(AWS_CERT_CA_FILE, "r");
    if (!cert_ca) {
        Serial.printf("Error al abrir el certificado CA: %s\n", AWS_CERT_CA_FILE);
        return;
    }
    Serial.printf("Certificado CA '%s' abierto. Tamaño: %d bytes\n", AWS_CERT_CA_FILE, cert_ca.size());
    
    File cert_crt = LittleFS.open(AWS_CERT_CRT_FILE, "r");
    if (!cert_crt) {
        Serial.printf("Error al abrir el certificado del dispositivo: %s\n", AWS_CERT_CRT_FILE);
        return;
    }
    Serial.printf("Certificado de dispositivo '%s' abierto. Tamaño: %d bytes\n", AWS_CERT_CRT_FILE, cert_crt.size());

    File cert_private = LittleFS.open(AWS_CERT_PRIVATE_FILE, "r");
    if (!cert_private) {
        Serial.printf("Error al abrir la clave privada: %s\n", AWS_CERT_PRIVATE_FILE);
        return;
    }
    Serial.printf("Clave privada '%s' abierta. Tamaño: %d bytes\n", AWS_CERT_PRIVATE_FILE, cert_private.size());
    
    // Configurar el cliente WiFi con los certificados usando la nueva API de BearSSL
    ca_cert.reset(new BearSSL::X509List(cert_ca));
    client_cert.reset(new BearSSL::X509List(cert_crt));
    client_key.reset(new BearSSL::PrivateKey(cert_private));

    wifiClient.setTrustAnchors(ca_cert.get());
    wifiClient.setClientRSACert(client_cert.get(), client_key.get());
    wifiClient.setBufferSizes(1024, 1024); // OPTIMIZACIÓN DE MEMORIA

    cert_ca.close();
    cert_crt.close();
    cert_private.close();
    Serial.println("Certificados y cliente WiFi configurados.");

    // Configurar el cliente MQTT
    mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    mqttClient.setCallback(mqtt_callback);

    // Chequeo inicial de sensores
    String sensorStatus = check_sensors();
    Serial.printf("Estado de sensores: %s\n", sensorStatus.c_str());

    // Conectar a MQTT y publicar estado
    connect_mqtt();
    if(mqttClient.connected()) {
      mqttClient.publish(TOPIC_HEALTH, sensorStatus.c_str());
    }

    lastReconnectAttempt = 0;
}

// ======================= LOOP =======================
void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        // Si se pierde la conexión, intentar reconectar
        if (setup_wifi()) {
            // Si la reconexión es exitosa, volver a sincronizar el reloj
            // Esto es crucial para la estabilidad de la conexión segura (TLS) con AWS
            setClock();
        }
    }

    if (!mqttClient.connected()) {
        long now = millis();
        if (now - lastReconnectAttempt > 5000) {
            lastReconnectAttempt = now;
            connect_mqtt();
        }
    } else {
        mqttClient.loop();
    }

    // Publicar datos cada 3 segundos
    static long lastMsg = 0;
    long now = millis();
    if (now - lastMsg > 3000) {
        lastMsg = now;
        
        // Centralizar la lectura de los sensores una vez por ciclo
        float current_temp = dht.readTemperature();
        float current_hum = dht.readHumidity();

        publishSensorData(current_temp, current_hum);
        publishStatus();
        publishHealth(current_temp, current_hum);
    }
}


// ======================= FUNCIONES AUXILIARES =======================

// --- Función para sincronizar el reloj con un servidor NTP ---
bool setClock() {
    bool time_synced = false;
    int retries = 0;
    Serial.println("Sincronizando reloj con NTPClient...");

    while(!time_synced && retries < 10) { // Increased retries
        retries++;
        Serial.printf("Intento de sincronización de hora #%d...\n", retries);
        
        if (timeClient.forceUpdate()) { // Usar forceUpdate para asegurar la sincronización
            Serial.println("Hora sincronizada!");
            time_t epochTime = timeClient.getEpochTime();
            struct tm *pti = localtime(&epochTime); 
            char time_buf[30];
            strftime(time_buf, sizeof(time_buf), "%a %b %d %H:%M:%S %Y", pti);
            Serial.printf("Hora actual (Local): %s\n", time_buf);
            time_synced = true;
        } else {
            Serial.println("Fallo en este intento de NTPClient. Reintentando...");
            delay(2000); // Wait 2 seconds before retrying
        }
    }
    if (!time_synced) {
        Serial.println("Fallo crítico: No se pudo sincronizar la hora después de varios intentos.");
    }
    return time_synced;
}

// --- Gestión de credenciales WiFi ---
void loadWifiCredentials() {
    if (!LittleFS.exists(KNOWN_NETWORKS_FILE)) {
        Serial.println("No se encontró el archivo de redes conocidas. Creando uno por defecto con 'Jeivos'.");
        JsonArray networks = knownNetworksDoc.to<JsonArray>();
        JsonObject network = networks.createNestedObject();
        network["ssid"] = INITIAL_SSID;
        network["pass"] = INITIAL_PASS;
        
        File newNetworksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
        if (serializeJson(knownNetworksDoc, newNetworksFile) == 0) {
            Serial.println("Error al guardar el archivo de redes por defecto.");
        }
        newNetworksFile.close();
        return;
    }

    File networksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "r");
    DeserializationError error = deserializeJson(knownNetworksDoc, networksFile);
    networksFile.close();

    if (error) {
        Serial.print("Error al leer el archivo de redes: ");
        Serial.println(error.c_str());
        return;
    }
    Serial.println("Lista de redes conocidas cargada desde LittleFS.");
}

void saveWifiCredentials(String ssid, String pass) {
    JsonArray networks = knownNetworksDoc.as<JsonArray>();
    bool network_found = false;

    for (JsonObject network : networks) {
        if (network["ssid"] == ssid) {
            network["pass"] = pass;
            network_found = true;
            break;
        }
    }

    if (!network_found) {
        JsonObject new_network = networks.createNestedObject();
        new_network["ssid"] = ssid;
        new_network["pass"] = pass;
    }

    File networksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
    if (serializeJson(knownNetworksDoc, networksFile) == 0) {
        Serial.println("Error al guardar la lista de redes actualizada.");
    }
    networksFile.close();
}

// --- Conexión WiFi ---
bool setup_wifi() {
    if (knownNetworksDoc.as<JsonArray>().size() == 0) {
        Serial.println("No hay redes WiFi conocidas para intentar conectar.");
        return false;
    }

    Serial.println("Iniciando ciclo de conexión a redes conocidas...");
    WiFi.mode(WIFI_STA);

    for (JsonObject network : knownNetworksDoc.as<JsonArray>()) {
        const char* ssid = network["ssid"];
        const char* pass = network["pass"];

        if (!ssid) continue;

        Serial.printf("Intentando conectar a: %s ", ssid);
        WiFi.begin(ssid, pass);

        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nWiFi conectado!");
            Serial.print("Dirección IP: ");
            Serial.println(WiFi.localIP());
            return true;
        } else {
            Serial.println("\nFallo al conectar.");
            WiFi.disconnect(true);
        }
    }

    Serial.println("No se pudo conectar a ninguna red WiFi conocida.");
    return false;
}


// --- Callback para mensajes MQTT entrantes ---
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    Serial.print("Mensaje recibido en topic: ");
    Serial.println(topic);

    if (strcmp(topic, TOPIC_COMMAND_SET_WIFI) == 0) {
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, payload, length);

        if (error) {
            Serial.print("deserializeJson() falló: ");
            Serial.println(error.c_str());
            return;
        }

        const char* new_ssid = doc["ssid"];
        const char* new_pass = doc["pass"];

        if (new_ssid && new_pass) {
            Serial.printf("Recibido comando para cambiar/añadir WiFi. SSID: %s\n", new_ssid);
            saveWifiCredentials(new_ssid, new_pass);
            Serial.println("Credenciales guardadas. Forzando reconexión...");
            ESP.restart();
        } else {
            Serial.println("Comando 'set_wifi' recibido pero el formato JSON es incorrecto. Se esperaba 'ssid' y 'pass'.");
        }
    }
}

// --- Conexión al Broker MQTT ---
void connect_mqtt() {
    if (mqttClient.connected()) {
        return;
    }
    Serial.printf("Intentando conectar a AWS IoT MQTT en %s:%d...", MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    if (mqttClient.connect(DEVICE_ID)) {
        Serial.println(" conectado!");
        mqttClient.subscribe(TOPIC_COMMAND_SET_WIFI);
        Serial.printf("Suscrito a: %s\n", TOPIC_COMMAND_SET_WIFI);
        publishStatus();
    } else {
        Serial.printf(" falló, rc=%d. ", mqttClient.state());
        switch (mqttClient.state()) {
            case MQTT_CONNECTION_TIMEOUT: Serial.println("Timeout."); break;
            case MQTT_CONNECTION_LOST: Serial.println("Conexión perdida."); break;
            case MQTT_CONNECT_FAILED: Serial.println("Fallo de conexión."); break;
            case MQTT_DISCONNECTED: Serial.println("Desconectado."); break;
            case MQTT_CONNECT_BAD_PROTOCOL: Serial.println("Protocolo incorrecto."); break;
            case MQTT_CONNECT_BAD_CLIENT_ID: Serial.println("ID de cliente incorrecto."); break;
            case MQTT_CONNECT_UNAVAILABLE: Serial.println("Servidor no disponible."); break;
            case MQTT_CONNECT_BAD_CREDENTIALS: Serial.println("Credenciales incorrectas."); break;
            case MQTT_CONNECT_UNAUTHORIZED: Serial.println("No autorizado."); break;
            default: Serial.println("Error desconocido."); break;
        }
        Serial.println("Reintentando en 5 segundos...");
    }
}

// --- Publicar estado ---
void publishStatus() {
    if (!mqttClient.connected()) return;
    StaticJsonDocument<128> doc;
    doc["status"] = "Online";

    char time_str[20];
    time_t now = time(nullptr);
    struct tm* timeinfo = localtime(&now); 
    strftime(time_str, sizeof(time_str), "%Y-%m-%d %H:%M:%S", timeinfo);
    
    doc["timestamp"] = time_str;

    char buffer[128];
    size_t n = serializeJson(doc, buffer);
    mqttClient.publish(TOPIC_STATUS, buffer, n);
}

// --- Publicar estado de salud de los sensores ---
void publishHealth(float temp, float hum) {
    if (!mqttClient.connected()) return;
    String healthStatus = getHealthStatus(temp, hum);
    mqttClient.publish(TOPIC_HEALTH, healthStatus.c_str());
}

// --- Chequeo de estado de sensores ---
String getHealthStatus(float temp, float hum) {
    bool dht_ok = !isnan(temp) && !isnan(hum) && temp >= 0.0 && temp <= 50.0 && hum >= 20.0 && hum <= 90.0;
    bool loadcell_ok = LoadCell.update();

    StaticJsonDocument<128> doc;
    doc["dht"] = dht_ok ? "OK" : "OFF";
    doc["hx711"] = loadcell_ok ? "OK" : "OFF";
    
    String output;
    serializeJson(doc, output);
    return output;
}

// --- Chequeo de sensores al inicio ---
String check_sensors() {
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();
    bool dht_ok = !isnan(temperature) && !isnan(humidity);

    bool loadcell_ok = LoadCell.update();

    StaticJsonDocument<128> doc;
    doc["dht"] = dht_ok ? "OK" : "OFF";
    doc["hx711"] = loadcell_ok ? "OK" : "OFF";
    
    String output;
    serializeJson(doc, output);
    return output;
}

// --- Publicación de datos de sensores ---
void publishSensorData(float temp, float hum) {
    if (!mqttClient.connected()) return;
    
    temperature = temp;
    humidity = hum;
    
    if (isnan(temperature) || isnan(humidity) || temperature < 0.0 || temperature > 50.0 || humidity < 20.0 || humidity > 90.0) {
        temperature = -99.0;
        humidity = -99.0;
    }
    
    if (LoadCell.update()) {
        float raw_weight = LoadCell.getData();
        weight = (raw_weight / 400000.0) * 1000.0;
        weight = constrain(weight, 0.0, 1000.0);
    } else {
        weight = -99.0;
    }

    light_level = analogRead(LDR_PIN);
    light_level = (light_level / 1023.0) * 500.0;
    light_level = constrain(light_level, 0.0, 500.0);

    char temp_str[10], hum_str[10], weight_str[10], light_str[10];
    dtostrf(temperature, 1, 3, temp_str);
    dtostrf(humidity, 1, 3, hum_str);
    dtostrf(weight, 1, 3, weight_str);
    dtostrf(light_level, 1, 3, light_str);

    StaticJsonDocument<256> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["temperature_celsius"] = temp_str;
    doc["humidity_percent"] = hum_str;
    doc["weight_grams"] = weight_str; 
    doc["light_lux"] = light_str;
    
    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    Serial.printf("Publicando datos: %s\n", buffer);
    mqttClient.publish(TOPIC_SENSORS_DATA, buffer, n);
}