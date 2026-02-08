# Kittypau - Hitos y Pendientes
**Ultima actualizacion:** 2026-02-08 (v4)

---

## Completado

### Firmware ESP8266
1. [x] **WiFi multi-red:** Conexion a redes conocidas, reconexion automatica, gestion dinamica via MQTT (ADDWIFI/REMOVEWIFI), credenciales en LittleFS.
2. [x] **MQTT/TLS:** Conexion segura a HiveMQ Cloud (puerto 8883, certificado ISRG Root X1), backoff exponencial (5s-60s), verificacion de heap (>20KB) antes de TLS.
3. [x] **Sensores:** Publicacion periodica de peso (HX711), temperatura/humedad (DHT), luz (LDR) cada 10s. Calibracion via MQTT con persistencia en LittleFS. Filtro deadband 2g para estabilidad.
4. [x] **Estado del dispositivo:** Publicacion de STATUS cada 15s (WiFi, IP, sensor_health). Online/Offline con debounce de 15 segundos. DEVICE_ID dinamico como key del payload.
5. [x] **Indicador LED:** Parpadeo no bloqueante. 3 blinks = buscando WiFi, 1 blink = publish, 2 blinks = subscribe/comando.
6. [x] **NTP:** Timestamps sincronizados en formato `MM-dd-aaaa HH:mm:ss`.
7. [x] **OTA:** Actualizacion de firmware via WiFi con ArduinoOTA.
8. [x] **Arquitectura modular:** Codigo desacoplado en wifi_manager, mqtt_manager, sensors, led_indicator. LED desacoplado de MQTT via callbacks.

### Bridge e Infraestructura
9. [x] **Bridge Node.js:** `bridge.js` con wildcard (`+/SENSORS`, `+/STATUS`), auto-registro de dispositivos, escritura en Supabase.
10. [x] **Raspberry Pi Zero 2 W:** OS Lite instalado, Node.js v20, SSH con clave ED25519, 3 redes WiFi (Jeivos, Casa 15, Suarez_Mujica_891).
11. [x] **Deploy del bridge en RPi:** Archivos copiados, npm install (56 paquetes), servicio systemd habilitado 24/7 con auto-restart. 8 dispositivos detectados (KPCL0033, 0035, 0036, 0037, 0038, 0039, 0040).
12. [x] **Supabase:** Proyecto creado, credenciales verificadas, datos fluyendo desde el bridge.
13. [x] **HiveMQ Cloud:** Broker operativo, credenciales (Kittypau1/Kittypau1234), todos los dispositivos publicando.
14. [x] **Flujo IoT verificado:** ESP8266 -> HiveMQ -> Bridge -> Supabase funcionando de extremo a extremo con 8 dispositivos.

### Documentacion
15. [x] **Mauro_Context completo:** Arquitectura, topicos MQTT, firmware, bridge, RPi, schemas SQL, evaluacion del proyecto, checklist de deploy, estilos y flujos UX.

### Schema SQL y Bridge v2.0 → v2.1
16. [x] **Schema SQL unificado:** 7 tablas (profiles, breeds, pets, pet_breeds, devices, sensor_readings, system_events) con UUID como PK, RLS, triggers, vistas y datos iniciales de razas. Archivo: `SQL_UNIFICADO.sql`.
17. [x] **Bridge v2.0:** Actualizado para schema unificado. Busca device por `device_code`, usa UUID como FK, mapea campos (weight→weight_grams, temp→temperature, hum→humidity), cache en memoria, guarda device_timestamp.

