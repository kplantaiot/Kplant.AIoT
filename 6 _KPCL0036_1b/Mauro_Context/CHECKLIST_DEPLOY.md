# Checklist de Deploy (Kittypau)

## 0) ANTES DE EMPEZAR - Reconciliar schemas SQL

> **IMPORTANTE**: Existen dos schemas SQL incompatibles en el proyecto.
> NO ejecutar ningun SQL en produccion hasta resolver esto.
>
> - **Schema App** (`Docs/SQL_SCHEMA.sql`): tablas `devices` (UUID pk), `readings` (weight_grams, temperature, humidity). Incluye profiles, pets, breeds, RLS.
> - **Schema Bridge** (`bridge/supabase_schema.sql`): tablas `devices` (TEXT pk = device_code), `sensor_readings` (weight, temp, hum, light_lux). Sin usuarios ni mascotas.
>
> **El bridge actualmente escribe en tablas con nombres y tipos distintos a los de la app.**
>
> Opciones:
> - **Opcion A**: Schema hibrido (crear ambas tablas + vista de reconciliacion).
> - **Opcion B**: Mantener separados (tablas IoT aparte de tablas App).
> - **Opcion C (recomendada)**: Adaptar `bridge.js` para escribir en el schema App (mapear weight->weight_grams, temp->temperature, hum->humidity, buscar device por device_code en vez de usarlo como PK).
>
> Ver detalle completo en `Docs/NOTA_SCHEMAS_SQL.md`.

- [ ] **Decidir opcion de reconciliacion de schemas (A, B o C).**
- [ ] Implementar los cambios necesarios segun la opcion elegida.
- [ ] Verificar que bridge.js escribe correctamente en las tablas finales.

## 1) Supabase listo
- [ ] Proyecto creado en Supabase.
- [ ] Ejecutar el SQL unificado (segun opcion elegida en paso 0) en SQL Editor.
- [ ] Auth habilitado (email/password).
- [ ] Obtener `SUPABASE_URL` y keys.
- [ ] Crear al menos 1 dispositivo en `devices` con `device_code`.

## 2) Variables de entorno en Vercel
Agregar en **Settings -> Environment Variables**:
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MQTT_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3) Deploy en Vercel
- [ ] Crear proyecto en Vercel.
- [ ] Seleccionar carpeta `kittypau_app`.
- [ ] Framework detectado: Next.js.
- [ ] Deploy exitoso.

## 4) Bridge MQTT en Raspberry Pi
- [x] Raspberry Pi Zero 2 W con Raspberry Pi OS Lite.
- [x] Node.js v20 instalado.
- [x] SSH operativo (usuario: `kittypau`, clave SSH dedicada).
- [x] Bridge `bridge.js` copiado a `~/kittypau-bridge/`.
- [x] `npm install` completado (56 paquetes, 0 vulnerabilidades).
- [x] `.env` con credenciales HiveMQ + Supabase creado.
- [x] Prueba manual exitosa: 7 dispositivos detectados (KPCL0033-0040).
- [x] Servicio systemd creado, habilitado y corriendo (`kittypau-bridge.service`).
- [x] Auto-inicio habilitado (`systemctl enable`).
- [x] Logs verificados: datos fluyendo a Supabase.
- [x] WiFi configurado: Jeivos, Casa 15, Suarez_Mujica_891.
- [ ] Instalar Tailscale para acceso remoto desde cualquier red.
- Ver `Docs/RASPBERRY_BRIDGE_SETUP.md` para detalles completos.

## 5) Prueba de extremo a extremo
- [x] ESP8266 encendido y publicando en HiveMQ.
- [x] Bridge en RPi recibiendo y guardando en Supabase.
- [x] Verificar insercion en `sensor_readings`.
- [x] Confirmar `devices.last_seen` actualizado.
- [ ] Registrar dispositivo desde app con QR y asociarlo a una mascota.

## 6) Realtime (opcional)
- [ ] Suscripcion activa en frontend.
- [ ] Ver datos en vivo al insertar lecturas.

## 7) Webhook en HiveMQ (alternativa futura)
- [ ] URL: `https://TU_PROYECTO.vercel.app/api/mqtt/webhook`
- [ ] Header: `x-webhook-token: TU_SECRETO`
- [ ] Topic filter: `+/SENSORS`
- Nota: Solo necesario si se elimina la RPi como intermediario.

## Estado (hasta 2026-02-06)
- [x] Endpoint `/api/mqtt/webhook` creado.
- [x] Script local `scripts/test-webhook.ps1` funciona.
- [x] Prueba local con `success: true`.
- [x] Firmware ESP8266 completo (MQTT/TLS, sensores, OTA, calibracion).
- [x] Bridge `bridge.js` funcional con wildcard y auto-registro.
- [x] RPi Zero 2 W configurada con Node.js v20 y SSH.
- [x] Bridge desplegado en RPi como servicio systemd 24/7.
- [x] 7 dispositivos detectados y escribiendo en Supabase.
- [ ] Instalar Tailscale en RPi (acceso remoto sin estar en misma red).
