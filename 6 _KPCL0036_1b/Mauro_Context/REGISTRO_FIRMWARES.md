# Registro de Firmware por Dispositivo

**Version actual:** v1.1
**Fecha de corte:** 2026-02-14

---

## Cambios v1.1 (2026-02-14)

- WiFi credential loading normalizado: siempre carga redes hardcoded + merge desde filesystem (LittleFS/SPIFFS)
- 6 redes WiFi hardcoded en ambos firmwares (Jeivos, Casa 15, Suarez_Mujica_891, Mauro, VTR-2736410_2g)
- Correccion de DEVICE_ID en config.h (KPCL0038→KPCL0035, KPCL0041→KPCL0040)
- ArduinoOTA habilitado en ambos firmwares

---

## ESP8266 (NodeMCU v2)

**Firmware:** `c:\Kittypau\6 _KPCL0036_1b\firmware-esp8266`

| DEVICE_ID | Version | Metodo | Puerto/IP | WiFi actual | Ultima vez visto | Estado |
|-----------|---------|--------|-----------|-------------|------------------|--------|
| KPCL0035 | v1.1 | OTA | 192.168.1.91 | Casa 15 | 2026-02-15 | Actualizado |
| KPCL0033 | v1.0 | USB | COM10 | Suarez_Mujica_891 | 2026-02-13 | Pendiente v1.1 |
| KPCL0034 | v1.0 | USB | COM10 | Suarez_Mujica_891 | 2026-02-13 | Pendiente v1.1 |
| KPCL0037 | v1.0 | USB | COM10 | Suarez_Mujica_891 | 2026-02-13 | Pendiente v1.1 |
| KPCL0038 | v1.1 | OTA | 192.168.1.87 | Casa 15 | 2026-02-15 | Actualizado |
| KPCL0031 | v1.0 | OTA | - | - | 2026-02-10 | Pendiente v1.1 (offline) |
| KPCL0036 | v1.0 | - | - | Jeivos | 2026-02-13 | Pendiente v1.1 (sin IP) |

---

## ESP32-CAM (AI-Thinker)

**Firmware:** `c:\Kittypau\6 _KPCL0036_1b\firmware-esp32cam`

| DEVICE_ID | Version | Metodo | Puerto/IP | WiFi actual | Ultima vez visto | Estado |
|-----------|---------|--------|-----------|-------------|------------------|--------|
| KPCL0040 | v1.1 | USB | COM8 | Casa 15 | 2026-02-15 | Actualizado |
| KPCL0041 | v1.0 | USB | COM8 | Casa 15 | 2026-02-15 | Pendiente v1.1 |

---

## Notas

- v1.0: firmware con WiFi unificado, OTA, backoff MQTT, status extendido.
- v1.1: WiFi merge normalizado (hardcoded siempre + filesystem), correccion DEVICE_ID.
- OTA no funciono en ESP32-CAM (v1.0 no responde a invitaciones OTA). Se uso USB.
- Actualizar este registro cada vez que se flashee un dispositivo.
- Datos de IP/WiFi obtenidos de Supabase (tabla `devices`).
