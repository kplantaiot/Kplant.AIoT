# Resumen: Bridge Raspberry + Supabase (2026-02-09)

## Contexto
Se actualizo el Bridge (Raspberry Pi) para escribir en el nuevo proyecto de Supabase. El flujo operativo es:
ESP8266 -> HiveMQ -> Bridge (Raspberry) -> Supabase

## Flujo completo (conexion hasta Supabase)

```
ESP8266 / ESP32-CAM
   │  (MQTT/TLS 8883)
   ▼
HiveMQ Cloud
   │  (suscripcion wildcard +/STATUS, +/SENSORS)
   ▼
Raspberry Pi Zero 2 W (bridge.js)
   │  (REST API)
   ▼
Supabase (PostgreSQL)
```

### Que se envia desde el dispositivo
- **SENSORS**: peso, temperatura, humedad, luz, timestamp
- **STATUS**: wifi_status, wifi_ssid, wifi_ip, sensor_health, device_model

### Que guarda el bridge en Supabase
- `devices`: estado WiFi, IP, salud de sensores, modelo de placa, last_seen
- `sensor_readings`: lecturas historicas con `device_id` como FK

### Proyecto Supabase activo
- **SUPABASE_URL**: `https://zgwqtzazvkjkfocxnxsh.supabase.co`
- El bridge usa `SUPABASE_SERVICE_ROLE_KEY` desde `/home/kittypau/kittypau-bridge/.env`

## Estado actual
- Bridge en Raspberry: **activo y corriendo** via systemd.
- Supabase: **recibiendo datos** (sensor_readings y status).
- Sensores con errores (ej. `ERR_HX711`) **se ignoran por ahora**.

## Verificaciones en Raspberry
Comandos usados:
```bash
systemctl status kittypau-bridge
journalctl -u kittypau-bridge -n 100 --no-pager
```

Resultado observado (extracto):
- `✓ Sensor data guardado` para KPCL0036 y KPCL0037
- `✓ Status actualizado` para KPCL0036 y KPCL0037

## Ajustes aplicados en Supabase
Se realizaron ajustes para compatibilidad con el bridge:

1) Estructura devices
- Se confirmo que `devices` usa `device_id` (ya renombrado).
- Se agregaron columnas IoT faltantes:
  - `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
  - `notes`, `ip_history`, `retired_at`
- Se creo `updated_at` en `devices` (requerido por trigger).
- Se relajaron columnas `NOT NULL` que el bridge deja vacias:
  - `owner_id`, `pet_id`, `device_type`, `status`, `battery_level`, `last_seen`

2) Lecturas
- Se creo `sensor_readings` con FK a `devices(device_id)`.
- Indices de lectura: por `device_id`, `recorded_at` y combinado.
- Trigger `update_device_last_seen` aplicado.

3) Vistas
- `latest_readings`
- `device_summary` (incluye notes, retired_at)

## SQL aplicados (resumen)

**1) Ajustes en `devices` (nullable y columnas faltantes):**
```sql
ALTER TABLE devices
  ALTER COLUMN owner_id DROP NOT NULL,
  ALTER COLUMN pet_id DROP NOT NULL,
  ALTER COLUMN device_type DROP NOT NULL,
  ALTER COLUMN status DROP NOT NULL,
  ALTER COLUMN battery_level DROP NOT NULL,
  ALTER COLUMN last_seen DROP NOT NULL;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_status TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_ssid TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_ip TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sensor_health TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ip_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE devices SET updated_at = NOW() WHERE updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_key ON devices(device_id);
```

**2) Crear `sensor_readings`:**
```sql
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  weight_grams REAL,
  water_ml REAL,
  temperature REAL,
  humidity REAL,
  light_lux REAL,
  light_percent INTEGER,
  light_condition TEXT CHECK (light_condition IN ('dark', 'dim', 'normal', 'bright')),
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  device_timestamp TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_device_time ON sensor_readings(device_id, recorded_at DESC);
```

**3) Trigger `last_seen`:**
```sql
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.recorded_at,
      updated_at = NOW()
  WHERE device_id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reading_updates_device ON sensor_readings;
CREATE TRIGGER trg_reading_updates_device
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();
```

**4) Vistas:**
```sql
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (sr.device_id)
  sr.device_id,
  sr.weight_grams,
  sr.water_ml,
  sr.temperature,
  sr.humidity,
  sr.light_lux,
  sr.light_percent,
  sr.light_condition,
  sr.recorded_at
FROM sensor_readings sr
ORDER BY sr.device_id, sr.recorded_at DESC;

