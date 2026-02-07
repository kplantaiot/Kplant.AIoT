# Kittypau - Hitos y Pendientes
**Ultima actualizacion:** 2026-02-07

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
11. [x] **Deploy del bridge en RPi:** Archivos copiados, npm install (56 paquetes), servicio systemd habilitado 24/7 con auto-restart. 7 dispositivos detectados (KPCL0033, 0035, 0036, 0037, 0038, 0040).
12. [x] **Supabase:** Proyecto creado, credenciales verificadas, datos fluyendo desde el bridge.
13. [x] **HiveMQ Cloud:** Broker operativo, credenciales (Kittypau1/Kittypau1234), todos los dispositivos publicando.
14. [x] **Flujo IoT verificado:** ESP8266 -> HiveMQ -> Bridge -> Supabase funcionando de extremo a extremo con 7 dispositivos.

### Documentacion
15. [x] **Mauro_Context completo:** Arquitectura, topicos MQTT, firmware, bridge, RPi, schemas SQL, evaluacion del proyecto, checklist de deploy, estilos y flujos UX.

---

## Pendiente

### FASE 0 - Decisiones bloqueantes (resolver antes de programar)
16. [ ] **Reconciliar schemas SQL:** El bridge escribe en `sensor_readings` (TEXT pk, campos: weight/temp/hum/light_*) pero la app documenta `readings` (UUID pk, campos: weight_grams/temperature/humidity). Decidir entre: (A) schema hibrido, (B) schemas separados con vista, o (C) adaptar bridge al schema de la app (recomendado). Ver `Mauro_Context/NOTA_SCHEMAS_SQL.md`.
17. [ ] **Definir stack de la app:** Decidir entre la app existente (Vite+Express en `c:\Kittypau\1\apps\app_principal`) o construir la documentada en Mauro_Context (Next.js+Supabase+Vercel). Hay 3 arquitecturas incompatibles que deben unificarse. Ver `Mauro_Context/EVALUACION_PROYECTO.md`.

### FASE 1 - Infraestructura y base de datos
18. [ ] **Ejecutar SQL unificado en Supabase:** Aplicar el schema definitivo segun la decision de la Fase 0. Habilitar Auth (email/password), verificar tablas y RLS.
19. [ ] **Adaptar bridge.js:** Si se elige Opcion C, mapear campos del bridge (weight->weight_grams, temp->temperature, hum->humidity) y buscar device por device_code en vez de usarlo como PK.
20. [ ] **Tailscale + acceso remoto RPi:** Instalar Tailscale para SSH desde cualquier red sin depender de estar en la misma WiFi. Esto tambien resuelve el problema de IP dinamica.

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

### Mejoras futuras
29. [ ] **Buffer local en bridge:** SQLite o JSON para datos que fallen al escribir en Supabase, con reintento automatico.
30. [ ] **Alertas de caida:** Notificacion (email/push) si el bridge deja de funcionar o un dispositivo deja de reportar.
31. [ ] **Webhook HiveMQ (alternativa futura):** URL con header x-webhook-token y topic filter +/SENSORS como alternativa o complemento al bridge.

---

## Flujo actual (operativo)
```
ESP8266 (7 dispositivos) --MQTT/TLS--> HiveMQ Cloud --wildcard--> RPi Bridge --REST--> Supabase
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
