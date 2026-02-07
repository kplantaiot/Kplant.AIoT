# Firmware ESP8266 - Kittypau IoT

## Informacion general
- **Proyecto**: Kittypau IoT
- **Version**: 1.0.0
- **Plataforma**: ESP8266 (NodeMCU v2)
- **Framework**: Arduino (via PlatformIO)
- **Lenguaje**: C++
- **Filesystem**: LittleFS (para credenciales WiFi y calibracion)

---

## Hardware

### Componentes
| Componente | Cantidad | Funcion |
|------------|----------|---------|
| NodeMCU ESP8266 | 1 | Placa principal con WiFi |
| HX711 | 1 | Amplificador para celda de carga |
| Celda de carga | 1 | 1kg/5kg/10kg segun aplicacion |
| DHT11 o DHT22 | 1 | Sensor temperatura/humedad |
| LDR + 10kOhm | 1 | Sensor de luz (divisor de voltaje) |

### Pinout
| Sensor | Pin NodeMCU | GPIO |
|--------|-------------|------|
| HX711 DOUT | D6 | GPIO12 |
| HX711 SCK | D7 | GPIO13 |
| DHT DATA | D5 | GPIO14 |
| LDR | A0 | ADC (unico pin analogico) |
| LED Status | LED_BUILTIN | GPIO2 (logica invertida) |

### Diagrama de conexiones
```
              NodeMCU ESP8266
        ┌─────────────────────┐
  LDR──┤ A0              D0  │
        │ GND             D1  │
        │ VU              D2  │
        │                 D3  │
        │                 D4  │
        │                 3V3 │
        │                 GND │
        │             D5 ├────── DHT (Data)
        │             D6 ├────── HX711 DOUT
        │             D7 ├────── HX711 SCK
        │             D8  │
        └─────────────────────┘

LDR: 3V3 ── LDR ──┬── A0
                   └── 10kOhm ── GND
```

---

## Estructura del firmware

```
include/
  config.h              # Configuracion global (IDs, pines, MQTT, calibracion)
src/
  main.cpp              # Punto de entrada, setup/loop, intervalos de publicacion
  wifi_manager.cpp/h    # Gestion de multiples redes WiFi con LittleFS
  mqtt_manager.cpp/h    # Conexion MQTT/TLS, comandos, backoff exponencial
  sensors.cpp/h         # Lectura HX711, DHT, LDR con filtrado y calibracion
  led_indicator.cpp/h   # Indicador LED no bloqueante con patrones
platformio.ini          # Configuracion de build PlatformIO
```

---

## Modulos

### wifi_manager
- Almacena multiples credenciales WiFi en `/wifi.json` (LittleFS).
- Recuerda ultima red exitosa en `/last_wifi.txt`.
- Intenta primero la ultima red exitosa (sin escanear).
- Si falla, escanea redes visibles y prueba solo las conocidas.
- Timeout de 5 segundos por intento.
- Soporta comandos remotos: `ADDWIFI` y `REMOVEWIFI` via MQTT.

### mqtt_manager
- Conexion TLS al puerto 8883 con certificado ISRG Root X1 embebido.
- Backoff exponencial para reconexion: 5s -> 10s -> 20s -> 40s -> max 60s.
- Verificacion de heap libre (>20KB) antes de intentar TLS.
- Sistema de eventos (`MqttEvent` + callback) para notificar LED sin acoplamiento.
- Sincronizacion NTP para timestamps precisos.

### sensors
- **HX711 (peso)**: Promedio de 5 muestras, filtro deadband de 2g, calibracion persistente.
- **DHT11/DHT22**: Lectura de temperatura (C) y humedad relativa (%).
- **LDR**: Valor crudo ADC (0-1023), conversion a lux y porcentaje, clasificacion (dark/dim/normal/bright).
- Calibracion guardada en `/calibration.json` (LittleFS).
- Tare y set_scale configurables via MQTT.

