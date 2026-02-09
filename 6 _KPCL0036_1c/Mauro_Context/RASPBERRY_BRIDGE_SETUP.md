# Raspberry Pi Bridge - Configuracion y Credenciales

## Proposito

La Raspberry Pi actua como host permanente (24/7) del servicio `bridge.js`, que conecta los dispositivos IoT con la base de datos:

```
ESP8266 (sensores) --> HiveMQ Cloud (MQTT) --> Raspberry Pi (bridge.js) --> Supabase (PostgreSQL)
```

Un solo bridge con suscripcion wildcard maneja todos los dispositivos KPCL automaticamente.

---

## Hardware

| Componente | Detalle |
|-----------|---------|
| Modelo | Raspberry Pi Zero 2 W |
| CPU | BCM2710A1 (ARM Cortex-A53 quad-core @ 1GHz) |
| RAM | 512 MB |
| Conectividad | WiFi 802.11 b/g/n |
| Almacenamiento | microSD 32 GB |
| Alimentacion | micro USB 5V/1A |
| Consumo estimado | ~0.5W ejecutando el bridge |

---

## Sistema Operativo

| Campo | Valor |
|-------|-------|
| OS | Raspberry Pi OS Lite (32-bit, Trixie/Bookworm) |
| Kernel | 6.12.47+rpt-rpi-v7 armv7l |
| Hostname | `kittypau-bridge` |
| Usuario | `kittypau` |
| Contrasena | `jdayne21` |
| Node.js | v20.19.1 |
| npm | (incluido con Node.js 20) |

---

## Acceso SSH

### Por contrasena
```bash
ssh kittypau@<IP_DE_LA_PI>
# Contrasena: jdayne21
```

### Por clave SSH (preferido)
```bash
ssh -i C:\Users\Equipo\.ssh\kittypau_rpi kittypau@<IP_DE_LA_PI>
```

**Clave publica instalada:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOt3S4sp6SQGqR3cszt/zoQL083DQT1myO9SGHZFbVWn kittypau-bridge
```

**Clave privada local:** `C:\Users\Equipo\.ssh\kittypau_rpi`

### Encontrar la IP de la Pi
La Pi se conecta a la red WiFi `Jeivos`. Para encontrar su IP:

1. Revisar el router (192.168.x.1) en la lista de dispositivos conectados
2. O escanear la red:
   ```bash
   # Desde Git Bash / PowerShell
   for i in $(seq 1 254); do ping -n 1 -w 200 192.168.x.$i > /dev/null 2>&1 && echo "192.168.x.$i ALIVE" & done; wait
   ```
3. Luego probar SSH en cada IP encontrada

---

## Red WiFi de la Pi

| Campo | Valor |
|-------|-------|
| SSID | Jeivos |
| Contrasena | jdayne212 |
| Protocolo | WPA2 |
| Metodo de config | cloud-init (`network-config` en bootfs) |

---

## Credenciales del Bridge

### MQTT (HiveMQ Cloud)

| Campo | Valor |
|-------|-------|
| Broker | `cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud` |
| Puerto | 8883 (TLS) |
| Protocolo | MQTT 5.0 + TLS |
| Usuario | `Kittypau1` |
| Contrasena | `Kittypau1234` |
| Certificado | ISRG Root X1 (Let's Encrypt) |

### Supabase

| Campo | Valor |
|-------|-------|
| URL | `https://koxraplgxifdmssfkilx.supabase.co` |
| Anon Key (JWT) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveHJhcGxneGlmZG1zc2ZraWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzM5MDUsImV4cCI6MjA4NTc0OTkwNX0.9Ztnvnoj0JTjp2JE21R0kjZkXFO0broaMIfJTNHFxuI` |

---

## Archivo .env (en la Pi)

Ubicacion: `/home/kittypau/kittypau-bridge/.env`

```env
MQTT_BROKER=cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=Kittypau1
MQTT_PASS=Kittypau1234
SUPABASE_URL=https://koxraplgxifdmssfkilx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveHJhcGxneGlmZG1zc2ZraWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzM5MDUsImV4cCI6MjA4NTc0OTkwNX0.9Ztnvnoj0JTjp2JE21R0kjZkXFO0broaMIfJTNHFxuI
```

---

## Estructura del Bridge en la Pi

```
/home/kittypau/kittypau-bridge/
  bridge.js        # Servicio principal (MQTT -> Supabase)
  package.json     # Dependencias Node.js
  .env             # Credenciales (NO en git)
  node_modules/    # Dependencias instaladas
