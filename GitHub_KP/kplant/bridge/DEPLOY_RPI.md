# Deploy Kplant Bridge en Raspberry Pi

## 1) Preparar Raspberry
```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 2) Crear usuario de servicio (si no existe)
```bash
sudo useradd -m -s /bin/bash kplant || true
```

## 3) Copiar proyecto a la Raspberry
Opciones:
- `git clone` del repo en `/home/kplant/kplant-bridge`
- o copiar solo `kplant/bridge` a esa ruta

Ejemplo con `git clone`:
```bash
sudo -u kplant -H bash -lc "cd /home/kplant && git clone <TU_REPO_URL> kplant-bridge-repo"
sudo -u kplant -H bash -lc "cp -R /home/kplant/kplant-bridge-repo/kplant/bridge/* /home/kplant/kplant-bridge/"
```

## 4) Configurar `.env`
```bash
sudo -u kplant -H bash -lc "cp /home/kplant/kplant-bridge/.env.example /home/kplant/kplant-bridge/.env"
sudo -u kplant -H bash -lc "nano /home/kplant/kplant-bridge/.env"
```

Completar al menos:
- `MQTT_BROKER`
- `MQTT_PORT=8883`
- `MQTT_USER`
- `MQTT_PASS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEVICE_PREFIX=KPPL`
- `BRIDGE_DEVICE_ID=KPBR0002`

## 5) Instalar dependencias y prueba manual
```bash
sudo -u kplant -H bash -lc "cd /home/kplant/kplant-bridge && npm install"
sudo -u kplant -H bash -lc "cd /home/kplant/kplant-bridge && node src/index.js"
```

Si conecta bien, deberias ver:
- `Connected`
- `Subscribed +/SENSORS`
- `Subscribed +/STATUS`

Detener con `Ctrl+C`.

## 6) Instalar servicio systemd
```bash
sudo cp /home/kplant/kplant-bridge/systemd/kplant-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable kplant-bridge
sudo systemctl start kplant-bridge
```

## 7) Verificar estado y logs
```bash
sudo systemctl status kplant-bridge --no-pager
sudo journalctl -u kplant-bridge -f
```

## 8) Comandos utiles
```bash
sudo systemctl restart kplant-bridge
sudo systemctl stop kplant-bridge
sudo systemctl disable kplant-bridge
```
