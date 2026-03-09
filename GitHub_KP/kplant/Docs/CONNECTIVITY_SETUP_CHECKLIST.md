# Kplant - Checklist de Conectividad y Credenciales

Estado: En progreso  
Fecha inicio: 2026-03-08

## 1) Cuenta base (Google)
- [x] Correo Google del proyecto creado: `kplant.aiot@gmail.com`
- [ ] 2FA activado
- [ ] Codigos de recuperacion guardados
- [ ] Correo/telefono recovery configurados

## 2) GitHub
- [ ] Cuenta/organizacion creada
- [ ] Repositorio `kplant` creado
- [ ] Accesos de colaboradores definidos
- [ ] Secrets iniciales cargados (si aplica)

## 3) HiveMQ Cloud (Broker MQTT)
- [x] Cluster creado
- [x] Host MQTT: `175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud`
- [x] Puerto TLS: `8883`
- [x] Usuario MQTT principal: `Kplant1`
- [x] Password MQTT principal: `Kplant1234`
- [x] Credencial MQTT secundaria: `Kplant2 / Kplant1234`
- [ ] Cert CA validado/guardado
- [ ] Convencion de topics validada:
  - `KPPL0001/SENSORS`
  - `KPPL0001/STATUS`
  - `KPPL0001/cmd`

Notas HiveMQ:
- Cluster ID: `175b4a24e828456884ccbd18fb1a5bd8`
- Plan: `Serverless (Free #1)`
- Endpoints:
  - `mqtts://175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud:8883`
  - `wss://175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud:8884/mqtt`

## 4) Supabase
- [x] Proyecto creado
- [ ] Region elegida: `________________________`
- [x] URL: `https://zjdyhpntftgaynchqwfk.supabase.co`
- [x] Publishable key disponible (`sb_publishable_...`)
- [x] Secret key disponible (`sb_secret_...`)
- [x] Legacy anon key disponible (`eyJ...`)
- [x] Legacy service_role key disponible (`eyJ...`)
- [x] Auth email/password habilitado
- [x] Migraciones DB aplicadas
- [x] RLS habilitado en tablas de usuario

## 5) Vercel (kplant_app)
- [x] Proyecto Vercel creado y enlazado por CLI (`kplant_app`)
- [ ] Proyecto conectado al repo
- [x] Variables en Vercel configuradas:
  - [x] `NEXT_PUBLIC_SUPABASE_URL` (Production, Development)
  - [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production, Development)
  - [x] `SUPABASE_SERVICE_ROLE_KEY` (Production, Development)
- [x] Primer deploy exitoso (CLI)
- [x] URL produccion: `https://kplantapp.vercel.app`
- [ ] Variables Preview configuradas (pendiente hasta cerrar Git integration)
- [ ] Integracion Git en Vercel con `Jeivous/kittypau_1a` (bloqueo actual)

## 6) Bridge (RPi / Node.js)
- [x] Bridge desplegado en Raspberry Pi (`192.168.100.119`)
- [x] Bridge local temporal creado en `kplant/bridge`
- [x] `.env` configurado
- [x] Variables cargadas:
  - [x] `MQTT_BROKER`
  - [x] `MQTT_PORT`
  - [x] `MQTT_USER`
  - [x] `MQTT_PASS`
  - [x] `SUPABASE_URL`
  - [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] Servicio corriendo en Raspberry (`kplant-bridge.service`)
- [x] Insertando lecturas en Supabase (prueba MQTT manual)
- [x] Estado de bridge visible en Supabase (`KPBR0002` + view `bridge_status_live`)

## 7) Firmware ESP32-C3
- [ ] `config.h` actualizado con WiFi + MQTT + `DEVICE_ID`
- [ ] Publica `SENSORS` y `STATUS`
- [ ] TLS MQTT OK
- [ ] Datos visibles en app

## 8) Seguridad y operacion
- [ ] Secret manager definido (1Password/Bitwarden)
- [ ] Rotacion de passwords iniciales
- [ ] Documento de recovery y runbook creado

## 9) Prueba E2E
- [ ] Flujo completo validado:
  - `ESP32 -> HiveMQ -> Bridge -> Supabase -> Vercel App`
- [ ] Realtime en `/today` validado
- [ ] Estado online/offline validado

---

## Variables maestras (referencia rapida)

### App (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://zjdyhpntftgaynchqwfk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=
```

### Bridge (`.env`)
```env
MQTT_BROKER=175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USER=Kplant1
MQTT_PASS=Kplant1234
SUPABASE_URL=https://zjdyhpntftgaynchqwfk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```
