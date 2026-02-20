# Arquitectura Completa Kittypau (Actual - 2026-02-15)

## Objetivo
Arquitectura real del MVP con Next.js + Supabase + HiveMQ + Raspberry Bridge.

---

## Componentes principales
1. **Frontend + API**: Next.js (App Router) en Vercel (`kittypau-app/`).
2. **DB/Auth/Realtime**: Supabase (PostgreSQL + RLS + Realtime).
3. **MQTT**: HiveMQ Cloud (TLS, puerto 8883).
4. **Bridge 24/7**: Raspberry Pi Zero 2 W (MQTT -> Supabase directo).
5. **Firmware**: ESP8266 (NodeMCU v2) y ESP32-CAM (AI-Thinker).

---

## Flujo de datos (telemetria)
1. ESP8266/ESP32-CAM publica MQTT en HiveMQ (`{DEVICE_ID}/SENSORS`, `{DEVICE_ID}/STATUS`).
2. Bridge en Raspberry escucha `+/SENSORS` y `+/STATUS`.
3. Bridge escribe directamente a Supabase (`sensor_readings`, `devices`, `bridge_heartbeats`).
4. App web consulta Supabase (via server components y/o Realtime).

**Importante**: El bridge ya NO pasa por `/api/mqtt/webhook`. Escribe directamente a Supabase con `service_role` key.

---

## Diagrama alto nivel
```
ESP8266 ─┐
ESP32   ─┤──> HiveMQ Cloud ──> RPi Bridge v2.4 ──> Supabase (DB)
          │        (TLS)         (service_role)         │
          │                                              ↓
          │                                     Next.js App (Vercel)
          │                                              │
          └──────────────── /cmd ◄──────────────────────┘
```

---

## Tablas y Views

### Tablas (escritas por bridge)
| Tabla | FK | Descripcion |
|---|---|---|
| `sensor_readings` | `device_id` (TEXT) | Lecturas de sensores |
| `devices` | `device_id` (TEXT, unique) | Registro de dispositivos |
| `bridge_heartbeats` | `bridge_id` (TEXT, PK) | Telemetria del bridge |

### Tablas (escritas por app)
| Tabla | FK | Descripcion |
|---|---|---|
| `profiles` | `id` (UUID, auth.users) | Perfiles de usuario |
| `pets` | `user_id` (UUID) | Mascotas |
| `breeds` / `pet_breeds` | - | Razas |
| `audit_events` | - | Auditoria |

### Views
| View | Basada en | Descripcion |
|---|---|---|
| `latest_readings` | `sensor_readings` | Ultima lectura por dispositivo |
| `bridge_status_live` | `bridge_heartbeats` + `devices` | Estado del bridge + conteo KPCL |
| `admin_dashboard_live` | `bridge_status_live` + `audit_events` | Dashboard admin |

---

## Endpoints API (Vercel)
1. `POST /api/mqtt/webhook` (legacy, bridge ya no lo usa)
2. `GET/POST /api/pets`
3. `GET/POST /api/devices`
4. `GET /api/readings?device_id=<TEXT>`
5. `GET /api/onboarding/status`

---

## Seguridad
- Bridge usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS.
- App web usa `SUPABASE_ANON_KEY` con RLS activo.
- MQTT protegido con TLS + usuario/password.
- RLS activo en todas las tablas de Supabase.

---

## Repositorio
```
6 _KPCL0036_1b/
  bridge/
    bridge.js              # Bridge v2.4 (runtime en RPi)
  firmware-esp8266/
    include/config.h       # Config dispositivo (DEVICE_ID, pines, MQTT)
    src/                   # Modulos (wifi, mqtt, sensors, led)
    data/wifi.json         # Redes WiFi conocidas
    platformio.ini
  firmware-esp32cam/
    include/config.h       # Config ESP32-CAM
    src/                   # Modulos (wifi, mqtt, sensors, camera, led)
    platformio.ini
  Mauro_Context/           # Documentacion del proyecto
    SQL_SCHEMA.sql         # Esquema SQL actualizado
    .env.test.local        # Credenciales de prueba
    REGISTRO_FIRMWARES.md  # Estado de cada dispositivo
```

---

## Fuentes de verdad
- Arquitectura y endpoints: `ARQUITECTURA_COMPLETA.md`, `FRONT_BACK_APIS.md`
- Esquema DB: `SQL_SCHEMA.sql`
- Bridge: `RASPBERRY_BRIDGE.md`
- Topics MQTT: `TOPICOS_MQTT.md`
- Firmware: `FIRMWARE_ESP8266.md`
- Registro de dispositivos: `REGISTRO_FIRMWARES.md`
