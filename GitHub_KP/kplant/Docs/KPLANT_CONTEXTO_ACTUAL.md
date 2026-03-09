# Kplant - Contexto Actual

Fecha: 2026-03-09 (actualizado)

## Resumen ejecutivo
- Se creo la base de firmware para Kplant en ESP32-C3 y compila correctamente en PlatformIO.
- Se definio cuenta raiz del proyecto: `kplant.aiot@gmail.com`.
- Se aprovisiono broker HiveMQ Cloud y proyecto Supabase.
- Se aplico migracion SQL inicial de Supabase (schema + RLS).
- Se desplego bridge Kplant en Raspberry Pi y quedo corriendo como servicio `systemd`.
- Se creo `kplant_app` (Next.js) dentro del repo y se publico primer deploy en Vercel.
- Se consolidaron tareas pendientes y checklist de conectividad.

## Decisiones tomadas
- Arquitectura base: `ESP32-C3 -> HiveMQ -> Bridge Node.js -> Supabase -> App Next.js`.
- Credencial MQTT fase inicial:
  - Se usara `Kplant1` para todo el hardware temporalmente.
  - Se planifica migracion posterior a credenciales por dispositivo.

## Estado de infraestructura

### HiveMQ
- Host: `175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud`
- TLS MQTT: `8883`
- WSS: `8884/mqtt`
- Credenciales creadas:
  - `Kplant1` (uso actual hardware)
  - `Kplant2` (reserva/operacion)

### Supabase
- Proyecto creado.
- URL: `https://zjdyhpntftgaynchqwfk.supabase.co`
- Keys disponibles:
  - `sb_publishable_...` (frontend/public)
  - `sb_secret_...` (backend/bridge/server)
  - Legacy `anon` y `service_role` tambien visibles.
- Migracion aplicada:
  - `kplant/supabase/migrations/001_initial_schema.sql`
  - Tablas creadas: `plants`, `devices`, `sensor_readings`, `readings`, `profiles`
  - RLS habilitado y politicas base creadas.

## Estado de firmware
- Ruta: `kplant/iot_firmware/firmware-esp32c3`
- Implementado:
  - `config.h`, `platformio.ini`
  - `sensors.*` (AHT10, VEML7700, suelo ADC, bateria ADC)
  - `display.*` (OLED SSD1306 128x32)
  - `wifi_manager.*`
  - `mqtt_client.*` (TLS + reconexion)
  - `main.cpp` (intervalos, payloads SENSORS/STATUS, display update)
- Build: `SUCCESS` con `pio run -e esp32-c3-superMini`.

## Estado de bridge (Raspberry)
- Raspberry detectada en red: `192.168.100.119`
- Acceso SSH validado con key local de Kittypau:
  - `C:\Users\Equipo\.ssh\kittypau_rpi`
  - Usuario remoto: `kittypau`
- Deploy realizado en:
  - `/home/kittypau/kplant-bridge`
- Servicio systemd instalado y activo:
  - `kplant-bridge.service`
  - Estado: `active (running)`
- Logs confirmados en Raspberry:
  - `[MQTT] Connected`
  - `[MQTT] Subscribed +/SENSORS`
  - `[MQTT] Subscribed +/STATUS`
- Fix aplicado (2026-03-08):
  - Se agrego heartbeat de estado del bridge a `devices` cada 60s.
  - Bridge device registrado: `KPBR0002`.
  - Campos de estado visibles en Supabase: `last_seen`, `wifi_status`, `wifi_ip`, `sensor_health`.
- Nota de correccion aplicada:
  - Se ajusto unit file de `/home/kplant/...` a `/home/kittypau/...`.
  - Archivo corregido en repo: `kplant/bridge/systemd/kplant-bridge.service`

## Pendientes importantes
- Comandos MQTT en `/cmd` (reboot, update intervalos, update wifi).
- Bajo consumo/sleep para bateria.
- Calibracion guiada de suelo y persistencia.
- Vercel: cerrar integracion Git con repo `Jeivous/kittypau_1a` y `Root Directory`.
- Validar telemetria real desde hardware (actualmente sin tarjeta transmitiendo).
- Verificar inserciones `sensor_readings`/`readings` con device real `KPPL...`.
- Migracion futura de credenciales MQTT compartidas a credenciales por dispositivo.

## Archivos de referencia
- `kplant/Docs/CONNECTIVITY_SETUP_CHECKLIST.md`
- `kplant/bridge/DEPLOY_RPI.md`
- `kplant/bridge/systemd/kplant-bridge.service`
- `kplant/supabase/queries/healthcheck.sql`
- `kplant/PENDING_TASKS.md`

## Estado web (Vercel)
- App creada: `kplant/kplant_app`
- Commit de scaffold publicado:
  - `cfe610b feat(kplant): scaffold kplant_app with Next.js`
- Proyecto Vercel enlazado por CLI:
  - Project: `kplant_app`
  - Team: `kplantaiot's projects`
  - URL produccion: `https://kplantapp.vercel.app`
- Variables cargadas en Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL` (Production, Development)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production, Development)
  - `SUPABASE_SERVICE_ROLE_KEY` (Production, Development)
- Bloqueo actual:
  - Integracion Git en Vercel todavia no conecta `Jeivous/kittypau_1a`.
  - Sintoma: en `Project Settings > Git` solo aparece owner `kplantaiot`.
  - Ya se autorizo OAuth de Vercel en GitHub `Jeivous`, pero falta que Vercel lo refleje en selector de owner.

## Proximo paso al retomar
1. En Vercel `Project Settings > Git`, completar conexion a `Jeivous/kittypau_1a`.
2. Ajustar `Root Directory` a `GitHub_KP/kplant/kplant_app`.
3. Configurar variables `Preview` (al quedar conectado Git).
4. Probar deploy automatico con push en rama `3.1a`.
