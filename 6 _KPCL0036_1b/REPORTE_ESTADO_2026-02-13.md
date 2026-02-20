# REPORTE DE ESTADO - Kittypau IoT
**Fecha:** 2026-02-13 | **Red activa:** Suarez_Mujica_891

---

## 1. FLUJO COMPLETO DEL SISTEMA

```
ESP8266/ESP32-CAM  --MQTT/TLS:8883-->  HiveMQ Cloud  --wildcard-->  RPi Bridge (KPBR0001)  --REST API-->  Supabase
                                                                                                             |
                                                                                                      kittypau-app
                                                                                                     (Next.js 16)
                                                                                                     localhost:3000
```

---

## 2. FIRMWARE ESP8266 (KPCL0038 en config.h)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| WiFi "Suarez_Mujica_891" | **Configurado** | Password: SuarezMujica891, como red fallback |
| WiFi "Casa 15" | **Configurado** | Red primaria |
| MQTT Broker | **HiveMQ Cloud** | cf8e2e...s1.eu.hivemq.cloud:8883 TLS con cert ISRG Root X1 |
| MQTT User/Pass | Kittypau1 / Kittypau1234 | Hardcoded en config |
| Topic SENSORS | KPCL0038/SENSORS | Cada 10s, QoS 0 |
| Topic STATUS | KPCL0038/STATUS | Cada 15s, QoS 1, **retained** |
| Topic CMD | KPCL0038/cmd | Suscrito (ADDWIFI, REMOVEWIFI, CALIBRATE_WEIGHT) |
| Timestamp | **ISO 8601 UTC** | YYYY-MM-DDTHH:MM:SSZ via NTP |
| Sensores | HX711 (GPIO12/13), DHT11 (GPIO14), LDR (A0) | Deadband 2g, validacion -10 a 120C |
| OTA | **Habilitado** | ArduinoOTA, IP target: 192.168.1.92 |
| LED indicador | GPIO2 | Parpadeo no-bloqueante |
| device_type | comedero | Reportado en STATUS |
| device_model | NodeMCU v3 CP2102 | Reportado en STATUS |

**Payload SENSORS:**
```json
{"timestamp":"2026-02-13T14:23:45Z","weight":245.5,"temp":22.5,"hum":65.3,"light":{"lux":450.7,"%":45,"condition":"normal"}}
```

---

## 3. FIRMWARE ESP32-CAM (KPCL0041 en config.h)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| WiFi "Suarez_Mujica_891" | **Configurado** | Red fallback, misma password |
| MQTT | Mismo broker HiveMQ | TLS pero .setInsecure() (sin validacion de cert) |
| Topics | KPCL0041/SENSORS, KPCL0041/STATUS, KPCL0041/cmd | Mismos intervalos 10s/15s |
| Camara | OV2640, VGA 640x480, JPEG Q12 | Mirror+Flip habilitados (montaje invertido) |
| Web UI | Puerto 80 (capture, save, list, flash, delete) | Sin autenticacion |
| Stream MJPEG | Puerto 81 /stream | URL reportada en STATUS |
| Capturas ML | SPIFFS, max 50 imagenes | Download individual o TAR |
| Sensores | HX711 (GPIO13/14), DHT11 (GPIO15) | Sin LDR |
| OTA | IP target: 192.168.1.91 | |
| device_type | comedero_cam | |
| device_model | AI-Thinker ESP32-CAM | |

---

## 4. BRIDGE RPi (v2.3 - KPBR0001)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Version | **v2.3** | Ultima desplegada 2026-02-09 |
| Runtime | Node.js v20 | 56 paquetes npm |
| Suscripcion MQTT | +/SENSORS, +/STATUS | **Wildcard** |
| Auto-registro | **Activo** | Nuevo device_id se inserta como factory |
| Mapeo de campos | weight->weight_grams, temp->temperature, hum->humidity | + light |
| IP History | **Activo** | Detecta cambios de IP en JSONB |
| Status propio | KPBR0001/STATUS cada 60s | RAM, CPU temp, disk, WiFi |
| Supabase key | **service_role JWT** | Bypass RLS |
| Systemd | kittypau-bridge.service | Restart=always, RestartSec=5 |
| WiFi RPi | Jeivos, Casa 15, **Suarez_Mujica_891** | 3 redes |

**Dispositivos registrados (8):**

| Device | Tipo | Sensor Health |
|--------|------|---------------|
| KPCL0031 | ESP8266 | ERR_HX711 |
| KPCL0033 | ESP8266 | **OK** (unico 100%) |
| KPCL0035 | ESP8266 | ERR_HX711 + ERR_DHT |
| KPCL0036 | ESP8266 | ERR_DHT |
| KPCL0037 | ESP8266 | ERR_HX711 |
| KPCL0038 | ESP8266 | ERR_HX711 |
| KPCL0040 | ESP32-CAM | ERR_HX711 |
| KPCL0041 | ESP32-CAM | Por verificar |

---

## 5. SUPABASE

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Proyecto | zgwqtzazvkjkfocxnxsh.supabase.co | Operativo |
| Schema | SQL_UNIFICADO + V2 + V3 + V4 | 7 tablas + vistas + triggers + RLS |
| Tablas principales | devices (PK=device_id TEXT), sensor_readings (BIGSERIAL) | FK directa |
| Vistas | latest_readings, device_summary | Con device_type + device_model (V4) |
| Trigger | trg_reading_updates_device | Auto-actualiza last_seen |
| RLS | Habilitado en 6 tablas | Bridge usa service_role |

---

## 6. WEB APP (kittypau-app)

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Framework | Next.js 16.1.6 + React 19 + TypeScript | App Router |
| Auth | **Funcional** | Login/registro email+password |
| Dashboard /today | **Funcional** | Grid de 8 dispositivos |
| Detalle /today/[deviceId] | **Funcional** | Info cards + 2 graficos Recharts |
| Realtime | **NO implementado** | Solo datos al cargar pagina |
| Deploy Vercel | **Pendiente** | Solo localhost:3000 |

---

## 7. PENDIENTES CRITICOS

| # | Pendiente | Fase |
|---|-----------|------|
| 20 | Definir flujo QR -> claim device | FASE 0 |
| 27 | Tailscale para acceso remoto RPi | FASE 1 |
| 33 | 7 de 8 dispositivos con errores de sensores | FASE 1 |
| 38 | Supabase Realtime en web app | FASE 2 |
| 40-42 | Push GitHub + Deploy Vercel + Test E2E | FASE 3 |
