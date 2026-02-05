
#include "sensors.h"
#include "config.h"
#include "mqtt_manager.h"
#include <HX711.h>
#include <DHT.h>
#include <algorithm> // Para std::min y std::max
#include <time.h>    // Para time(nullptr)
#include <LittleFS.h>  // Added for calibration persistence
#include <ArduinoJson.h> // Added for calibration persistence

static HX711 scale;
static DHT dht(PIN_DHT, DHT11);

void sensorsInit() {
    scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
    
    // --- CALIBRACIÓN DE LA BÁSCULA ---
    // 1. Carga y fija el factor de escala desde LittleFS
    float calibration_factor = loadCalibrationFactor();
    scale.set_scale(calibration_factor);
    // 2. Pone la báscula a cero (tara) al iniciar
    scale.tare();

    dht.begin();
    pinMode(PIN_LDR, INPUT);
}

String sensorsReadAndPublish() { // Cambiado el tipo de retorno a String
    String sensor_health_status = "OK"; // Variable para el estado de salud de los sensores
    float weight = 0, temp = 0, hum = 0, ldr_raw = 0, ldr_scaled = 0;

    // HX711
    if (scale.is_ready()) {
        long raw_value = scale.get_value(); // Get raw value
        Serial.print("Raw HX711 value: ");
        Serial.println(raw_value);
        weight = scale.get_units(5);
        // Limitar el valor al rango máximo definido por el usuario (0-1000g)
        weight = std::max(0.0f, std::min(weight, MAX_WEIGHT_G));
    } else {
        sensor_health_status = "ERR_HX711";
    }

    // DHT
    temp = dht.readTemperature();
    hum = dht.readHumidity();
    // Comprobar si hay errores de lectura (NaN o valores fuera de un rango físico realista para DHT11)
    if (isnan(temp) || isnan(hum) || temp < 0.0f || temp > 50.0f || hum < 20.0f || hum > 90.0f) {
        if (sensor_health_status == "OK") { // No sobrescribir errores de HX711 si ya existe
            sensor_health_status = "ERR_DHT";
        }
    }

    // LDR
    ldr_raw = analogRead(PIN_LDR);
    // Escalar de 0-1023 a 0-MAX_LUX y ajustar rango
    ldr_scaled = (ldr_raw / ADC_MAX_VALUE) * MAX_LUX;
    ldr_scaled = std::max(0.0f, std::min(ldr_scaled, MAX_LUX));


    // Publicar datos (solo si no hay errores de lectura de DHT y HX711)
    char payload[256];
    time_t rawtime;
    struct tm * timeinfo;
    char timestamp_str[20]; // MM-dd-aaaa HH:mm:ss + null terminator

    time(&rawtime);
    timeinfo = localtime(&rawtime);

    // Formato: MM-dd-aaaa HH:mm:ss
    strftime(timestamp_str, sizeof(timestamp_str), "%m-%d-%Y %H:%M:%S", timeinfo);

    if (sensor_health_status == "ERR_DHT") {
      // En caso de error de DHT, no enviar valores incorrectos
      snprintf(payload, sizeof(payload), "{\"timestamp\":\"%s\",\"weight\":%.2f,\"temp\":null,\"hum\":null,\"ldr\":%.0f}", timestamp_str, weight, ldr_scaled);
    } else {
      snprintf(payload, sizeof(payload), "{\"timestamp\":\"%s\",\"weight\":%.2f,\"temp\":%.2f,\"hum\":%.2f,\"ldr\":%.0f}", timestamp_str, weight, temp, hum, ldr_scaled);
    }
    mqttManagerPublishSensorData(payload);

    return sensor_health_status; // Devolver el estado de salud de los sensores
}

void sensorsTareWeight() {
    Serial.println("Calibrando báscula: Taring...");
    scale.tare();
    Serial.println("Báscula tarada.");
}

void sensorsSetCalibrationFactor(float factor) {
    Serial.print("Calibrando báscula: Estableciendo factor de escala a ");
    Serial.println(factor);
    scale.set_scale(factor);
    Serial.println("Factor de escala establecido.");
    saveCalibrationFactor(factor); // Save to LittleFS
}

float loadCalibrationFactor() {
    float factor = HX711_CALIBRATION_FACTOR; // Default factor from config.h
    Serial.print("Intentando cargar factor de calibración desde ");
    Serial.println(CALIBRATION_FILE);

    if (LittleFS.exists(CALIBRATION_FILE)) {
        Serial.println("Archivo de calibración encontrado.");
        File file = LittleFS.open(CALIBRATION_FILE, "r");
        if (file) {
            Serial.print("Tamaño del archivo de calibración: ");
            Serial.println(file.size());
            DynamicJsonDocument doc(64);
            DeserializationError error = deserializeJson(doc, file);
            if (!error) {
                if (doc.containsKey("factor")) {
                    factor = doc["factor"].as<float>();
                    Serial.print("Factor de calibración cargado exitosamente de LittleFS: ");
                    Serial.println(factor, 4); // Print with 4 decimal places
                } else {
                    Serial.println("Error: Archivo de calibración no contiene la clave 'factor'.");
                }
            } else {
                Serial.print("Error al parsear archivo de calibración (deserializeJson): ");
                Serial.println(error.c_str());
            }
            file.close();
        } else {
            Serial.println("Error: No se pudo abrir el archivo de calibración para lectura.");
        }
    } else {
        Serial.println("Archivo de calibración NO encontrado, usando factor por defecto.");
    }
    Serial.print("Factor de calibración final: ");
    Serial.println(factor, 4);
    return factor;
}

void saveCalibrationFactor(float factor) {
    Serial.print("Intentando guardar factor de calibración: ");
    Serial.println(factor, 4);
    File file = LittleFS.open(CALIBRATION_FILE, "w");
    if (file) {
        DynamicJsonDocument doc(64);
        doc["factor"] = factor;
        Serial.print("Serializando JSON para guardar...");
        size_t bytesWritten = serializeJson(doc, file);
        if (bytesWritten == 0) {
            Serial.println("Error al escribir el archivo de calibración (serializeJson devolvió 0).");
        } else {
            Serial.print("Factor de calibración guardado en LittleFS. Bytes escritos: ");
            Serial.println(bytesWritten);
        }
        file.close();
    } else {
        Serial.println("Error: No se pudo abrir el archivo de calibración para escritura.");
    }
}
