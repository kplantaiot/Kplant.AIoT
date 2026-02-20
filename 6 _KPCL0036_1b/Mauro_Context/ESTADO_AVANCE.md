# Estado del Proyecto y Proximos Pasos (2026-02-15)

## Resumen de avance
- Proyecto Next.js en `kittypau-app/` (TypeScript + App Router) desplegado en Vercel.
- Endpoints API listos: `/api/pets`, `/api/devices`, `/api/readings`, `/api/mqtt/webhook`.
- **Bridge v2.4** corriendo 24/7 en RPi Zero 2 W, escribe directamente a Supabase (ya no usa webhook).
- Firmware v1.1 flasheado en KPCL0035, KPCL0038 (OTA) y KPCL0040 (USB).
- Esquema SQL actualizado con constraints para bridge (`device_type: 'bridge'`, `device_id: KPBR`).
- Tablas bridge: `bridge_heartbeats` (telemetria), `bridge_status_live` (VIEW), `admin_dashboard_live` (VIEW).
- `bridge_telemetry` eliminada (redundante con bridge_heartbeats).

## Lo que ya funciona
1. Bridge 24/7 como servicio systemd (`kittypau-bridge`) en RPi.
2. Bridge escribe directamente a Supabase: `sensor_readings`, `devices`, `bridge_heartbeats`.
3. Auto-registro de dispositivos (device_state: factory -> linked al publicar STATUS).
4. CRUD de `pets` y `devices` funcionando con Auth.
5. Lecturas (`sensor_readings`) por `device_id` (TEXT, no UUID).
6. Bridge publica telemetria RPi cada 60s como KPBR0001/STATUS.
7. Views: `latest_readings`, `bridge_status_live`, `admin_dashboard_live`.
8. IP history tracking en JSONB (`devices.ip_history`).
9. Trigger actualiza `devices.last_seen` y `battery_level`.

## Pendiente inmediato
1. Flashear firmware v1.1 a dispositivos pendientes (KPCL0033, 0034, 0037 via USB; KPCL0031, 0036 offline).
2. Aplicar Design Tokens + componentes base (Button, Card, Input).
3. Realtime en dashboard (suscripcion a sensor_readings).
4. Pop-up de registro con progreso (Usuario -> Mascota -> Dispositivo).

## Mejoras Firmware — Pendientes (2026-02-20)

### CRITICO (seguridad activa)
- [ ] **FW-01** ESP32-CAM: reemplazar `setInsecure()` con certificado ISRG Root X1 (igual que ESP8266). Ambos deben validar TLS.
- [ ] **FW-02** MQTT: crear usuario por device en HiveMQ Cloud (KPCL0038, KPCL0040, etc.) con ACL restringida a sus propios topics. Hoy todos comparten `Kittypau1/Kittypau1234`.
- [ ] **FW-03** WiFi: extraer credentials hardcodeadas del binario. Implementar modo provisioning: AP captive portal en primer arranque sin credenciales guardadas.

### Alta (confiabilidad)
- [ ] **FW-04** Reemplazar DHT11 por DHT22/AM2302 en hardware. Misma librería/pin, precision ±0.5°C vs ±2°C. Reduce errores NaN frecuentes.
- [ ] **FW-05** ESP8266: corregir curva LDR de lineal a logarítmica, o reemplazar por BH1750 (I2C, lux reales sin calibración).
- [ ] **FW-06** Ambos: agregar contador de reinicios persistente (`/boot_count.json`) publicado en STATUS para detectar crash loops desde Supabase.

### Media (mantenibilidad)
- [ ] **FW-07** ESP32-CAM: mover HTML de UI (4KB string embebido en `camera_manager.cpp`) a archivo en SPIFFS (`/www/index.html`). Permite actualizar UI sin recompilar.
- [ ] **FW-08** Ambos: mover timezone a constante en `config.h` con comentario explicativo. Actualmente string mágico hardcodeado en `mqtt_manager.cpp`.
- [ ] **FW-09** ESP32-CAM: limitar frame rate del stream MJPEG (~10fps). Sin límite puede saturar el AP y bloquear loop MQTT.
- [ ] **FW-10** ESP32-CAM: manejar overflow de capturas explícitamente (buffer circular o respuesta JSON de error en `/save`). Hoy falla silencioso al llegar a 50 archivos.

