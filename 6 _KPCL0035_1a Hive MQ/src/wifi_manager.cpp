// wifi_manager.cpp
// Gestión de WiFi y credenciales usando LittleFS
#include "wifi_manager.h"
#include "config.h"
#include "led_indicator.h" // Incluir led_indicator para usar las funciones del LED
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <vector>

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
    Serial.println("LittleFS iniciado."); // Added for debug
    loadWifiCredentials();
    printKnownNetworks(); // Added for debug
    WiFi.mode(WIFI_STA); // Set WiFi to station mode
    Serial.print("Buscando redes conocidas...\n");
    startWifiBlink(); // Start blinking when searching for WiFi

    for (auto &cred : knownNetworks) {
        Serial.print("Intentando conectar a: ");
        Serial.println(cred.ssid);
        WiFi.disconnect(true); // Disconnect before new attempt
        WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
            handleLedIndicator(); // Update non-blocking blink
            delay(500); // Increased delay
        }
        if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            Serial.print("Conectado a WiFi: ");
            Serial.println(cred.ssid);
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            stopWifiBlink(); // Stop blinking on success
            return; // Conectado, salir de la función
        } else {
            Serial.print("Fallo al conectar a ");
            Serial.print(cred.ssid);
            Serial.print(", Estado: ");
            Serial.println(WiFi.status());
        }
    }
    if (!wifiConnected) {
        Serial.println("No se pudo conectar a redes conocidas. Intentando WiFi por defecto...");
        WiFi.disconnect(true); // Disconnect before default attempt
        WiFi.begin(WIFI_SSID, WIFI_PASS);
        unsigned long start = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
            handleLedIndicator(); // Update non-blocking blink
            delay(500); // Increased delay
        }
        if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            Serial.print("Conectado a WiFi por defecto: ");
            Serial.println(WIFI_SSID);
            Serial.print("IP: ");
            Serial.println(WiFi.localIP());
            stopWifiBlink(); // Stop blinking on success
        } else {
            Serial.println("No se pudo conectar a ninguna red WiFi.");
            Serial.print("Estado final: ");
            Serial.println(WiFi.status());
            stopWifiBlink(); // Stop blinking on failure
        }
    }
}

void wifiManagerLoop() {
    if (WiFi.status() != WL_CONNECTED) {
        if (wifiConnected) {
            wifiConnected = false;
            Serial.println("Conexión WiFi perdida. Intentando reconectar...");
            startWifiBlink(); // Start blinking when reconnection starts
        }
        Serial.println("Buscando redes conocidas para reconectar...");
        for (auto &cred : knownNetworks) {
            Serial.print("Intentando conectar a: ");
            Serial.println(cred.ssid);
            WiFi.disconnect(true); // Disconnect before new attempt
            WiFi.begin(cred.ssid.c_str(), cred.pass.c_str());
            unsigned long start = millis();
            while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
                handleLedIndicator(); // Update non-blocking blink
                delay(500); // Increased delay
            }
            if (WiFi.status() == WL_CONNECTED) {
                wifiConnected = true;
                Serial.print("¡Reconectado a WiFi: ");
                Serial.println(cred.ssid);
                Serial.print("IP: ");
                Serial.println(WiFi.localIP());
                stopWifiBlink(); // Stop blinking on success
                return; // Conectado, salir de la función
            } else {
                            Serial.print("Fallo al reconectar a ");
                            Serial.print(cred.ssid);
                            Serial.print(", Estado: ");
                            Serial.println(WiFi.status());            }
        }
        // Si el bucle termina y aún no está conectado, el parpadeo de búsqueda continuará
        // hasta que wifiManagerLoop se llame de nuevo o se conecte.
        if (!wifiConnected) {
            Serial.println("No se pudo reconectar a ninguna red conocida.");
            Serial.print("Estado final: ");
            Serial.println(WiFi.status());
        }
    } else {
        if (!wifiConnected) { // If just connected
            stopWifiBlink(); // Ensure blinking stops
        }
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

void wifiManagerRemoveSSID(const char* ssidToRemove) {
    bool removed = false;
    // Use an iterator to safely remove elements
    for (auto it = knownNetworks.begin(); it != knownNetworks.end(); ) {
        if (it->ssid.equalsIgnoreCase(ssidToRemove)) { // Case-insensitive comparison
            it = knownNetworks.erase(it);
            removed = true;
            Serial.print("Red WiFi ");
            Serial.print(ssidToRemove);
            Serial.println(" eliminada de la lista conocida.");
        } else {
            ++it;
        }
    }
    if (removed) {
        saveWifiCredentials(); // Save changes to LittleFS
    } else {
        Serial.print("Red WiFi ");
        Serial.print(ssidToRemove);
        Serial.println(" no encontrada en la lista conocida.");
    }
}

bool isWifiConnected() {
    return wifiConnected;
}

void printKnownNetworks() {
    Serial.println("--- Redes WiFi Conocidas ---");
    if (knownNetworks.empty()) {
        Serial.println("Ninguna red conocida.");
    } else {
        for (const auto& cred : knownNetworks) {
            Serial.print("SSID: ");
            Serial.print(cred.ssid);
            Serial.print(", PASS: ");
            Serial.println(cred.pass);
        }
    }
    Serial.println("--------------------------");
}

