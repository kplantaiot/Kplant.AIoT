# Plan de Proyecto: Kittypau IoT (MVP $0)

## Objetivo MVP
Un usuario se registra, agrega una mascota, registra un dispositivo (plato inteligente de comida o de agua) y ve datos en vivo desde la app web (y base lista para movil).

## Estado actual del repo (2026-02-06)
- Next.js creado en `kittypau_app/` con TypeScript y App Router.
- Archivos anteriores movidos a `kittypau_app/legacy/`.
- `Docs/` se mantiene en la raiz para documentacion.
- Endpoint webhook y cliente Supabase ya existen.
- Prueba local del webhook exitosa.
- Firmware ESP8266 completo (sensores, MQTT/TLS, OTA, calibracion).
- Bridge Node.js (`bridge/bridge.js`) funcional con wildcard y auto-registro.
- Raspberry Pi Zero 2 W configurada (OS, Node.js v20, SSH).
- Deploy del bridge en RPi en progreso.

## Arquitectura propuesta (costo $0)
1. **Frontend + API**: Next.js (Vercel Free)
2. **DB + Auth + Realtime**: Supabase Free
3. **MQTT Broker**: HiveMQ Cloud Free (TLS, puerto 8883)
4. **Bridge MQTT**: Raspberry Pi Zero 2 W con Node.js (bridge.js)
5. **Firmware**: ESP8266 con sensores (peso, temp, humedad, luz)
6. **Flujo**:
   - ESP8266 -> HiveMQ Cloud (MQTT/TLS:8883)
   - HiveMQ Cloud -> Raspberry Pi (bridge.js via wildcard subscription)
   - Bridge parsea JSON y escribe en Supabase (sensor_readings + devices)
   - Frontend escucha Supabase Realtime

## Estructura del proyecto (propuesta)
```
/kittypau_app
|-- src/
|   |-- app/                  # Next.js App Router
|   |   |-- (public)/
|   |   |-- (protected)/
|   |   |-- api/
|   |   |   |-- mqtt/
|   |   |   |   `-- webhook/route.ts
|   |   |   |-- pets/route.ts
|   |   |   |-- devices/route.ts
|   |   |   `-- readings/route.ts
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |-- lib/
|   |   |-- supabase/
|   |   |   |-- client.ts
|   |   |   `-- server.ts
|   |   `-- auth.ts
|   `-- styles/
`-- .env.local
```

## Modelo de datos (Supabase / PostgreSQL)
### Tablas principales
1. **profiles**
   - `id` (uuid, PK, = auth.user.id)
   - `full_name`
   - `phone`
   - `created_at`

2. **pets**
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK -> profiles.id)
   - `name`
   - `species` (cat/dog/other)
   - `birth_date` (date, nullable)
   - `created_at`

3. **devices**
   - `id` (uuid, PK)
   - `owner_id` (uuid, FK -> profiles.id)
   - `pet_id` (uuid, FK -> pets.id, nullable)
   - `device_code` (string, unique, ej: KPCL0001)
   - `device_type` (enum: food_bowl | water_bowl)
   - `status` (active | inactive)
   - `battery_level` (int)
   - `last_seen` (timestamp)
   - `created_at`

4. **readings**
   - `id` (uuid, PK)
   - `device_id` (uuid, FK -> devices.id)
   - `pet_id` (uuid, FK -> pets.id, nullable)
   - `weight_grams` (int, nullable)  # comida
   - `water_ml` (int, nullable)      # agua
   - `temperature` (float, nullable)
   - `humidity` (float, nullable)
   - `battery_level` (int, nullable)
   - `recorded_at` (timestamp, default now())

### Reglas RLS (resumen)
- `profiles`: cada usuario solo ve su perfil.
- `pets`: `owner_id = auth.uid()`
- `devices`: `owner_id = auth.uid()`
- `readings`: se validan via join a devices/pets del usuario.

## API endpoints minimos (Next.js)
1. **POST `/api/mqtt/webhook`**
   - Recibe datos desde HiveMQ.
   - Valida `x-webhook-token`.
   - Inserta en `readings` y actualiza `devices.last_seen`.

2. **GET/POST `/api/pets`**
   - Lista mascotas del usuario.
   - Crea nueva mascota.

3. **GET/POST `/api/devices`**
   - Lista dispositivos.
   - Registra dispositivo (device_code, tipo, mascota opcional).

4. **GET `/api/readings?device_id=...`**
   - Devuelve lecturas recientes para graficos.

## Vistas del MVP
1. **Login/Registro**
2. **Onboarding**: completar perfil
3. **Mascotas**: crear y listar
4. **Dispositivos**: registrar con QR y asignar mascota
5. **Dashboard**: graficos + estado en vivo (Realtime)

## UX clave (registro)
- Registro en pop-up (web y movil).
- Barra de progreso con 3 hitos: Usuario -> Mascota -> Dispositivo.
- Progreso persistente si se cierra.

## Streaming en tiempo real
- Supabase Realtime sobre `readings`.
- Frontend se suscribe por `device_id` y actualiza graficos.
- Alternativa: polling cada X segundos (fallback si Realtime falla).

## Paso a paso (implementacion)
1. Crear proyecto Supabase y configurar Auth + DB.
2. Crear esquema SQL y RLS.
3. Inicializar Next.js (App Router).
4. Configurar cliente Supabase (server/client).
5. Crear endpoints `/api/*`.
6. Crear UI base y flujo de onboarding.
7. Integrar Realtime en Dashboard.
8. Desplegar bridge en Raspberry Pi (copiar, npm install, systemd).
9. Verificar flujo end-to-end (ESP8266 -> HiveMQ -> RPi -> Supabase -> App).
10. Deploy en Vercel con variables de entorno.

## Nota sobre el deploy
- **Vercel**: frontend + API routes (`/api/*`). No hay backend separado para la web.
- **Raspberry Pi**: ejecuta `bridge.js` 24/7 como servicio systemd. Es el unico componente on-premise.
- **Supabase**: base de datos PostgreSQL gestionada en la nube.
- El webhook (`/api/mqtt/webhook`) se mantiene como alternativa futura si se elimina la RPi.

## Variables de entorno (ejemplo)
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server
MQTT_WEBHOOK_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Criterio de exito del MVP
- Usuario crea cuenta
- Registra mascota
- Registra dispositivo
- Recibe lecturas en vivo en la app

---

## Proximos pasos inmediatos
- Finalizar deploy del bridge en Raspberry Pi (systemd 24/7).
- Implementar login y registro en UI.
- Implementar CRUD de mascotas y dispositivos.
- Habilitar Realtime en dashboard.
- Deploy en Vercel con variables de entorno.
- Prueba end-to-end en produccion.

## Documento maestro de dominio
- Ver `Docs/DOC_MAESTRO_DOMINIO.md` antes de codificar.

## Notas de implementacion
- Ver `Docs/NOTAS_IMPLEMENTACION.md` antes de comenzar UI y API.

## Contratos por vista
- Ver `Docs/CONTRATOS_POR_VISTA.md`.

## Estilos y diseno
- Ver `Docs/estilos y diseños.md`.

## Enums y reglas
- Ver `Docs/ENUMS_OFICIALES.md`.
- Ver `Docs/REGLAS_INTERPRETACION_IOT.md`.

## Migracion SQL
- Ver `Docs/GUIA_MIGRACION_SQL.md`.
