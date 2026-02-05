// wifi_manager.cpp
// Gestión de WiFi y credenciales usando LittleFS
#include "wifi_manager.h"
#include "config.h"
#include <LittleFS.h>
#include <ESP8266WiFi.h>

struct WifiCredential {
    String ssid;
    String pass;
};

#define WIFI_CRED_FILE "/wifi.json"
#include <ArduinoJson.h>

static std::vector<WifiCredential> knownNetworks;
static bool wifiConnected = false;

void loadWifiCredentials() {
    knownNetworks.clear();
    if (!LittleFS.exists(WIFI_CRED_FILE)) {
        knownNetworks.push_back({WIFI_SSID, WIFI_PASS});
        return;
    }
    File f = LittleFS.open(WIFI_CRED_FILE, "r");
    if (!f) return;
    DynamicJsonDocument doc(512);
    DeserializationError err = deserializeJson(doc, f);
    if (!err) {
        for (JsonObject obj : doc.as<JsonArray>()) {
            knownNetworks.push_back({obj["ssid"].as<String>(), obj["pass"].as<String>()});
        }
    }
    f.close();
}

void saveWifiCredentials() {
    DynamicJsonDocument doc(512);
    JsonArray arr = doc.to<JsonArray>();
    for (auto &cred : knownNetworks) {
        JsonObject obj = arr.createNestedObject();
        obj["ssid"] = cred.ssid;
        obj["pass"] = cred.pass;
    }
    File f = LittleFS.open(WIFI_CRED_FILE, "w");
    if (f) {
        serializeJson(doc, f);
        f.close();
    }
}

void wifiManagerInit() {
    LittleFS.begin();
    loadWifiCredentials();
    Serial.print("Buscando redes conocidas...\n");
    for (auto &cred : knownNetworks) {
        Serial.print("Intentando conectar a: ");
        Serial.println(cred.ssid);
        WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
            delay(200);
        }
        if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            Serial.print("Conectado a WiFi: ");
            Serial.println(cred.ssid);
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            break;
        }
    }
    if (!wifiConnected) {
        Serial.println("No se pudo conectar a redes conocidas. Intentando WiFi por defecto...");
        WiFi.begin(WIFI_SSID, WIFI_PASS);
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
            delay(200);
        }
        if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            Serial.print("Conectado a WiFi por defecto: ");
            Serial.println(WIFI_SSID);
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
        } else {
            Serial.println("No se pudo conectar a ninguna red WiFi.");
        }
    }
}

void wifiManagerLoop() {
    if (WiFi.status() != WL_CONNECTED) {
        if (wifiConnected) {
            wifiConnected = false;
            Serial.println("Conexión WiFi perdida. Intentando reconectar...");
        }
        Serial.println("Buscando redes conocidas para reconectar...");
        for (auto &cred : knownNetworks) {
            Serial.print("Intentando conectar a: ");
            Serial.println(cred.ssid);
            WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
            unsigned long start = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
                delay(200);
            }
            if (WiFi.status() == WL_CONNECTED) {
                wifiConnected = true;
                Serial.print("¡Reconectado a WiFi: ");
                Serial.println(cred.ssid);
                Serial.print("IP: ");
                Serial.println(WiFi.localIP());
                break; // Salir del bucle for si se conecta
            }
        }
    } else {
        wifiConnected = true;
    }
}

void wifiManagerAddSSID(const char* ssid, const char* pass) {
    // Agrega nueva red y guarda en LittleFS
    for (auto &cred : knownNetworks) {
        if (cred.ssid == ssid) return; // Ya existe
    }
    knownNetworks.push_back({ssid, pass});
    saveWifiCredentials();
}

bool isWifiConnected() {
    return wifiConnected;
}