### Migracion V2 y correcciones (2026-02-07)
18. [x] **SQL Migracion V2:** `device_id` (TEXT) como PRIMARY KEY de `devices` (reemplaza UUID). `sensor_readings` usa `device_id` como FK directa sin JOINs. Script idempotente en `SQL_MIGRACION_V2.sql`.
19. [x] **Bridge v2.1:** Escribe `device_id` directo (ej: KPCL0039) sin cache UUID ni lookups. Desplegado en RPi.
20. [x] **KPCL0039 flasheado:** Firmware cargado en nueva placa. 8 dispositivos activos (KPCL0033, 0035, 0036, 0037, 0038, 0039, 0040).
21. [x] **Fix crash bridge:** El bridge se caia porque `dotenv` buscaba `.env` en `~` en vez de `/home/kittypau/kittypau-bridge/`. Resuelto con `WorkingDirectory` en systemd.
22. [x] **Servicio systemd mejorado:** `kittypau-bridge.service` con `Restart=always`, `RestartSec=5`, logs en `journalctl`. Arranca automaticamente con la Pi.
23. [x] **SUPABASE_SERVICE_KEY corregido:** Se estaba usando el password de la DB (`sb_secret_...`) en vez del JWT service_role (`eyJ...`). Corregido en `.env` de la Pi.
24. [x] **Proceso duplicado eliminado:** Se detecto y elimino un bridge manual corriendo en paralelo al servicio systemd.

### Documentacion v4 (2026-02-08)
25. [x] **Unificar `device_code` → `device_id` en docs:** Reemplazado en 24 archivos de Mauro_Context. `device_id` (TEXT, ej: KPCL0036) es el PRIMARY KEY de `devices` en toda la documentacion.

---

## Pendiente

### FASE 0 - Decisiones bloqueantes (resolver antes de programar)
18. [x] ~~**Reconciliar schemas SQL:**~~ Resuelto con Opcion C. Schema unificado en `SQL_UNIFICADO.sql`, bridge v2.0 adaptado.
19. [ ] **Definir stack de la app:** Decidir entre la app existente (Vite+Express en `c:\Kittypau\1\apps\app_principal`) o construir la documentada en Mauro_Context (Next.js+Supabase+Vercel). Hay 3 arquitecturas incompatibles que deben unificarse. Ver `Mauro_Context/EVALUACION_PROYECTO.md`.
20. [ ] **Definir flujo QR → claim device:** Documentar endpoint y logica para la transicion `factory → claimed → linked`. Definir que contiene el QR (device_id o token), como el usuario "reclama" un dispositivo auto-registrado por el bridge.

### FASE 1 - Infraestructura y base de datos
25. [x] **Ejecutar SQL unificado en Supabase:** 7 tablas creadas, 26 razas cargadas, triggers, vistas y RLS activos.
26. [x] **Deploy bridge v2.1 en RPi:** Copiado, .env actualizado con service_role JWT correcto, servicio systemd reiniciado. Sensors y Status fluyendo sin errores.
27. [ ] **Tailscale + acceso remoto RPi:** Instalar Tailscale para SSH desde cualquier red sin depender de estar en la misma WiFi. Esto tambien resuelve el problema de IP dinamica.
28. [ ] **Proteger bridge local:** Agregar restriccion o doble confirmacion en `bridge/bridge.js` local para evitar ejecucion accidental desde Windows (el bridge productivo corre en la RPi).
29. [x] **Verificar datos en Supabase:** Confirmado. sensor_readings de todos los dispositivos (KPCL0033-0040) insertandose correctamente con el service_role JWT.
31. [ ] **Crear trigger auto-insert en `profiles`:** Cuando un usuario se registra via Supabase Auth, debe crearse automaticamente un row en `profiles` con el `id` y `email` del usuario. Sin esto, el registro no funciona.
32. [ ] **Limpiar credenciales de documentacion:** Eliminar contraseñas MQTT, claves Supabase y URLs de broker expuestas en archivos de Mauro_Context antes de subir a repositorio publico.
33. [ ] **Sensores fisicos con errores:** Revisar conexiones de hardware en las placas afectadas:
    - KPCL0035: `ERR_HX711` + DHT falla (solo luz funciona)
    - KPCL0037: `ERR_HX711`
    - KPCL0038: `ERR_HX711`
    - KPCL0039: `ERR_HX711`
    - KPCL0036: `ERR_DHT`
    - KPCL0040: `ERR_HX711` (ESP32-CAM, firmware diferente)
    - KPCL0033: OK (unico con todos los sensores funcionando)

