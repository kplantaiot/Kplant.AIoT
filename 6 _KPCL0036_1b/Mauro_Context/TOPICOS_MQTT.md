# Topicos MQTT - Kittypau IoT

## Broker
- **Servicio**: HiveMQ Cloud (Free)
- **URL**: `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud`
- **Puerto**: 8883 (MQTT sobre TLS)
- **Certificado**: ISRG Root X1 (Let's Encrypt), embebido en firmware
- **Credenciales**: usuario `Kittypau1` / password `Kittypau1234`

---

## Convencion de topics

Todos los topics usan el patron `{DEVICE_ID}/{TIPO}`:
- `KPCLXXXX/SENSORS` - Datos de sensores
- `KPCLXXXX/STATUS` - Estado del dispositivo
- `KPCLXXXX/cmd` - Comandos al dispositivo

El bridge usa wildcard para escuchar todos los dispositivos:
- `+/SENSORS` y `+/STATUS`

---

## Topics publicados (Dispositivo -> Broker)

### 1. `KPCLXXXX/SENSORS`
- **Direccion**: ESP8266 -> HiveMQ -> Bridge
- **Frecuencia**: Cada 10 segundos (`SENSOR_PUBLISH_INTERVAL`)
- **Payload JSON**:
```json
{
    "timestamp": "MM-dd-aaaa HH:mm:ss",
    "weight": 125.50,
    "temp": 24.30,
    "hum": 65.00,
    "ldr": 450
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `timestamp` | string | Hora NTP en formato `MM-dd-aaaa HH:mm:ss` |
| `weight` | float | Peso en gramos (celda de carga HX711) |
| `temp` | float/null | Temperatura en C (DHT11/DHT22). `null` si error |
| `hum` | float/null | Humedad relativa %. `null` si error |
| `ldr` | int | Valor crudo del ADC (0-1023) |

### 2. `KPCLXXXX/STATUS`
- **Direccion**: ESP8266 -> HiveMQ -> Bridge
- **Frecuencia**: Cada 15 segundos (`STATUS_PUBLISH_INTERVAL`)
- **Payload JSON**:
```json
{
    "wifi_status": "Conectado",
    "wifi_ssid": "Jeivos",
    "wifi_ip": "192.168.1.105",
    "KPCL0038": "Online",
    "sensor_health": "OK"
}
```

| Campo | Tipo | Valores |
|-------|------|---------|
| `wifi_status` | string | `"Conectado"` / `"Desconectado"` |
| `wifi_ssid` | string | Nombre de la red WiFi (vacio si desconectado) |
| `wifi_ip` | string | IP asignada (vacio si desconectado) |
| `{DEVICE_ID}` | string | `"Online"` / `"Offline"` (el key es dinamico) |
| `sensor_health` | string | `"OK"` / `"ERR_HX711"` / `"ERR_DHT"` / `"Initializing"` |

**Nota**: El campo del estado usa el `DEVICE_ID` como key (ej: `"KPCL0038": "Online"`).

---

## Topics suscritos (Broker -> Dispositivo)

### 1. `KPCLXXXX/cmd`
- **Direccion**: Broker -> ESP8266
- **Uso**: Enviar comandos remotos al dispositivo

#### Comando: ADDWIFI
Agrega una red WiFi a las credenciales almacenadas en LittleFS.
```json
{
    "command": "ADDWIFI",
    "ssid": "NombreRed",
    "pass": "ClaveRed"
}
```

#### Comando: REMOVEWIFI
Elimina una red WiFi de las credenciales almacenadas.
```json
{
    "command": "REMOVEWIFI",
    "ssid": "NombreRed"
}
```

#### Comando: CALIBRATE_WEIGHT (tare)
Pone a cero la bascula (tara).
```json
{
    "command": "CALIBRATE_WEIGHT",
    "action": "tare"
}
```

#### Comando: CALIBRATE_WEIGHT (set_scale)
Establece el factor de calibracion de la celda de carga.
```json
{
    "command": "CALIBRATE_WEIGHT",
    "action": "set_scale",
    "factor": 4205.70
}
```

---

## Como procesa el bridge los topics

El bridge (`bridge/bridge.js`) se suscribe con wildcard:
1. Recibe mensaje en `+/SENSORS` o `+/STATUS`
2. Extrae el `DEVICE_ID` del topic (ej: `KPCL0038/SENSORS` -> `KPCL0038`)
3. Filtra solo dispositivos con prefijo `KPCL`
4. Si el dispositivo no existe en Supabase, lo auto-registra en tabla `devices`
5. Para SENSORS: inserta en `sensor_readings` (weight, temp, hum, light)
6. Para STATUS: actualiza `devices` (wifi_status, wifi_ssid, wifi_ip, status, sensor_health, last_seen)

---

## Diagrama de flujo de mensajes

```
ESP8266                  HiveMQ Cloud              Raspberry Pi           Supabase
   |                         |                         |                     |
   |--- SENSORS (10s) ----->|                         |                     |
   |                         |--- +/SENSORS --------->|                     |
   |                         |                         |--- INSERT -------->|
   |                         |                         |    sensor_readings  |
   |                         |                         |                     |
   |--- STATUS (15s) ------>|                         |                     |
   |                         |--- +/STATUS ---------->|                     |
   |                         |                         |--- UPSERT -------->|
   |                         |                         |    devices          |
   |                         |                         |                     |
   |<-- cmd (manual) -------|                         |                     |
```

---

## Fuente
Basado en `Topicos.md`, `MANUAL_USUARIO.md` seccion 7, y `bridge/bridge.js` del repositorio.
