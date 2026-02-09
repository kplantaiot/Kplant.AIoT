# Credenciales y Enlaces (Template - No pegar secretos)

Este documento **NO** debe contener secretos reales. Usa placeholders y guarda los valores reales solo en el entorno correspondiente (Raspberry/Vercel/Supabase).

---

## Supabase

**Proyecto**
- URL: `https://<PROJECT_REF>.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/<PROJECT_REF>`

**Keys**
- `SUPABASE_ANON_KEY`: `<SB_PUBLISHABLE_...>`
- `SUPABASE_SERVICE_ROLE_KEY`: `<SB_SECRET_...>` (solo backend)

---

## Vercel (si aplica)

- App URL: `https://<APP>.vercel.app`
- Webhook MQTT: `https://<APP>.vercel.app/api/mqtt/webhook`
- `MQTT_WEBHOOK_SECRET`: `<RANDOM_SECRET>`

---

## MQTT / HiveMQ

- Broker host: `<CLUSTER>.s1.eu.hivemq.cloud`
- Puerto: `8883`
- Usuario: `<MQTT_USER>`
- Password: `<MQTT_PASS>`

---

## Certificados TLS

- CA: `ISRG Root X1 (Let's Encrypt)`
- Ubicacion en firmware: `src/mqtt_manager.cpp` (cert embebido)
- Ubicacion en bridge (si aplica): `<RUTA_CA.crt>` o embebido

---

## Raspberry Bridge

- Hostname: `kittypau-bridge`
- Usuario: `kittypau`
- Ruta `.env`: `/home/kittypau/kittypau-bridge/.env`
- Servicio systemd: `/etc/systemd/system/kittypau-bridge.service`

---

## Links utiles

- Supabase Dashboard: `https://supabase.com/dashboard`
- HiveMQ Cloud: `https://www.hivemq.com/try-out/`
- Vercel Dashboard: `https://vercel.com/dashboard`
