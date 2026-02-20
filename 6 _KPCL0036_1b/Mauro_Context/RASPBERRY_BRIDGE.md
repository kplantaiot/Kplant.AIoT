# Raspberry Pi Zero 2 W - Bridge MQTT (Kittypau)

## Objetivo
Usar la Raspberry Pi Zero 2 W como puente 24/7 entre HiveMQ y Supabase.
El bridge escribe **directamente** a Supabase usando `service_role` key (bypass RLS).

---

## Alcance (lo que hace y lo que NO hace)
**Hace**
- Se conecta a HiveMQ (MQTT sobre TLS, puerto 8883).
- Escucha topics IoT: `+/SENSORS` y `+/STATUS` (wildcard).
- Filtra por prefijo `KPCL` y acepta `KPBR0001` (bridge propio).
- Escribe directamente en Supabase:
  - `sensor_readings`: datos de sensores (peso, temp, humedad, luz).
  - `devices`: actualiza last_seen, device_state, wifi_status, sensor_health, ip_history.
  - `bridge_heartbeats`: telemetria del bridge (RAM, CPU, disco, hostname, uptime).
- Auto-registra dispositivos desconocidos con `device_state: 'factory'`.
- Publica telemetria de la RPi cada 60s como `KPBR0001/STATUS`.
- Detecta cambios de IP y registra historial en `devices.ip_history` (JSONB).

**No hace**
- No consulta datos (no hace `GET`).
- No pasa por `/api/mqtt/webhook` (escritura directa a Supabase).
- No almacena datos localmente (solo reenvia en tiempo real).

---

## Estado del bridge en el proyecto
- El codigo fuente vive en `/bridge/bridge.js` dentro del repo.
- El **runtime** corre en `/home/kittypau/kittypau-bridge/bridge.js` en la RPi.
- La RPi **no es un git repo**. Deployments via SFTP.
- El `.env` del bridge **no se versiona** (ver `.gitignore`).

---

## Version actual: v2.4

### Changelog
- v2.4: Upsert bridge_heartbeats con telemetria completa, device_state='linked' en STATUS.
- v2.3: Publica status de la RPi (KPBR0001) cada 60s via MQTT.
- v2.2: Registra cambios de IP en ip_history (JSONB) de devices.
- v2.1: sensor_readings usa device_id (TEXT) directamente como FK.
- v2.0: Mapeo de campos: weight->weight_grams, temp->temperature, hum->humidity.

---

## Dependencias
- Raspberry Pi Zero 2 W con Raspberry Pi OS (Lite)
- Node.js 18+
- npm packages: mqtt, @supabase/supabase-js, dotenv
- Acceso SSH (usuario: kittypau)
- Conexion Wi-Fi estable

---

## Variables de entorno del bridge
```
MQTT_BROKER=<HOST_HIVEMQ>
MQTT_PORT=8883
MQTT_USER=<USUARIO_MQTT>
MQTT_PASS=<PASSWORD_MQTT>
SUPABASE_URL=https://zgwqtzazvkjkfocxnxsh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```
**Regla**: Usar `SUPABASE_SERVICE_ROLE_KEY` (service_role) para bypass de RLS.
**Nota de seguridad**: las credenciales reales se guardan en `.env` local del bridge y no se documentan aqui.

---

## Deployment (SFTP, no git)
La RPi no tiene git. Para deployar bridge.js:

1. Editar `bridge/bridge.js` localmente.
2. Subir via SFTP a `/home/kittypau/kittypau-bridge/bridge.js`.
3. Reiniciar servicio: `sudo systemctl restart kittypau-bridge`.
4. Verificar logs: `journalctl -u kittypau-bridge -f --no-pager -n 30`.

---

## Checklist de conexion

### 1) Acceso SSH
```bash
ssh kittypau@192.168.1.93
# Password: jdayne21
```

### 2) Estado del servicio
```bash
sudo systemctl status kittypau-bridge
```
Esperado: `active (running)`.

### 3) Logs en vivo
```bash
journalctl -u kittypau-bridge -f --no-pager -n 30
```
Esperado:
- `[MQTT] Conectado a HiveMQ Cloud`
- `[MQTT] Suscrito a +/SENSORS (wildcard)`
- `[MQTT] Suscrito a +/STATUS (wildcard)`
- `[SUPABASE] Sensor data guardado para KPCLxxxx`
- `[SUPABASE] Status actualizado para KPCLxxxx`
- `[SUPABASE] Bridge heartbeat actualizado`
- `[RPi-STATUS] KPBR0001 -> ...`

### 4) Verificar envs
```bash
cat /home/kittypau/kittypau-bridge/.env
```

---

## Flujo de datos

### SENSORS (cada 10s por dispositivo)
```
ESP -> MQTT {DEVICE_ID}/SENSORS -> Bridge -> INSERT sensor_readings
```
Mapeo de campos:
| MQTT payload | Supabase column |
|---|---|
| `weight` | `weight_grams` |
| `temp` | `temperature` |
| `hum` | `humidity` |
| `light.lux` | `light_lux` |
| `light.%` | `light_percent` |
| `light.condition` | `light_condition` |
| `timestamp` | `device_timestamp` |

### STATUS (cada 15s por dispositivo)
```
ESP -> MQTT {DEVICE_ID}/STATUS -> Bridge -> UPDATE devices
```
Campos actualizados: `last_seen`, `device_state='linked'`, `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`, `device_type`, `device_model`.

### KPBR0001 STATUS (cada 60s, bridge propio)
```
Bridge -> MQTT KPBR0001/STATUS -> Bridge (self-receive) -> UPSERT bridge_heartbeats
```
Campos: `ip`, `uptime_sec`, `mqtt_connected`, `device_type`, `device_model`, `hostname`, `wifi_ssid`, `ram_used_mb`, `ram_total_mb`, `disk_used_pct`, `cpu_temp`.

---

## Tablas Supabase (escritas por bridge)

| Tabla | Tipo | Descripcion |
|---|---|---|
| `sensor_readings` | tabla | Lecturas de sensores (peso, temp, humedad, luz) |
| `devices` | tabla | Registro de dispositivos (estado, WiFi, last_seen) |
| `bridge_heartbeats` | tabla | Telemetria del bridge RPi (RAM, CPU, disco) |
| `bridge_status_live` | VIEW | Vista sobre bridge_heartbeats + conteo KPCL |
| `admin_dashboard_live` | VIEW | Vista resumen (bridge + audit events) |
| `latest_readings` | VIEW | Ultima lectura por dispositivo |

---

## Auto-registro de dispositivos
Cuando el bridge recibe un mensaje de un `device_id` desconocido:
1. Verifica si existe en tabla `devices`.
2. Si no existe, lo inserta con `device_state: 'factory'`.
3. Cachea en memoria para evitar queries repetidos.
4. En el siguiente STATUS, actualiza a `device_state: 'linked'`.

---

## Observabilidad
- Logs del Bridge (journald): `journalctl -u kittypau-bridge -f`
- Supabase: tablas `sensor_readings`, `devices`, `bridge_heartbeats`
- Views: `bridge_status_live`, `admin_dashboard_live`

---

## Pruebas de funcionamiento (minimas)
1. Verificar que el servicio esta activo: `systemctl status kittypau-bridge`.
2. Ver logs y confirmar mensajes de SENSORS y STATUS.
3. Consultar `sensor_readings` en Supabase para ver nuevas filas.
4. Consultar `bridge_heartbeats` para ver telemetria RPi.
