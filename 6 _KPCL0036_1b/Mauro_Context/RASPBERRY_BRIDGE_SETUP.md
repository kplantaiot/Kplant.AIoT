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
La Pi se conecta automaticamente a cualquiera de las redes configuradas. La IP cambia segun la red:

| Red | Rango IP tipico | IP conocida |
|-----|----------------|-------------|
| Jeivos | 192.168.100.x | 192.168.100.119 |
| Casa 15 | 192.168.1.x | 192.168.1.90 |

Para encontrar la IP:
1. Revisar el router en la lista de dispositivos conectados
2. O escanear la red:
   ```bash
   # Desde Git Bash (funciona en Windows)
   for i in $(seq 1 254); do ping -n 1 -w 200 192.168.1.$i > /dev/null 2>&1 && echo "192.168.1.$i ALIVE"; done
   ```
3. Probar SSH en cada IP encontrada:
   ```bash
   ssh -o ConnectTimeout=5 -i "C:/Users/Equipo/.ssh/kittypau_rpi" kittypau@<IP> "hostname"
   ```
   Si responde `kittypau-bridge`, es la Pi.

---

## Redes WiFi de la Pi

La Pi tiene multiples redes configuradas para funcionar en distintas ubicaciones.
Se configuran via cloud-init (`network-config` en la particion bootfs de la microSD).

| SSID | Contrasena | Ubicacion |
|------|-----------|-----------|
| Jeivos | jdayne212 | Red principal del proyecto |
| Casa 15 | mateo916 | Red secundaria |
| Suarez_Mujica_891 | SuarezMujica891 | Red alternativa |
| Burgosa5g | Lunita1176 | Red alternativa (5GHz - Pi Zero 2W solo soporta 2.4GHz) |
| Mauro | mauro1234 | Red movil/hotspot |

**Nota**: La Pi Zero 2 W solo soporta WiFi 2.4GHz (802.11 b/g/n). Redes 5GHz como Burgosa5g no funcionaran a menos que tengan banda dual.

Las passwords en `network-config` estan como hash WPA PSK (64 hex chars).
Para generar el hash de una nueva red:
```bash
python -c "import hashlib; print(hashlib.pbkdf2_hmac('sha1', b'PASSWORD', b'SSID', 4096, 32).hex())"
```

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
| URL | `https://zgwqtzazvkjkfocxnxsh.supabase.co` |
| Anon Key | `sb_publishable_FYU2GgFbYs6VoptiKYnz3g_rgo1wlM2` |

---

## Archivo .env (en la Pi)

Ubicacion: `/home/kittypau/kittypau-bridge/.env`

```env
MQTT_BROKER=cf8e2e9138234a86b5d9ff9332cfac63.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=Kittypau1
MQTT_PASS=Kittypau1234
SUPABASE_URL=https://zgwqtzazvkjkfocxnxsh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_d-ybUFvQ5hFqyxQGZlVywQ_8GYsUuEf
SUPABASE_ANON_KEY=sb_publishable_FYU2GgFbYs6VoptiKYnz3g_rgo1wlM2
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
  "wifi_ssid": "Casa 15",
  "wifi_ip": "192.168.1.85",
  "KPCL0037": "Online",
  "sensor_health": "OK",
  "device_type": "comedero",
  "device_model": "NodeMCU v3 CP2102"
}
```

**Campos de STATUS guardados en tabla `devices`:**

| Campo MQTT | Columna DB | Descripcion |
|------------|-----------|-------------|
| `wifi_status` | `wifi_status` | Estado WiFi ("Conectado") |
| `wifi_ssid` | `wifi_ssid` | Red WiFi actual |
| `wifi_ip` | `wifi_ip` | IP del dispositivo en la red |
| `sensor_health` | `sensor_health` | Estado de sensores ("OK", "ERR_DHT", etc.) |
| `device_type` | `device_type` | Funcion del dispositivo: "comedero", "bebedero", "comedero_cam", "bebedero_cam" |
| `device_model` | `device_model` | Modelo de placa: "NodeMCU v3 CP2102", "AI-Thinker ESP32-CAM" |

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

### Agregar una nueva red WiFi

Cloud-init solo procesa `network-config` en el **primer boot** (o cuando cambia el instance-id).
Para agregar una nueva red WiFi:

1. Apagar la Pi y sacar la microSD
2. Insertar la microSD en el PC (aparece como unidad FAT32, ej. `E:\`)
3. Editar `E:\network-config` y agregar la red bajo `access-points`:
   ```yaml
   "NombreSSID":
     password: "<hash_wpa_psk_64_hex>"
   ```
4. **Cambiar el instance-id** en `E:\meta-data` para forzar cloud-init a re-procesar:
   ```
   instance-id: rpi-imager-1770411050503-v3
   ```
   (agregar `-vN` al final, incrementando el numero)
5. Opcionalmente crear archivo vacio `E:\ssh` para asegurar que SSH se active
6. Poner la SD en la Pi y encender. El primer boot tarda ~60-90 segundos (cloud-init reconfigura red)

### Actualizar el bridge remotamente

Una vez que la Pi esta en la red y accesible por SSH:
```bash
# Copiar bridge.js actualizado
scp -i "C:/Users/Equipo/.ssh/kittypau_rpi" bridge.js kittypau@<IP>:/home/kittypau/kittypau-bridge/

# Copiar .env si cambio
scp -i "C:/Users/Equipo/.ssh/kittypau_rpi" .env kittypau@<IP>:/home/kittypau/kittypau-bridge/

# Reiniciar servicio
ssh -i "C:/Users/Equipo/.ssh/kittypau_rpi" kittypau@<IP> "sudo systemctl restart kittypau-bridge"

# Verificar logs
ssh -i "C:/Users/Equipo/.ssh/kittypau_rpi" kittypau@<IP> "sudo journalctl -u kittypau-bridge -n 30 --no-pager"
```

---

## Troubleshooting

### No puedo encontrar la IP de la Pi
- Verificar que la Pi y el PC estan en la misma red WiFi
- La Pi se conecta a: Jeivos, Casa 15, Suarez_Mujica_891, Burgosa5g, Mauro
- Escanear la red con ping sweep o app Fing
- Revisar lista de dispositivos en el router
- Si ninguna red configurada esta disponible, sacar la SD y agregar la red actual (ver seccion cloud-init)

### SSH rechaza la contrasena
- Verificar que el archivo `user-data` existe en bootfs con el hash correcto
- Usar clave SSH como alternativa: `ssh -i ~/.ssh/kittypau_rpi kittypau@<IP>`
- Si se reflasheo la SD, limpiar claves viejas: `ssh-keygen -R <IP>`

### El bridge no conecta a HiveMQ
- Verificar que el `.env` tiene las credenciales correctas
- Verificar conectividad a internet: `ping google.com`
- Revisar logs: `journalctl -u kittypau-bridge -n 20`

### El bridge no escribe en Supabase
- Verificar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env`
- Verificar que las tablas `devices` y `sensor_readings` existen en Supabase
- Revisar errores en logs: `journalctl -u kittypau-bridge -f`
