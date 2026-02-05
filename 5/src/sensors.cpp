
#include "sensors.h"
#include "config.h"
#include "mqtt_manager.h"
#include <HX711.h>
#include <DHT.h>
#include <algorithm> // Para std::min y std::max

static HX711 scale;
static DHT dht(PIN_DHT, DHT11);

void sensorsInit() {
    scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
    
    // --- CALIBRACIÓN DE LA BÁSCULA ---
    // 1. Fija el factor de escala desde config.h
    scale.set_scale(HX711_CALIBRATION_FACTOR);
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
    char payload[128];
    if (sensor_health_status == "ERR_DHT") {
      // En caso de error de DHT, no enviar valores incorrectos
      snprintf(payload, sizeof(payload), "{\"weight\":%.2f,\"temp\":null,\"hum\":null,\"ldr\":%.0f}", weight, ldr_scaled);
    } else {
      snprintf(payload, sizeof(payload), "{\"weight\":%.2f,\"temp\":%.2f,\"hum\":%.2f,\"ldr\":%.0f}", weight, temp, hum, ldr_scaled);
    }
    mqttManagerPublishSensorData(payload);

    return sensor_health_status; // Devolver el estado de salud de los sensores
}