DROP VIEW IF EXISTS device_summary;
CREATE VIEW device_summary AS
SELECT
  d.id,
  d.device_id,
  d.device_type,
  d.device_state,
  d.wifi_status,
  d.wifi_ssid,
  d.wifi_ip,
  d.sensor_health,
  d.last_seen,
  d.owner_id,
  d.pet_id,
  d.notes,
  d.retired_at,
  p.name AS pet_name,
  lr.weight_grams AS last_weight,
  lr.temperature AS last_temp,
  lr.humidity AS last_humidity,
  lr.recorded_at AS last_reading_at
FROM devices d
LEFT JOIN pets p ON p.id = d.pet_id
LEFT JOIN latest_readings lr ON lr.device_id = d.device_id;
```

## Errores resueltos
Durante la puesta en marcha se corrigieron:
- Key de Supabase en bridge (service_role / anon).
- Esquema incompleto en Supabase.
- Falta de columnas (`device_id`, `updated_at`).
- Restricciones `NOT NULL` que bloqueaban auto-registro.

## Pendiente / Proximo paso
- Se planea **modificar las tablas** y luego validar nuevamente.
- Tras los cambios, repetir:
```bash
sudo systemctl restart kittypau-bridge
journalctl -u kittypau-bridge -n 50 --no-pager
```

## Nota sobre sensores
Errores como `ERR_HX711` se consideran **hardware/calibracion** y no afectan la integracion del bridge.

---

## Actualizacion 2026-02-10: Multi-WiFi + device_type/device_model

### Cambios realizados

**1. Columnas device_type y device_model en Supabase**
- `device_type`: funcion del dispositivo ("comedero", "bebedero", "comedero_cam", "bebedero_cam")
- `device_model`: modelo de placa electronica ("NodeMCU v3 CP2102", "AI-Thinker ESP32-CAM")
- Migracion SQL V4 aplicada en proyecto `zgwqtzazvkjkfocxnxsh`
- Vista `device_summary` actualizada con ambas columnas

**2. Bridge v2.2 actualizado en RPi**
- `handleStatusData()` ahora guarda `device_type` y `device_model` en tabla `devices`
- Archivo `bridge.js` copiado via SCP a `/home/kittypau/kittypau-bridge/`
- Servicio reiniciado y verificado recibiendo datos

**3. Multi-WiFi en RPi**
- Se agregaron 4 redes WiFi adicionales a `network-config` (bootfs):
  - Casa 15, Suarez_Mujica_891, Burgosa5g, Mauro
- Se forzo cloud-init a re-procesar cambiando instance-id en `meta-data`
- Se creo archivo `ssh` en bootfs para garantizar acceso SSH
- RPi conectada exitosamente a "Casa 15" en IP 192.168.1.90

**4. Firmware actualizado (ESP8266 y ESP32-CAM)**
- STATUS payload ahora incluye `device_type` y `device_model`
- KPCL0037 y KPCL0038 flasheados via USB (COM10) con firmware actualizado
- KPCL0037 ya reporta `device_model: "NodeMCU v3 CP2102"` correctamente

### Procedimiento para agregar nueva red WiFi a la RPi
1. Sacar microSD de la Pi
2. Insertar en PC (aparece como E:\)
3. Editar `network-config`: agregar SSID con hash WPA PSK
4. Cambiar `instance-id` en `meta-data` (agregar `-vN`)
5. Crear archivo vacio `ssh` en bootfs
6. Reinsertar SD y encender (boot tarda ~60-90s)

### Generar hash WPA PSK
```bash
python -c "import hashlib; print(hashlib.pbkdf2_hmac('sha1', b'PASSWORD', b'SSID', 4096, 32).hex())"
```

---

## Actualizacion 2026-02-11: OTA masivo + flash ESP32-CAM

### Dispositivos actualizados

| Device | Metodo | device_type | device_model | WiFi | IP |
|--------|--------|-------------|--------------|------|----|
| KPCL0033 | OTA | comedero | NodeMCU v3 CP2102 | Casa 15 | 192.168.1.92 |
| KPCL0034 | OTA | comedero | NodeMCU v3 CP2102 | Casa 15 | 192.168.1.84 |
| KPCL0035 | OTA | comedero | NodeMCU v3 CP2102 | Casa 15 | 192.168.1.88 |
| KPCL0037 | OTA | comedero | NodeMCU v3 CP2102 | Casa 15 | 192.168.1.85 |
| KPCL0038 | OTA | comedero | NodeMCU v3 CP2102 | Casa 15 | 192.168.1.87 |
| KPCL0040 | USB (COM8) | comedero_cam | AI-Thinker ESP32-CAM | Casa 15 | 192.168.1.91 |
| KPCL0041 | USB (COM8) + erase | comedero_cam | AI-Thinker ESP32-CAM | Casa 15 | 192.168.1.93 |

### KPCL0036 - Pendiente
- Ubicado en red **Suarez_Mujica_891** (otra ubicacion geografica)
- Firmware viejo: sin `device_type`, `device_model`, ni `wifi_ip` en STATUS
- No se puede hacer OTA porque ArduinoOTA opera por LAN
- Se envio comando MQTT `ADDWIFI` con "Casa 15" pero no aplica (red no existe en esa ubicacion)
- **Requiere acceso fisico** para actualizar (USB o llevar a Casa 15)

### Procedimiento OTA para ESP8266
1. Editar `firmware-esp8266/include/config.h`: cambiar `DEVICE_ID`
2. Editar `firmware-esp8266/platformio.ini`: cambiar `upload_port` a la IP del dispositivo
3. Ejecutar: `pio run -e ota -t upload`
4. Verificar en bridge: `journalctl -u kittypau-bridge -n 50 | grep KPCLXXXX`

### Procedimiento USB para ESP32-CAM (base ESP32CAM-MB)
1. Editar `firmware-esp32cam/include/config.h`: cambiar `DEVICE_ID`
2. `platformio.ini` ya tiene `upload_port = COM8`
3. **Si la placa tiene firmware previo con wifi.json viejo**: hacer erase primero
   ```
   pio run -e esp32cam -t erase
   ```
4. Flashear: `pio run -e esp32cam -t upload`
5. La base ESP32CAM-MB tiene programador USB integrado (no requiere jumper IO0->GND)
6. Verificar en bridge logs

### Problema resuelto: ESP32-CAM con wifi.json viejo
- El ESP32-CAM usa SPIFFS con archivo `/wifi.json` para guardar redes conocidas
- Si existe `wifi.json`, el firmware usa esas redes en vez de `WIFI_SSID` del config.h
- Placas con firmware anterior tenian redes viejas (Jeivos, Suarez_Mujica_891) en wifi.json
- **Solucion**: `pio run -e esp32cam -t erase` borra toda la flash (incluida SPIFFS), luego reflashear
- Sin wifi.json, el firmware usa `WIFI_SSID` del config.h como fallback

### Problema resuelto: CHECK constraint en Supabase
- El constraint `devices_device_type_check` bloqueaba valores nuevos como "comedero"
- Se corrigio con:
  ```sql
  ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_device_type_check;
  ALTER TABLE devices ADD CONSTRAINT devices_device_type_check
    CHECK (device_type IN ('comedero', 'bebedero', 'comedero_cam', 'bebedero_cam'));
  ```

### Comando MQTT remoto (ADDWIFI)
El firmware ESP8266 soporta comandos via MQTT en el topic `KPCLXXXX/cmd`:
```json
{"command": "ADDWIFI", "ssid": "NombreRed", "pass": "password"}
{"command": "REMOVEWIFI", "ssid": "NombreRed"}
{"command": "CALIBRATE_WEIGHT", "action": "tare"}
{"command": "CALIBRATE_WEIGHT", "action": "set_scale", "factor": 400.0}
```
Para enviar desde la RPi:
```bash
cd /home/kittypau/kittypau-bridge && node -e "
const mqtt = require('mqtt');
const client = mqtt.connect('mqtts://cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud:8883', {
  username: 'Kittypau1', password: 'Kittypau1234', protocolVersion: 5
});
client.on('connect', () => {
  client.publish('KPCL0036/cmd', JSON.stringify({command:'ADDWIFI', ssid:'Red', pass:'pass'}), {qos:1}, () => {
    console.log('Enviado'); client.end(); process.exit(0);
  });
});
"
```
**Nota**: ADDWIFI agrega la red a la lista pero no desconecta la conexion activa. REMOVEWIFI elimina de la lista pero tampoco desconecta. Se requiere reinicio fisico para que el dispositivo intente conectar a la nueva red.

---

## Calibracion HX711 (2026-02-11)

### Procedimiento de calibracion remota via MQTT

1. Vaciar el plato (sin carga)
2. Enviar TARE: `{"command": "CALIBRATE_WEIGHT", "action": "tare"}`
3. Colocar peso conocido (ej. 130g)
4. Esperar siguiente lectura de SENSORS (~30s)
5. Calcular factor: `nuevo_factor = factor_actual * (lectura / peso_real)`
6. Enviar factor: `{"command": "CALIBRATE_WEIGHT", "action": "set_scale", "factor": XXXX}`
7. Verificar siguiente lectura

### Comando rapido (desde RPi)
```bash
ssh -i "C:/Users/Equipo/.ssh/kittypau_rpi" kittypau@192.168.1.90 'cd /home/kittypau/kittypau-bridge && node -e "
const mqtt = require(\"mqtt\");
const client = mqtt.connect(\"mqtts://cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud:8883\", {
  username: \"Kittypau1\", password: \"Kittypau1234\", protocolVersion: 5
});
client.on(\"connect\", () => {
  client.publish(\"KPCLXXXX/cmd\", JSON.stringify({command:\"CALIBRATE_WEIGHT\", action:\"set_scale\", factor: XXXX}), {qos:1}, () => {
    console.log(\"Enviado\"); client.end(); process.exit(0);
  });
});"'
```

### Dispositivos calibrados

| Device | Factor anterior | Factor calibrado | Peso ref | Lectura verificada | Fecha |
|--------|----------------|-----------------|----------|-------------------|-------|
| KPCL0033 | 400.0 | 4301.0 | 130g | 130.05g | 2026-02-11 |

### Notas
- El factor se guarda en `/calibration.json` (LittleFS en ESP8266, SPIFFS en ESP32-CAM)
- Persiste entre reinicios — no requiere reflashear
- El factor por defecto en `config.h` se actualizo de 400.0 a 4301.0 para nuevos dispositivos
- Cada celda HX711 tiene variacion individual, calibrar cada una por separado
- `MAX_WEIGHT_G = 1000.0` clampea lecturas — si el factor es muy bajo, satura a 1000

---

## Actualizacion 2026-02-11 (sesion 2): Timestamp ISO 8601 + rangos DHT + MQTT Explorer

### Fix timestamp ESP8266
- El ESP32-CAM ya usaba formato ISO 8601 UTC (`%Y-%m-%dT%H:%M:%SZ` con `gmtime`)
- El ESP8266 seguia con formato viejo (`%m-%d-%Y %H:%M:%S` con `localtime`)
- **Corregido**: `firmware-esp8266/src/sensors.cpp` linea 68-69 actualizada a `gmtime` + ISO 8601
- Ahora ambos firmwares usan el mismo formato: `2026-02-11T22:57:00Z`

### Fix rangos de validacion DHT (temperatura y humedad)
- Los rangos de validacion eran demasiado restrictivos y descartaban lecturas validas
- Cuando una lectura excedia el rango, el firmware reportaba `ERR_DHT` y enviaba `null`
- **Rangos anteriores**: temp 0-50°C, humedad 20-90%
- **Rangos corregidos**: temp -10 a 120°C, humedad 0 a 100%
- Archivos modificados:
  - `firmware-esp8266/src/sensors.cpp` linea 99
  - `firmware-esp32cam/src/sensors.cpp` linea 90

### OTA aplicado (sesion 2)
Todos los ESP8266 actualizados con ambos fixes (timestamp + rangos DHT):

| Device | IP | Resultado |
|--------|-----|-----------|
| KPCL0033 | 192.168.1.88 | OK |
| KPCL0034 | 192.168.1.85 | OK |
| KPCL0035 | 192.168.1.93 | OK |
| KPCL0037 | 192.168.1.89 | OK |
| KPCL0038 | 192.168.1.92 | OK |

ESP32-CAM (KPCL0040 y KPCL0041) ya tenian el fix de timestamp; el fix de rangos DHT requiere reflash por USB (no soportan OTA).

### Formato MQTT para comandos desde MQTT Explorer
Para enviar comandos manualmente desde MQTT Explorer, usar este formato:

**Topic**: `KPCL0033/cmd` (minusculas)

**Tare (poner a cero)**:
```
CALIBRATE_WEIGHT:tare
```

**Set scale (cambiar factor)**:
```
CALIBRATE_WEIGHT:set_scale:4301
```

**Nota**: El topic usa `cmd` en minusculas. El payload es texto plano con formato `COMANDO:accion[:valor]`, NO JSON.

### Aprendizajes clave
1. **ESP32-CAM no soporta OTA**: La tabla de particiones no incluye particion OTA. Requiere siempre flash por USB con base ESP32CAM-MB
2. **El topic de comandos es en minusculas**: `KPCL0033/cmd` (no `CMD`)
3. **El payload de comandos es texto plano**: `CALIBRATE_WEIGHT:tare` (no JSON)
4. **Timestamp debe usar `gmtime` no `localtime`**: Para consistencia UTC en toda la plataforma
5. **Rangos DHT demasiado estrictos causan perdida de datos**: El sensor puede reportar valores fuera de su rango nominal y siguen siendo utiles

---

## Actualizacion 2026-02-12: Bridge v2.3 + RPi status publishing (KPBR0001)

### Bridge v2.3 — Status de la RPi via MQTT
- Se agrego publicacion periodica del estado de la Raspberry Pi al broker MQTT
- Device ID: **KPBR0001** (prefijo KPBR = Kittypau Bridge)
- Topic: `KPBR0001/STATUS`
- Intervalo: cada 60 segundos
- Archivo modificado: `bridge/bridge.js` (v2.2 → v2.3)

### Payload publicado
```json
{
  "device_id": "KPBR0001",
  "device_type": "bridge",
  "device_model": "Raspberry Pi Zero 2 W",
  "hostname": "kittypau-bridge",
  "wifi_ssid": "Casa 15",
  "wifi_ip": "192.168.1.90",
  "uptime_min": 357,
  "ram_used_mb": 241,
  "ram_total_mb": 426,
  "disk_used_pct": 19,
  "cpu_temp": 49.9,
  "bridge_status": "active",
  "timestamp": "2026-02-12T03:01:04.000Z"
}
```

### Detalles tecnicos
- Usa modulos Node.js `os` (memoria, uptime, hostname) y `child_process.execSync` (SSID, IP, disco, CPU temp)
- SSID obtenido via `nmcli -t -f active,ssid dev wifi` (compatible con locales en/es)
- Temperatura CPU leida de `/sys/class/thermal/thermal_zone0/temp` (milligrados → °C)
- El filtro wildcard del bridge (`DEVICE_PREFIX = 'KPCL'`) ignora sus propios mensajes `KPBR0001/STATUS`
- Visible en MQTT Explorer bajo topic `KPBR0001/STATUS`

### Tailscale
- Tailscale fue **instalado** en la RPi (v1.94.1) pero **no activado** (`tailscale up` pendiente)
- Requiere autenticacion via navegador con cuenta Tailscale
- Utilidad: SSH remoto a la RPi desde cualquier red
- **No habilita OTA remoto** — ArduinoOTA requiere misma LAN
- Se retomara cuando haya otra RPi en la red remota (Suarez_Mujica_891)

### OTA sesion 3 — ESP8266 actualizados (ultimo firmware con todos los fixes)
| Device | IP | Resultado |
|--------|-----|-----------|
| KPCL0033 | 192.168.1.88 | OK |
| KPCL0034 | 192.168.1.85 | OK |
| KPCL0035 | 192.168.1.93 | OK |
| KPCL0037 | 192.168.1.89 | OK |
| KPCL0038 | 192.168.1.92 | OK |

---

## Tareas Pendientes

### 1. Calibracion de celda de carga (HX711) - Dispositivos restantes
- KPCL0033: **calibrado** (factor 4301)
- KPCL0034: pendiente (reporta `weight: null` — HX711 no detectado?)
- KPCL0035: pendiente
- KPCL0037: pendiente
- KPCL0038: pendiente
- KPCL0040: pendiente (ESP32-CAM, reporta `ERR_HX711`)
- KPCL0041: pendiente (ESP32-CAM, reporta `ERR_HX711`)
- KPCL0036: pendiente (firmware viejo, requiere acceso fisico)

### 2. ESP32-CAM: Red neuronal para identificacion de objetos
- Implementar modelo de inferencia en ESP32-CAM para detectar/identificar objetos (ej. mascota, plato, comida)
- Evaluar opciones: TensorFlow Lite Micro, Edge Impulse, modelo custom
- Considerar limitaciones de memoria del ESP32 (~520KB SRAM, ~4MB flash)
- Posible enfoque: captura de imagen + envio a servidor para inferencia (vs. inferencia on-device)
- Integrar resultado de deteccion en el payload MQTT (nuevo campo o topic dedicado)

### 3. KPCL0036 - Actualizacion de firmware pendiente
- Requiere acceso fisico (USB) para flashear firmware actualizado
- Firmware actual no incluye: `device_type`, `device_model`, `wifi_ip` en STATUS
- Ubicado en red Suarez_Mujica_891 (fuera de LAN de desarrollo)
