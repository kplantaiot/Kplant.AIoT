# Estado del Proyecto y Proximos Pasos (2026-02-06)

## Resumen de avance
- Proyecto Next.js creado en `kittypau_app/` (TypeScript + App Router).
- Endpoint webhook listo: `src/app/api/mqtt/webhook/route.ts`.
- Cliente Supabase server listo: `src/lib/supabase/server.ts`.
- `.env.local` creado en `kittypau_app/`.
- SQL base generado en `Docs/SQL_SCHEMA.sql`.
- Firmware ESP8266 completo y funcional (sensores, MQTT/TLS, OTA, calibracion).
- Bridge Node.js (`bridge/bridge.js`) listo con wildcard y auto-registro.
- Raspberry Pi Zero 2 W configurada: OS instalado, Node.js v20, SSH operativo.
- Credenciales HiveMQ Cloud y Supabase verificadas.

## Lo que ya funciona
1. ESP8266 publica sensores (peso, temp, humedad, luz) cada 10s y status cada 15s via MQTT/TLS.
2. HiveMQ Cloud recibe y retransmite mensajes de todos los dispositivos KPCL.
3. Bridge (`bridge.js`) se conecta a HiveMQ, parsea mensajes y escribe en Supabase.
4. Supabase almacena lecturas en `sensor_readings` y estado en `devices`.
5. Raspberry Pi Zero 2 W operativa con SSH y Node.js v20.
6. Webhook local probado con exito (via script `test-webhook.ps1`).

## En progreso
1. Completar deploy del bridge en Raspberry Pi (copiar archivos, npm install, configurar systemd).
   - Ver `Docs/RASPBERRY_BRIDGE_SETUP.md` para configuracion completa.

## Pendiente inmediato
1. Finalizar servicio systemd del bridge en la RPi (24/7).
2. Crear UI base (login, mascotas, dispositivos, dashboard).
3. Implementar CRUD de mascotas y dispositivos.
4. Activar Realtime en dashboard.
5. Definir y construir pop-up de registro con progreso (Usuario -> Mascota -> Dispositivo).

## Pendiente de infraestructura
1. Deploy en Vercel (frontend + API routes).
2. Configurar variables en Vercel.
3. Probar end-to-end en produccion (ESP8266 -> HiveMQ -> RPi Bridge -> Supabase -> App Web).

## Hitos completados del firmware ESP8266
1. Conectividad WiFi con gestion de multiples redes (LittleFS).
2. Indicador LED para busqueda/reconexion WiFi (3 blinks).
3. Sincronizacion NTP para timestamps precisos.
4. Conexion MQTT/TLS con certificado ISRG Root X1 (HiveMQ Cloud).
5. Backoff exponencial para reconexion MQTT (5s-60s).
6. Indicador LED para eventos MQTT (1 blink = publish, 2 = subscribe).
7. Publicacion periodica de SENSORS (10s) y STATUS (15s).
8. Calibracion del sensor de peso via MQTT + persistencia en LittleFS.
9. Gestion dinamica de WiFi via MQTT (ADDWIFI/REMOVEWIFI).
10. Estado Online/Offline con debounce de 15 segundos (grace period).
11. Refactorizacion modular completa (wifi, mqtt, sensors, led desacoplados).
12. Actualizaciones OTA via ArduinoOTA.
13. Filtro deadband de 2g para estabilidad del peso.
14. Verificacion de heap (>20KB) antes de TLS.
- Ver `Docs/FIRMWARE_ESP8266.md` para detalles completos.

## Completado recientemente (2026-02-06)
- Configuracion de Raspberry Pi Zero 2 W (cloud-init, SSH, Node.js).
- Generacion de clave SSH dedicada para acceso a la RPi.
- Creacion de documentacion: `Docs/RASPBERRY_BRIDGE_SETUP.md`.
- Archivo `.env` del bridge con credenciales HiveMQ + Supabase.
- Fusion de documentacion IoT del proyecto a Mauro_Context.
- Creacion de docs: TOPICOS_MQTT.md, FIRMWARE_ESP8266.md, NOTA_SCHEMAS_SQL.md.

## Riesgos conocidos
- La RPi cambia de IP si se mueve de red WiFi (no tiene IP fija).
- **Discrepancia entre schemas SQL**: el bridge usa un schema diferente al de la app. Ver `Docs/NOTA_SCHEMAS_SQL.md`.
- `ARQUITECTURA_COMPLETA.md` tenia texto con codificacion antigua (corregido parcialmente).
