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
const char* DEVICE_ID = "KPCL0030";

// ------------------- CONFIGURACIÓN WIFI -------------------
// Credenciales por defecto (se usarán si no hay nada guardado en LittleFS)
const char* INITIAL_SSID = "Jeivos";
const char* INITIAL_PASS = "jdayne212";

// Archivo para guardar la lista de redes conocidas
const char* KNOWN_NETWORKS_FILE = "/known_networks.json";

// Documento JSON para mantener la lista de redes en memoria
// Se asume un máximo de 5-10 redes. 1024 bytes es un tamaño seguro.
StaticJsonDocument<1024> knownNetworksDoc;

// ------------------- CONFIGURACIÓN AWS IOT (MQTT) -------------------
const char* MQTT_BROKER_HOST = "a3o1jhmmwxnm4z-ats.iot.us-east-2.amazonaws.com"; // AWS IoT Core endpoint
const int MQTT_BROKER_PORT = 8883;

// Nombres de los archivos de certificados (deben coincidir con los de la carpeta data)
const char* AWS_CERT_CA_FILE   = "/AmazonRootCA1.pem";
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
    Serial.println("\nInicializando Dispositivo KittyPau...");

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
    File cert_ca = LittleFS.open(AWS_CERT_CA_FILE, "r");
    if (!cert_ca) {
        Serial.printf("Error al abrir el certificado CA: %s\n", AWS_CERT_CA_FILE);
        return;
    }
    
    File cert_crt = LittleFS.open(AWS_CERT_CRT_FILE, "r");
    if (!cert_crt) {
        Serial.printf("Error al abrir el certificado del dispositivo: %s\n", AWS_CERT_CRT_FILE);
        return;
    }

    File cert_private = LittleFS.open(AWS_CERT_PRIVATE_FILE, "r");
    if (!cert_private) {
        Serial.printf("Error al abrir la clave privada: %s\n", AWS_CERT_PRIVATE_FILE);
        return;
    }
    
    // Configurar el cliente WiFi con los certificados usando la nueva API de BearSSL
    ca_cert.reset(new BearSSL::X509List(cert_ca));
    client_cert.reset(new BearSSL::X509List(cert_crt));
    client_key.reset(new BearSSL::PrivateKey(cert_private));

    wifiClient.setTrustAnchors(ca_cert.get());
    wifiClient.setClientRSACert(client_cert.get(), client_key.get());

    cert_ca.close();
    cert_crt.close();
    cert_private.close();

    // Configurar el cliente MQTT
    mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    mqttClient.setCallback(mqtt_callback);

    // Chequeo inicial de sensores
    String sensorStatus = check_sensors();
    Serial.printf("Estado de sensores: %s\n", sensorStatus.c_str());

    // Conectar a MQTT y publicar estado
    connect_mqtt();
    mqttClient.publish(TOPIC_HEALTH, sensorStatus.c_str());

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
        
        if (timeClient.update()) {
            Serial.println("Hora sincronizada!");
            time_t epochTime = timeClient.getEpochTime();
            struct tm *pti = localtime(&epochTime); // Use localtime for local time based on offset
            Serial.printf("Hora actual (Local): %s", asctime(pti));
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
    File networksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "r");
    if (!networksFile) {
        Serial.println("No se encontró el archivo de redes conocidas. Creando uno por defecto con 'Jeivos'.");
        // El archivo no existe, crear uno por defecto
        JsonArray networks = knownNetworksDoc.to<JsonArray>();
        JsonObject network = networks.createNestedObject();
        network["ssid"] = INITIAL_SSID;
        network["pass"] = INITIAL_PASS;
        
        // Guardar el archivo por defecto
        File newNetworksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
        if (serializeJson(knownNetworksDoc, newNetworksFile) == 0) {
            Serial.println("Error al guardar el archivo de redes por defecto.");
        }
        newNetworksFile.close();
        return;
    }

    // El archivo existe, intentar leerlo
    DeserializationError error = deserializeJson(knownNetworksDoc, networksFile);
    networksFile.close();

    if (error) {
        Serial.print("Error al leer el archivo de redes: ");
        Serial.println(error.c_str());
        Serial.println("Se usará una lista vacía.");
        knownNetworksDoc.clear();
        return;
    }

    // Si el archivo está vacío, crear la red por defecto
    if (knownNetworksDoc.as<JsonArray>().size() == 0) {
        Serial.println("Archivo de redes vacío. Agregando 'Jeivos' por defecto.");
        JsonArray networks = knownNetworksDoc.as<JsonArray>();
        JsonObject network = networks.createNestedObject();
        network["ssid"] = INITIAL_SSID;
        network["pass"] = INITIAL_PASS;
        
        File newNetworksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
        serializeJson(knownNetworksDoc, newNetworksFile);
        newNetworksFile.close();
    }

    Serial.println("Lista de redes conocidas cargada desde LittleFS.");

    // Asegurarse de que "Jeivos" (la red por defecto) siempre esté presente y con su contraseña por defecto
    JsonArray networks = knownNetworksDoc.as<JsonArray>();
    bool jeivos_found = false;
    for (JsonObject network : networks) {
        if (network["ssid"] == INITIAL_SSID) {
            network["pass"] = INITIAL_PASS; // Asegurar la contraseña por defecto
            jeivos_found = true;
            break;
        }
    }

    if (!jeivos_found) {
        Serial.println("Agregando 'Jeivos' a la lista de redes conocidas.");
        JsonObject jeivos_network = networks.createNestedObject();
        jeivos_network["ssid"] = INITIAL_SSID;
        jeivos_network["pass"] = INITIAL_PASS;
        // Si se añadió o modificó "Jeivos", guardar la lista
        File newNetworksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
        if (serializeJson(knownNetworksDoc, newNetworksFile) == 0) {
            Serial.println("Error al guardar el archivo de redes después de asegurar 'Jeivos'.");
        }
        newNetworksFile.close();
    }
}