### led_indicator
- LED integrado (GPIO2, logica invertida).
- Patron de busqueda WiFi: parpadeo continuo 250ms.
- Eventos MQTT: 1 blink = publish, 2 blinks = subscribe/comando.
- No bloqueante (usa millis, no delay).

---

## Configuracion (config.h)

```c
#define PROJECT_NAME "Kittypau"
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_ID      "KPCL0038"     // Cambiar por dispositivo
#define WIFI_SSID      "Jeivos"       // Red WiFi por defecto
#define WIFI_PASS      "jdayne212"
#define MQTT_BROKER    "cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USERNAME  "Kittypau1"
#define MQTT_PASSWORD  "Kittypau1234"
#define HX711_CALIBRATION_FACTOR 400.0f
#define WEIGHT_DEADBAND          2.0f  // Gramos
```

Para agregar un nuevo dispositivo: cambiar `DEVICE_ID` y reflashear.

---

## Intervalos de publicacion

| Tipo | Intervalo | Constante en main.cpp |
|------|-----------|----------------------|
| SENSORS | 10 segundos | `SENSOR_PUBLISH_INTERVAL` |
| STATUS | 15 segundos | `STATUS_PUBLISH_INTERVAL` |

---

## OTA (Over-The-Air Updates)

- Implementado con ArduinoOTA.
- Hostname configurable = `DEVICE_ID` (ej: `KPCL0038`).
- Permite actualizar firmware via WiFi desde PlatformIO o Arduino IDE.
- Requiere estar en la misma red que el dispositivo.

---

## Estado Online/Offline

- **Online**: inmediato tras primera publicacion MQTT exitosa.
- **Offline**: solo despues de 15 segundos sostenidos sin conexion (grace period).
- Evita alternancia rapida Online/Offline por micro-desconexiones.

---

## Dependencias (platformio.ini)

```ini
[env:nodemcuv2]
platform = espressif8266
board = nodemcuv2
framework = arduino
lib_deps =
    knolleary/PubSubClient @ ^2.8
    bblanchon/ArduinoJson @ ^6.19.4
    bogde/HX711 @ ^0.7.5
    adafruit/DHT sensor library @ ^1.4.2
    adafruit/Adafruit Unified Sensor @ ^1.1.4
monitor_speed = 115200
board_build.filesystem = littlefs
```

---

## Flasheo

```bash
# Primer flasheo (borrar flash + subir)
pio run --target erase -e nodemcuv2
pio run --target upload -e nodemcuv2

# Actualizacion (sin borrar config)
pio run --target upload -e nodemcuv2

# Monitor serial
pio device monitor
```

---

## Hitos completados del firmware

1. [x] Conectividad WiFi con gestion de multiples redes
2. [x] Indicador LED para busqueda/reconexion WiFi
3. [x] Sincronizacion NTP para timestamps
4. [x] Conexion MQTT/TLS con certificado ISRG Root X1
5. [x] Backoff exponencial para reconexion MQTT (5s-60s)
6. [x] Indicador LED para eventos MQTT (publish/subscribe)
7. [x] Publicacion periodica de sensores y estado
8. [x] Calibracion del sensor de peso via MQTT + persistencia LittleFS
9. [x] Gestion dinamica de credenciales WiFi via MQTT (ADDWIFI/REMOVEWIFI)
10. [x] Estado Online/Offline con debounce de 15 segundos
11. [x] Refactorizacion modular (wifi, mqtt, sensors, led desacoplados)
12. [x] Actualizaciones OTA (ArduinoOTA)
13. [x] Filtro deadband de 2g para estabilidad del peso
14. [x] Verificacion de memoria heap antes de TLS (>20KB)

---

## Dispositivos conocidos

| DEVICE_ID | Descripcion |
|-----------|-------------|
| KPCL0036 | Primer prototipo |
| KPCL0037 | Segundo prototipo |
| KPCL0038 | Tercero (configurado actualmente en config.h) |

---

## Fuente
Basado en `include/config.h`, `src/*.cpp`, `platformio.ini`, `MANUAL_USUARIO.md`, y `Hitos-Pendientes.md` del repositorio.
