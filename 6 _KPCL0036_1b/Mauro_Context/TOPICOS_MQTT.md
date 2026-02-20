# Topicos MQTT - Kittypau IoT (referencia)

## Broker (HiveMQ Cloud)
- **Servicio**: HiveMQ Cloud
- **Host**: `<TU_HOST_HIVEMQ>` (ver .env del bridge)
- **Puerto**: `8883` (MQTT sobre TLS)
- **Certificado**: ISRG Root X1 (Let's Encrypt)
- **Credenciales**: se gestionan por `.env` en el bridge (no documentar en texto plano)

---

## Convencion de topics
Patron general:
- `{DEVICE_ID}/SENSORS`
- `{DEVICE_ID}/STATUS`
- `{DEVICE_ID}/cmd`

Ejemplos (dispositivos KPCL):
- `KPCL0038/SENSORS`
- `KPCL0038/STATUS`
- `KPCL0038/cmd`

Ejemplo (bridge RPi):
- `KPBR0001/STATUS`

El bridge se suscribe con wildcard:
- `+/SENSORS`
- `+/STATUS`

Y filtra por prefijo `KPCL` + acepta `KPBR0001`.

---

## Topics publicados (Dispositivo -> Broker)

### 1) `{DEVICE_ID}/SENSORS` (ESP8266/ESP32-CAM)
- **Frecuencia**: cada 10 segundos
- **Payload JSON (v1.1)**:
```json
{
  "device_id": "KPCL0035",
  "weight": 125.50,
  "temp": 24.30,
  "hum": 65.00,
  "light": {
    "raw": 450,
    "lux": 320.5,
    "%": 44,
    "condition": "normal"
  },
  "timestamp": "2026-02-15T14:30:00Z"
}
```

| Campo | Tipo | Descripcion |
|---|---|---|
| `device_id` | string | ID del dispositivo (KPCLxxxx) |
| `weight` | float | Peso en gramos (filtro deadband 2g) |
| `temp` | float/null | Temperatura en C (null si DHT falla) |
| `hum` | float/null | Humedad % (null si DHT falla) |
| `light.raw` | int | ADC 0-1023 |
| `light.lux` | float | Iluminancia estimada |
| `light.%` | int | Porcentaje de luz 0-100 |
| `light.condition` | string | `dark`/`dim`/`normal`/`bright` |
| `timestamp` | string | ISO 8601 UTC (ej: `2026-02-15T14:30:00Z`) |

### 2) `{DEVICE_ID}/STATUS` (ESP8266/ESP32-CAM)
- **Frecuencia**: cada 15 segundos
- **Payload JSON (v1.1)**:
```json
{
  "device_id": "KPCL0035",
  "device_type": "comedero",
  "device_model": "NodeMCU ESP8266",
  "wifi_status": "Conectado",
  "wifi_ssid": "Casa 15",
  "wifi_ip": "192.168.1.91",
  "KPCL0035": "Online",
  "sensor_health": "OK",
  "timestamp": "2026-02-15T14:30:15Z"
}
```

| Campo | Tipo | Valores |
|---|---|---|
| `device_id` | string | ID del dispositivo |
| `device_type` | string | `comedero`/`bebedero`/`comedero_cam`/`bebedero_cam` |
| `device_model` | string | `NodeMCU ESP8266` o `AI-Thinker ESP32-CAM` |
| `wifi_status` | string | `Conectado` / `Desconectado` |
| `wifi_ssid` | string | SSID actual |
| `wifi_ip` | string | IP local |
| `{DEVICE_ID}` | string | `Online` / `Offline` (campo dinamico) |
| `sensor_health` | string | `OK` / `ERR_DHT` / `ERR_HX711` / etc. |
| `timestamp` | string | ISO 8601 UTC |

### 3) `KPBR0001/STATUS` (Bridge RPi)
- **Frecuencia**: cada 60 segundos
- **Publicado por**: bridge.js en la RPi
- **Payload JSON**:
```json
{
  "device_id": "KPBR0001",
  "device_type": "bridge",
  "device_model": "Raspberry Pi Zero 2 W",
  "hostname": "kittypau-bridge",
  "wifi_ssid": "Casa 15",
  "wifi_ip": "192.168.1.93",
  "uptime_min": 1440,
  "ram_used_mb": 229,
  "ram_total_mb": 426,
  "disk_used_pct": 19,
  "cpu_temp": 45.2,
  "bridge_status": "active",
  "timestamp": "2026-02-15T14:30:00Z"
}
```

| Campo | Tipo | Descripcion |
|---|---|---|
| `device_id` | string | Siempre `KPBR0001` |
| `device_type` | string | Siempre `bridge` |
| `device_model` | string | `Raspberry Pi Zero 2 W` |
| `hostname` | string | Hostname de la RPi |
| `wifi_ssid` | string | Red WiFi actual |
| `wifi_ip` | string | IP local de la RPi |
| `uptime_min` | int | Minutos desde boot |
| `ram_used_mb` | int | RAM usada en MB |
| `ram_total_mb` | int | RAM total en MB |
| `disk_used_pct` | int | % disco usado |
| `cpu_temp` | float | Temperatura CPU en C |
| `bridge_status` | string | `active` |
| `timestamp` | string | ISO 8601 UTC |

---

## Topics suscritos (Broker -> Dispositivo)

### `{DEVICE_ID}/cmd`
Comandos remotos al dispositivo.

#### ADDWIFI
```json
{
  "command": "ADDWIFI",
  "ssid": "NombreRed",
  "pass": "ClaveRed"
}
```

#### REMOVEWIFI
```json
{
  "command": "REMOVEWIFI",
  "ssid": "NombreRed"
}
```

#### CALIBRATE_WEIGHT (tare)
```json
{
  "command": "CALIBRATE_WEIGHT",
  "action": "tare"
}
```

#### CALIBRATE_WEIGHT (set_scale)
```json
{
  "command": "CALIBRATE_WEIGHT",
  "action": "set_scale",
  "factor": 4205.70
}
```

---

## Mapeo hacia Supabase (Bridge)

El bridge mapea `{DEVICE_ID}/SENSORS` directamente a tabla `sensor_readings`:

| MQTT payload | Supabase column |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `light.lux` | `light_lux` |
| `light.%` | `light_percent` |
| `light.condition` | `light_condition` |
| `timestamp` | `device_timestamp` |
| (topic prefix) | `device_id` |

El bridge mapea `{DEVICE_ID}/STATUS` a UPDATE en tabla `devices`:

| MQTT payload | Supabase column |
|---|---|
| `wifi_status` | `wifi_status` |
| `wifi_ssid` | `wifi_ssid` |
| `wifi_ip` | `wifi_ip` |
| `sensor_health` | `sensor_health` |
| `device_type` | `device_type` |
| `device_model` | `device_model` |
| (auto) | `last_seen` (ISO 8601 UTC) |
| (auto) | `device_state` = `'linked'` |

**Nota**: El bridge escribe directamente a Supabase (service_role), no pasa por webhook API.