### FASE 2 - App Web
21. [ ] **Construir app web:** Conectar a Supabase para leer datos del bridge. Incluye estructura base, rutas y componentes principales.
22. [ ] **Auth y registro:** Login/registro con Supabase Auth. Guardar auth_provider, user_name, is_owner, care_rating, notification_channel.
23. [ ] **Onboarding con progreso:** Flujo: Usuario -> Mascota (tipo, razas, peso) -> Dispositivo (escaneo QR obligatorio, asociar a mascota).
24. [ ] **CRUD mascotas y dispositivos:** APIs y UI para crear, editar y eliminar mascotas y dispositivos. Validaciones: email unico, weight_kg en rango, max 3 razas.
25. [ ] **Dashboard con datos en vivo:** Visualizacion de sensores usando Supabase Realtime. Vistas /today y /story (interpretacion IoT).

### FASE 3 - Deploy y validacion
26. [ ] **Configurar variables de entorno:** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MQTT_WEBHOOK_SECRET en la plataforma de deploy.
27. [ ] **Deploy de la app:** Vercel (si Next.js) o Railway/Render (si Express).
28. [ ] **Prueba end-to-end en produccion:** Registrar dispositivo desde app con QR, verificar datos fluyendo desde ESP8266 hasta dashboard.

### FASE 4 - Administracion y planes de usuario
29. [ ] **Sistema de roles y planes:** Definir niveles de acceso (Basic, Premium, Diamante). Agregar columna `plan` a `profiles`. Implementar middleware/RLS que limite funcionalidades segun plan.
    - **Basic (gratis):** 1 mascota, 1 dispositivo, dashboard basico (/today), historial 7 dias.
    - **Premium:** Multiples mascotas y dispositivos, historial 30 dias, /story, alertas por email.
    - **Diamante:** Todo Premium + historial ilimitado, exportacion de datos, alertas push/WhatsApp, soporte prioritario.
30. [ ] **Admin panel:** Vista para administrar usuarios, cambiar planes, ver metricas de uso. Protegida con rol `admin` en profiles.
31. [ ] **Limites y validaciones por plan:** Bloquear creacion de mascotas/dispositivos si excede el limite del plan. Mostrar CTA de upgrade cuando se alcanza el limite.

### Mejoras futuras
32. [ ] **Buffer local en bridge:** SQLite o JSON para datos que fallen al escribir en Supabase, con reintento automatico.
33. [ ] **Alertas de caida:** Notificacion (email/push) si el bridge deja de funcionar o un dispositivo deja de reportar.
34. [ ] **Webhook HiveMQ (alternativa futura):** URL con header x-webhook-token y topic filter +/SENSORS como alternativa o complemento al bridge.

---

## Flujo actual (operativo)
```
ESP8266 (8 dispositivos) --MQTT/TLS--> HiveMQ Cloud --wildcard--> RPi Bridge --REST--> Supabase
                                                                                          |
                                                                                     [App Web] (pendiente)
```

## Documentos de referencia
| Documento | Contenido |
|-----------|-----------|
| `Mauro_Context/NOTA_SCHEMAS_SQL.md` | Detalle del conflicto SQL y opciones de reconciliacion |
| `Mauro_Context/EVALUACION_PROYECTO.md` | Analisis de las 3 arquitecturas incompatibles |
| `Mauro_Context/CHECKLIST_DEPLOY.md` | Checklist paso a paso para deploy completo |
| `Mauro_Context/NOTAS_IMPLEMENTACION.md` | Reglas y validaciones para implementar |
| `Mauro_Context/ESTADO_AVANCE.md` | Estado general del proyecto |
| `Mauro_Context/FRONT_BACK_APIS.md` | Contratos de API y endpoints |