void saveWifiCredentials(String ssid, String pass) {
    JsonArray networks = knownNetworksDoc.as<JsonArray>();
    bool network_found = false;

    // Buscar si la red ya existe para actualizar la contraseña
    for (JsonObject network : networks) {
        if (network["ssid"] == ssid) {
            network["pass"] = pass;
            network_found = true;
            Serial.printf("Contraseña actualizada para la red: %s\n", ssid.c_str());
            break;
        }
    }

    // Si la red no se encontró, añadirla a la lista
    if (!network_found) {
        JsonObject new_network = networks.createNestedObject();
        new_network["ssid"] = ssid;
        new_network["pass"] = pass;
        Serial.printf("Nueva red añadida a la lista: %s\n", ssid.c_str());
    }

    // Guardar la lista actualizada en el archivo
    File networksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
    if (serializeJson(knownNetworksDoc, networksFile) == 0) {
        Serial.println("Error al guardar la lista de redes actualizada.");
    } else {
        Serial.println("Lista de redes actualizada guardada en LittleFS.");
    }
    networksFile.close();
}

// --- Conexión WiFi ---
bool setup_wifi() {
    JsonArray networks = knownNetworksDoc.as<JsonArray>();
    if (networks.isNull() || networks.size() == 0) {
        Serial.println("No hay redes WiFi conocidas para intentar conectar.");
        return false;
    }

    Serial.println("Iniciando ciclo de conexión a redes conocidas...");
    WiFi.mode(WIFI_STA);

    for (size_t i = 0; i < networks.size(); i++) {
        JsonObject network = networks[i];
        const char* ssid = network["ssid"];
        const char* pass = network["pass"];

        if (!ssid) continue;

        Serial.printf("Intentando conectar a: %s ", ssid);
        WiFi.begin(ssid, pass);

        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) { // ~10 segundos de espera
            delay(500);
            Serial.print(".");
            attempts++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nWiFi conectado!");
            Serial.print("Dirección IP: ");
            Serial.println(WiFi.localIP());
            delay(1000); // Pausa de 1 segundo para estabilizar la conexión y el stack de red

            // Si la red exitosa no estaba ya al principio, se reordena
            if (i > 0) {
                Serial.println("Priorizando esta red para futuras conexiones...");
                
                // Lógica manual para reordenar, ya que insert() no está disponible
                StaticJsonDocument<1024> tempDoc;
                JsonArray newNetworks = tempDoc.to<JsonArray>();

                // 1. Añadir la red exitosa al principio
                newNetworks.add(networks[i]);

                // 2. Añadir el resto de las redes
                for (size_t j = 0; j < networks.size(); j++) {
                    if (j != i) {
                        newNetworks.add(networks[j]);
                    }
                }

                // 3. Reemplazar el array original con el nuevo reordenado
                knownNetworksDoc.set(newNetworks);

                // 4. Guardar la lista reordenada en el archivo
                File networksFile = LittleFS.open(KNOWN_NETWORKS_FILE, "w");
                if (serializeJson(knownNetworksDoc, networksFile) == 0) {
                    Serial.println("Error al guardar la lista de redes reordenada.");
                }
                networksFile.close();
            }
            return true; // Salir de la función al conectar
        } else {
            Serial.println("\nFallo al conectar.");
            WiFi.disconnect(true); // Asegurarse de limpiar la configuración anterior
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
            WiFi.disconnect(); // Desconectar para que el loop principal inicie la reconexión
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
    Serial.print("Conectando a AWS IoT MQTT...");
    if (mqttClient.connect(DEVICE_ID)) {
        Serial.println(" conectado!");
        // Suscribirse al topic de comandos
        mqttClient.subscribe(TOPIC_COMMAND_SET_WIFI);
        Serial.printf("Suscrito a: %s\n", TOPIC_COMMAND_SET_WIFI);
        // Publicar estado online
        publishStatus();
    } else {
        Serial.print(" falló, rc=");
        Serial.print(mqttClient.state());
        Serial.println(" Reintentando en 5 segundos...");
    }
}

// --- Publicar estado ---
void publishStatus() {
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
    String healthStatus = getHealthStatus(temp, hum);
    mqttClient.publish(TOPIC_HEALTH, healthStatus.c_str());
}

// --- Chequeo de estado de sensores ---
String getHealthStatus(float temp, float hum) {
    // Usar los valores recibidos para chequear el estado
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
    // Leer valores
    temperature = dht.readTemperature();
    humidity = dht.readHumidity();
    bool dht_ok = !isnan(temperature) && !isnan(humidity);

    bool loadcell_ok = LoadCell.update(); // update() devuelve true si la lectura es exitosa

    StaticJsonDocument<128> doc;
    doc["dht"] = dht_ok ? "OK" : "OFF";
    doc["hx711"] = loadcell_ok ? "OK" : "OFF";
    
    String output;
    serializeJson(doc, output);
    return output;
}

// --- Publicación de datos de sensores ---
void publishSensorData(float temp, float hum) {
    if (!mqttClient.connected()) {
        return;
    }
    
    // Asignar los valores recibidos a las variables globales para mantener la consistencia
    temperature = temp;
    humidity = hum;
    
    // Chequear si la lectura es válida (no es NaN y está dentro del rango físico del sensor DHT11)
    if (isnan(temperature) || isnan(humidity) || temperature < 0.0 || temperature > 50.0 || humidity < 20.0 || humidity > 90.0) {
        temperature = -99.0;
        humidity = -99.0;
    } else {
        // Restringir los valores al rango de visualización (que es el mismo que el del sensor para DHT11)
        temperature = constrain(temperature, 0.0, 50.0);
        humidity = constrain(humidity, 20.0, 90.0);
    }
    
    if (LoadCell.update()) { // update() devuelve true si la lectura es exitosa
        float raw_weight = LoadCell.getData(); // Devuelve el promedio de lecturas (valor crudo)
        
        weight = (raw_weight / 400000.0) * 1000.0;
        weight = constrain(weight, 0.0, 1000.0);

    } else {
        weight = -99.0; // Valor de error
    }

    light_level = analogRead(LDR_PIN);
    light_level = (light_level / 1023.0) * 500.0;
    light_level = constrain(light_level, 0.0, 500.0);

    // Redondear todos los valores a 3 decimales
    // Esto ya no es estrictamente necesario con dtostrf, pero se mantiene para claridad
    // temperature = round(temperature * 1000.0) / 1000.0;
    // humidity = round(humidity * 1000.0) / 1000.0;
    // weight = round(weight * 1000.0) / 1000.0;
    // light_level = round(light_level * 1000.0) / 1000.0;

    // Formatear todos los valores a 3 decimales como cadenas
    char temp_str[10];
    char hum_str[10];
    char weight_str[10];
    char light_str[10];

    dtostrf(temperature, 1, 3, temp_str); // Ancho mínimo 1, 3 decimales
    dtostrf(humidity, 1, 3, hum_str);
    dtostrf(weight, 1, 3, weight_str);
    dtostrf(light_level, 1, 3, light_str);


    // Crear JSON
    StaticJsonDocument<256> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["temperature_celsius"] = temp_str;
    doc["humidity_percent"] = hum_str;
    doc["weight_grams"] = weight_str; 
    doc["light_lux"] = light_str;
    
    char buffer[256];
    size_t n = serializeJson(doc, buffer);

    // Publicar
    Serial.printf("Publicando datos: %s\n", buffer);
    mqttClient.publish(TOPIC_SENSORS_DATA, buffer, n);
}
