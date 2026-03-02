# Registro de Firmware por Dispositivo

**Version actual:** v1.2
**Fecha de corte:** 2026-03-02

---

## Cambios v1.2 (2026-03-02)

**Bug fix WiFi crítico (ambos firmwares):**
- `WiFi.disconnect(false)` en lugar de `WiFi.disconnect(true)` — evita apagar el radio antes de `WiFi.begin()`
- `delay(150)` + `WiFi.mode(WIFI_STA)` explícito antes de cada intento de conexión
- `WIFI_CONNECT_TIMEOUT` aumentado a 12000ms (era 5000ms en ESP8266, 8000ms en ESP32-CAM)
- Rate limiter en `wifiManagerLoop()` — backoff de 20s entre ciclos fallidos (solo ESP8266)

Síntoma previo: Estado 7 (WL_DISCONNECTED) al intentar reconectar, crash loop en algún dispositivo.

---

## Cambios v1.1 (2026-02-14)

- WiFi credential loading normalizado: siempre carga redes hardcoded + merge desde filesystem (LittleFS/SPIFFS)
- 6 redes WiFi hardcoded en ambos firmwares (Jeivos, Casa 15, Suarez_Mujica_891, Mauro, VTR-2736410_2g)
- Correccion de DEVICE_ID en config.h
- ArduinoOTA habilitado en ambos firmwares

---

## ESP8266 (NodeMCU v3 CP2102)

**Firmware:** `c:\Kittypau\6 _KPCL0036_1b\firmware-esp8266`

| DEVICE_ID | Version | Metodo | IP actual | WiFi actual | Ultima vez visto | sensor_health | Estado |
|-----------|---------|--------|-----------|-------------|------------------|---------------|--------|
| KPCL0034 | v1.2 | USB COM10 | 192.168.100.94 | Suarez_Mujica_891 | 2026-03-02 | OK | Actualizado |
| KPCL0035 | v1.2 | USB COM10 | 192.168.100.95 | Suarez_Mujica_891 | 2026-03-02 | ERR_HX711 | Actualizado |
| KPCL0036 | v1.2 | USB COM10 | 192.168.100.106 | Suarez_Mujica_891 | 2026-03-02 | ERR_DHT | Actualizado |
| KPCL0037 | v1.2 | USB COM10 | 192.168.100.209 | Suarez_Mujica_891 | 2026-03-02 | OK | Actualizado |
| KPCL0038 | v1.2 | USB COM10 | 192.168.100.96 | Suarez_Mujica_891 | 2026-03-02 | ERR_HX711 | Actualizado |
| KPCL0033 | v1.0 | - | 192.168.100.208 | Suarez_Mujica_891 | 2026-02-13 | OK | Pendiente v1.2 (no disponible) |
| KPCL0031 | v1.0 | - | - | - | 2026-02-10 | - | Pendiente v1.2 (offline) |
| KPCL0039 | v1.0 | - | - | - | 2026-02-10 | - | Pendiente v1.2 (offline) |

---

## ESP32-CAM (AI-Thinker)

**Firmware:** `c:\Kittypau\6 _KPCL0036_1b\firmware-esp32cam`

| DEVICE_ID | Version | Metodo | IP actual | WiFi actual | Ultima vez visto | sensor_health | Stream URL | Estado |
|-----------|---------|--------|-----------|-------------|------------------|---------------|------------|--------|
| KPCL0040 | v1.2 | USB COM11 | 192.168.100.66 | Suarez_Mujica_891 | 2026-03-02 | ERR_HX711 | http://192.168.100.66:81/stream | Actualizado |
| KPCL0041 | v1.2 | USB COM11 | 192.168.100.65 | Suarez_Mujica_891 | 2026-03-02 | ERR_HX711 | http://192.168.100.65:81/stream | Actualizado |

---

## Notas

- **ERR_HX711**: celda de carga no conectada al momento del flash — no es error de firmware.
- **ERR_DHT**: sensor DHT11 no conectado — no es error de firmware.
- **OK**: todos los sensores respondiendo correctamente.
- OTA no funciona en ESP32-CAM (v1.0 no responde a invitaciones OTA). Se usa USB.
- KPCL0038 fue flasheado accidentalmente como KPCL0035 via OTA (2026-03-02) y luego recuperado por USB.
- KPCL0034 entró en crash loop (firmware corrupto en flash) y fue reflasheado por USB el 2026-03-02.
- Datos de IP/WiFi obtenidos de Supabase (tabla `devices`).
- Actualizar este registro cada vez que se flashee un dispositivo.
