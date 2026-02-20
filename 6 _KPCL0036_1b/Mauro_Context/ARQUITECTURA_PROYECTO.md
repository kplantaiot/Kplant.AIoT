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
3. **MQTT**: HiveMQ Cloud.
4. **Bridge 24/7**: Raspberry Pi Zero 2 W (MQTT -> API).
   - El codigo fuente vive en el repo (`/bridge`).
   - El runtime real esta fuera del repo (Raspberry).

---

## Registro en pop-up (UX global)
- El flujo de registro ocurre en un pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- El progreso se guarda si el usuario cierra.

## Diagrama de alto nivel
```
ESP8266/ESP32-CAM -> HiveMQ Cloud (TLS) -> RPi Bridge v2.4 -> Supabase (directo)
                                                                    |
                                                             App Web (Vercel)
```

---

## Regla de conexion (importante)
- **La app web NO se conecta a HiveMQ**.
- **La Raspberry (bridge) SI se conecta a HiveMQ** y escribe directamente a Supabase.
- **La app web solo consume Supabase** (Auth + DB + Realtime).
- **El bridge NO pasa por `/api/mqtt/webhook`**. Usa `service_role` key para bypass de RLS.

Esto evita exponer credenciales MQTT en frontend y mantiene el flujo seguro.

---

## Flujo de datos (telemetria)
1. ESP8266/ESP32-CAM publica MQTT en HiveMQ (`+/SENSORS`, `+/STATUS`).
2. RPi Bridge escucha MQTT y escribe directamente a Supabase.
3. Bridge inserta en `sensor_readings`, actualiza `devices`, upsert `bridge_heartbeats`.
4. App web consulta Supabase (server components y/o Realtime).

## Registro de dispositivo (paso esencial)
- El usuario escanea el QR en la parte inferior del plato.
- El QR entrega el `device_id`.
- El dispositivo se asocia a una mascota para activar envio de datos.

---

## Diagramas detallados
### Produccion (actual)
```
ESP8266/ESP32-CAM -> HiveMQ Cloud (TLS:8883)
                        |
                  RPi Bridge v2.4 (service_role)
                        |
                  Supabase (DB + Realtime)
                        |
                  App Web (Vercel)
```

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

3. **HiveMQ Webhook**:
   - Pros: sencillo, compatible con serverless.
   - Contras: depende de endpoint publico y token seguro.

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
**Notas**
- La API acepta `deviceId`, `deviceId` o `device_id`.
- El `device_id` es el codigo humano (KPCLxxxx) y se busca en `devices`.

**Response**
```json
{ "success": true }
```

---

### 2) `GET /api/pets`
**Response**
```json
[
  { "id": "uuid", "name": "Michi", "type": "cat" }
]
```

### 3) `POST /api/pets`
**Body**
```json
{ "name": "Michi", "type": "cat", "origin": "rescatado" }
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
  { "id": "uuid", "device_id": "KPCL0001", "device_type": "food_bowl" }
]
```

### 5) `POST /api/devices`
**Body**
```json
{
  "device_id": "KPCL0001",
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

## Estado actual (2026-02-15)
- Next.js desplegado en Vercel (`kittypau-app/`).
- Bridge v2.4 corriendo 24/7 en RPi, escribe directo a Supabase.
- Firmware v1.1 en dispositivos activos (KPCL0035, 0038, 0040).
- Ver `ESTADO_AVANCE.md` para detalle completo.

---

## Pendientes inmediatos
- Flashear firmware v1.1 a dispositivos pendientes (KPCL0033, 0034, 0037, 0031, 0036).
- Aplicar Design Tokens + componentes base.
- Realtime en dashboard (suscripcion a sensor_readings).
- Pop-up de registro con progreso.