```

### Dependencias (package.json)
```json
{
  "dependencies": {
    "mqtt": "^5.3.0",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1"
  }
}
```

---

## Topicos MQTT que escucha el Bridge

El bridge usa suscripcion wildcard y filtra por prefijo `KPCL`:

| Topico | Direccion | Contenido |
|--------|-----------|-----------|
| `+/SENSORS` | Dispositivo -> Bridge | Peso, temperatura, humedad, luz |
| `+/STATUS` | Dispositivo -> Bridge | WiFi, estado online, salud sensores |

### Ejemplo payload SENSORS
```json
{
  "timestamp": "02-06-2026 16:06:28",
  "weight": 150.44,
  "temp": 26.60,
  "hum": 39.40,
  "ldr": 7
}
```

### Ejemplo payload STATUS
```json
{
  "wifi_status": "Conectado",
  "wifi_ssid": "Jeivos",
  "wifi_ip": "192.168.100.50",
  "KPCL0038": "Online",
  "sensor_health": "OK"
}
```

---

## Servicio systemd (24/7)

Archivo: `/etc/systemd/system/kittypau-bridge.service`

```ini
[Unit]
Description=KittyPau MQTT-Supabase Bridge
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=kittypau
WorkingDirectory=/home/kittypau/kittypau-bridge
ExecStart=/usr/bin/node bridge.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kittypau-bridge

[Install]
WantedBy=multi-user.target
```

### Comandos de gestion

```bash
# Activar auto-inicio en boot
sudo systemctl enable kittypau-bridge

# Iniciar el servicio
sudo systemctl start kittypau-bridge

# Ver estado
sudo systemctl status kittypau-bridge

# Ver logs en vivo
journalctl -u kittypau-bridge -f

# Ver ultimos 50 logs
journalctl -u kittypau-bridge -n 50

# Reiniciar
sudo systemctl restart kittypau-bridge

# Detener
sudo systemctl stop kittypau-bridge
```

---

## Comportamiento del Bridge

1. **Auto-deteccion**: Suscripcion wildcard `+/SENSORS` y `+/STATUS` detecta cualquier dispositivo con prefijo `KPCL`
2. **Auto-registro**: Si un dispositivo nuevo publica, el bridge lo registra automaticamente en la tabla `devices`
3. **Reconexion**: La libreria MQTT reconecta automaticamente si se pierde conexion con HiveMQ
4. **Reinicio**: systemd reinicia el proceso automaticamente si falla (espera 10s entre intentos)
5. **Persistencia**: Sobrevive reinicios de la Pi gracias a `systemctl enable`

---

## Notas de configuracion especial (cloud-init)

La Pi Zero 2 W usa cloud-init en lugar de `firstrun.sh`. Los archivos de configuracion estan en la particion `bootfs`:

- `user-data`: Define usuario, contrasena (hash SHA-512), clave SSH y servicios
- `network-config`: Define WiFi (SSID, password hasheado con WPA)
- `meta-data`: ID de instancia del Imager

**Nota importante**: El Raspberry Pi Imager tiene un bug conocido con la Pi Zero 2 W donde no genera correctamente el archivo `user-data`. Si se necesita reflashear, crear manualmente el `user-data` en la particion bootfs con el hash de contrasena generado via `openssl passwd -6 <password>`.

---

## Troubleshooting

### No puedo encontrar la IP de la Pi
- Verificar que la Pi y el PC estan en la misma red WiFi (Jeivos)
- Escanear la red con ping sweep o app Fing
- Revisar lista de dispositivos en el router

### SSH rechaza la contrasena
- Verificar que el archivo `user-data` existe en bootfs con el hash correcto
- Usar clave SSH como alternativa: `ssh -i ~/.ssh/kittypau_rpi kittypau@<IP>`
- Si se reflasheo la SD, limpiar claves viejas: `ssh-keygen -R <IP>`

### El bridge no conecta a HiveMQ
- Verificar que el `.env` tiene las credenciales correctas
- Verificar conectividad a internet: `ping google.com`
- Revisar logs: `journalctl -u kittypau-bridge -n 20`

### El bridge no escribe en Supabase
- Verificar `SUPABASE_URL` y `SUPABASE_KEY` en `.env`
- Verificar que las tablas `devices` y `sensor_readings` existen en Supabase
- Revisar errores en logs: `journalctl -u kittypau-bridge -f`
