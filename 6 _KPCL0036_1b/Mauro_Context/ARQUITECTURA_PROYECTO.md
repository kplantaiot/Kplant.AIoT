# Arquitectura del Proyecto Kittypau (MVP $0)

## Objetivo
Tener un MVP funcional donde el usuario:
1. Se registra e inicia sesion.
2. Agrega una mascota.
3. Registra un dispositivo (plato comida/agua).
4. Ve datos en vivo desde la app web.

---

## Componentes
1. **Frontend + API**: Next.js (App Router) en Vercel.
2. **DB/Auth/Realtime**: Supabase.
3. **MQTT Broker**: HiveMQ Cloud (TLS, puerto 8883).
4. **Bridge MQTT-Supabase**: Node.js en Raspberry Pi Zero 2 W (24/7).
5. **Firmware IoT**: ESP8266 (NodeMCU) con sensores HX711, DHT11, LDR.

---

## Registro en pop-up (UX global)
- El flujo de registro ocurre en un pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- El progreso se guarda si el usuario cierra.

## Diagrama de alto nivel (implementacion actual)
```
ESP8266 --MQTT/TLS--> HiveMQ Cloud --MQTT/TLS--> Raspberry Pi (bridge.js) --> Supabase (DB)
                                                                                  |
                                                                            Realtime --> App Web
```

---

## Flujo de datos (telemetria)
1. ESP8266 publica sensores cada 10s y status cada 15s via MQTT/TLS a HiveMQ Cloud.
2. Raspberry Pi Zero 2 W ejecuta `bridge.js` 24/7, suscrito con wildcard (`+/SENSORS`, `+/STATUS`).
3. Bridge parsea JSON, auto-registra dispositivos nuevos e inserta en Supabase (`sensor_readings`).
4. Bridge actualiza estado del dispositivo en Supabase (`devices`).
5. Supabase Realtime actualiza el dashboard del usuario.

**Ventaja del bridge sobre webhook**: No requiere endpoint publico, no depende de cold starts serverless, procesa todos los dispositivos KPCL automaticamente y funciona con baja latencia.

## Registro de dispositivo (paso esencial)
- El usuario escanea el QR en la parte inferior del plato.
- El QR entrega el `device_code`.
- El dispositivo se asocia a una mascota para activar envio de datos.

---

## Diagramas detallados
### Produccion (implementacion actual)
```
ESP8266 (KPCL0036, KPCL0037, KPCL0038...)
           |
     MQTT/TLS (puerto 8883)
           |
     HiveMQ Cloud (broker)
           |
     MQTT/TLS (suscripcion wildcard)
           |
     Raspberry Pi Zero 2 W (bridge.js, systemd 24/7)
           |
     Supabase (PostgreSQL: sensor_readings + devices)
           |
     Supabase Realtime (WebSocket)
           |
     App Web (Next.js en Vercel)
```

### Alternativa futura (webhook directo)
```
ESP8266 -> HiveMQ Cloud
              |
        Webhook -> https://tu-app.vercel.app/api/mqtt/webhook
              |
          Supabase (DB + Realtime)
              |
          App Web (Vercel)
```
**Nota**: El webhook es una alternativa si se quiere eliminar la Raspberry Pi, pero depende de que HiveMQ soporte webhooks en free tier y tiene limitaciones de cold start serverless.

---

## Estructura del repositorio
```
/Docs
/kittypau_app
  /src
    /app
    /lib
    /components
  /scripts
  /public
```

---

## Decisiones tecnicas (tradeoffs)
1. **Next.js + API Routes**:
   - Pros: un solo deploy, costo $0, menos infraestructura.
   - Contras: serverless con limites de ejecucion y cold starts.

2. **Supabase Realtime**:
   - Pros: streaming listo sin infra propia.
   - Contras: dependes del servicio; hay limites en free tier.

3. **Raspberry Pi Bridge (en lugar de HiveMQ Webhook)**:
   - Pros: no requiere endpoint publico, baja latencia, auto-deteccion de dispositivos, 24/7.
   - Contras: requiere hardware dedicado (RPi Zero 2 W ~$15), depende de red local.
   - Justificacion: HiveMQ free tier no soporta webhooks nativos; el bridge es la solucion mas robusta y economica.

4. **ESP8266 (en lugar de ESP32)**:
   - Pros: mas barato, mas disponible, probado en IoT.
   - Contras: menos RAM (80KB), solo WiFi (sin BLE).

---

## Endpoints y contratos (MVP)
### 1) `POST /api/mqtt/webhook`
**Headers**
- `x-webhook-token: <secret>`

**Body (ejemplo)**
```json
{
  "deviceId": "KPCL0001",
  "temperature": 23.5,
  "humidity": 65,
  "weight_grams": 3500,
  "battery_level": 85,
  "timestamp": "2026-02-03T18:30:00Z"
}
```

**Response**
```json
{ "success": true }
```

---

### 2) `GET /api/pets`
**Response**
```json
[
  { "id": "uuid", "name": "Michi", "species": "cat" }
]
```

### 3) `POST /api/pets`
**Body**
```json
{ "name": "Michi", "species": "cat", "birth_date": "2024-01-01" }
```
**Response**
```json
{ "id": "uuid" }
```

---

### 4) `GET /api/devices`
**Response**
```json
[
  { "id": "uuid", "device_code": "KPCL0001", "device_type": "food_bowl" }
]
```

### 5) `POST /api/devices`
**Body**
```json
{
  "device_code": "KPCL0001",
  "device_type": "food_bowl",
  "pet_id": "uuid"
}
```
**Response**
```json
{ "id": "uuid" }
```

---

### 6) `GET /api/readings?device_id=uuid`
**Response**
```json
[
  {
    "device_id": "uuid",
    "weight_grams": 3500,
    "battery_level": 85,
    "recorded_at": "2026-02-03T18:30:00Z"
  }
]
```

---

## Seguridad
- Webhook protegido por `x-webhook-token`.
- RLS en Supabase para limitar datos por usuario.
- Service role solo en el backend (API routes).

---

## Deploy (Vercel)
El deploy incluye:
1. Frontend web.
2. API routes (webhook + CRUD).
3. Backend ligero serverless.

---

## Estado actual (hasta 2026-02-06)
- Next.js creado en `kittypau_app/` con TypeScript y App Router.
- Endpoint webhook creado en `src/app/api/mqtt/webhook/route.ts`.
- Cliente Supabase server creado en `src/lib/supabase/server.ts`.
- Firmware ESP8266 completo con sensores HX711, DHT11, LDR, MQTT/TLS, OTA.
- Bridge Node.js (`bridge/bridge.js`) funcional con wildcard y auto-registro.
- Raspberry Pi Zero 2 W configurada con Node.js v20 y SSH.
- Credenciales HiveMQ y Supabase verificadas y funcionales.
- Ver `Docs/RASPBERRY_BRIDGE_SETUP.md` para configuracion completa de la RPi.

---

## Pendientes inmediatos
- Completar deploy del bridge en Raspberry Pi (copiar archivos, npm install, systemd).
- Crear y poblar `pets` y `devices` desde la app.
- Crear UI base (login, mascotas, dispositivos, dashboard).
- Configurar deploy en Vercel.
- Verificar Realtime en dashboard.