## Arquitectura actual (2026-02-15)
```
ESP8266/ESP32-CAM -> MQTT (HiveMQ TLS) -> RPi Bridge v2.4 -> Supabase (directo)
                                                                   |
                                                            Next.js App (Vercel)
```
- Bridge ya NO pasa por `/api/mqtt/webhook`. Escribe directamente a Supabase con `service_role` key.
- Bridge auto-registra dispositivos desconocidos en tabla `devices`.
- Bridge actualiza `device_state = 'linked'` en cada STATUS recibido.

## Implementado (historico hasta 2026-02-08)
- Backend hardening v1 completo (errores, rate limit, validaciones, auditoria, RPC, indices, cleanup).
- Documentacion CLI completada (Vercel, Supabase, HiveMQ, Raspberry) con ejemplos.
- Tests post-migracion OK (2026-02-08): DB/API KPCL0159 + onboarding KPCL0208.
- Errores API estandarizados con `code` y `request_id`.
- Rate limiting basico aplicado (webhook y endpoints mutables).
- Auditoria basica agregada (tabla `audit_events` + inserciones).
- RPC `link_device_to_pet` agregado para alta atomica de device + pet_state.
- Indices compuestos agregados para consultas frecuentes (pets/devices/readings).
- UI base login/today implementada, conectada a datos reales.
- Onboarding API ampliada (profiles PUT campos, pets POST/patch steps, devices POST actualiza pet_state).

## Implementado (2026-02-13 a 2026-02-15)
- Firmware v1.0: WiFi unificado, OTA, backoff MQTT, status extendido.
- Firmware v1.1: WiFi merge normalizado (hardcoded + filesystem), correccion DEVICE_ID.
- Flash OTA exitoso: KPCL0035 (192.168.1.91), KPCL0038 (192.168.1.87).
- Flash USB: KPCL0040 (ESP32-CAM).
- Bridge v2.0 -> v2.4: mapeo campos, device_id TEXT, ip_history, RPi status, heartbeats.
- SQL: constraint device_type incluye 'bridge', device_id acepta KPBR prefix.
- SQL: bridge_heartbeats con telemetria completa, bridge_telemetry eliminada.
- SQL: bridge_status_live y admin_dashboard_live recreadas como VIEWs.
- Bridge fix: device_state se actualiza a 'linked' automaticamente.

## Conectividad validada
- [x] Bridge ↔ HiveMQ (MQTT TLS, wildcard +/SENSORS +/STATUS).
- [x] Bridge ↔ Supabase (service_role, sensor_readings + devices + bridge_heartbeats).
- [x] Backend ↔ Supabase (constraints + schema cache + RLS smoke test).
- [x] Backend ↔ Front (contratos documentados y pruebas OK).
- [x] OTA funcional para ESP8266 (KPCL0035, KPCL0038 actualizados remotamente).

## Verificaciones cerradas (operacion)
- [x] Schema cache refrescado en Supabase.
- [x] Constraints de onboarding aplicadas (2026-02-07).
- [x] Constraint device_type incluye 'bridge' (2026-02-14).
- [x] Constraint device_id acepta KPBR prefix (2026-02-14).
- [x] bridge_heartbeats con telemetria completa (2026-02-15).
- [x] device_state se actualiza a 'linked' automaticamente (2026-02-15).
- [x] Variables de entorno validadas entre Vercel y Raspberry.
- [x] Smoke test RLS ejecutado (multiusuario, 2026-02-07).

## Riesgos conocidos
- Realtime no esta integrado aun en frontend.
- 5 dispositivos pendientes de actualizar a firmware v1.1.
- OTA no funciona en ESP32-CAM (requiere USB).
