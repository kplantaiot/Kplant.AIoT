# Kplant — Contexto Actual del Proyecto
**Fecha de actualización:** Marzo 2025
**Alineado con PMI — ver `kplant/PMI/`**

---

## 1. Resumen Ejecutivo

Kplant es un sistema AIoT de monitoreo inteligente de plantas. Integra hardware embebido,
conectividad MQTT en la nube, backend en tiempo real y PWA. Estado actual: **TRL 6–7**, MVP
funcional desplegado en producción.

**Arquitectura:**
```
ESP32-C3 → HiveMQ Cloud (MQTT TLS) → Bridge Node.js (RPi) → Supabase → Next.js App (Vercel)
```

| Campo | Valor |
|---|---|
| URL producción | https://kplantapp.vercel.app |
| Cuenta raíz | kplant.aiot@gmail.com |
| Repo público | github.com/kplantaiot/Kplant.AIoT |

---

## 2. Infraestructura

### HiveMQ Cloud
| Host | `175b4a24e828456884ccbd18fb1a5bd8.s1.eu.hivemq.cloud` |
|---|---|
| TLS | `8883` / WSS `8884/mqtt` |
| Credencial hardware | `Kplant1 / Kplant1234` (temporal) |
| Plan | Serverless Free |

### Supabase
| URL | `https://zjdyhpntftgaynchqwfk.supabase.co` |
|---|---|
| Migraciones | `001_initial_schema.sql`, `003_realtime_and_fixes.sql` |
| Realtime | `sensor_readings`, `devices` habilitadas |
| Tablas | plants, devices, sensor_readings, readings, profiles |

### Vercel
| URL | `https://kplantapp.vercel.app` |
|---|---|
| Framework | Next.js 15 App Router |
| Deploy | Subtree push `kplant/` → `kplantaiot/Kplant.AIoT` |
| Variables | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| Bloqueo | Integración Git con `Jeivous/kittypau_1a` pendiente |

---

## 3. Firmware (ESP32-C3 SuperMini)

**Ruta:** `kplant/iot_firmware/firmware-esp32c3` | Build: SUCCESS

**Implementado:** config.h, sensors (AHT10+VEML7700+ADC), display OLED, WiFi, MQTT TLS, main loop

**Topics:** `KPPL0001/SENSORS`, `KPPL0001/STATUS`, `KPPL0001/cmd` (cmd pendiente)

**Pendiente:** config.h con datos reales, comandos /cmd, deep sleep, calibración suelo con persistencia

---

## 4. Bridge (Raspberry Pi)

| IP | `192.168.100.119` | SSH user | `kittypau` |
|---|---|---|---|
| Ruta RPi | `/home/kittypau/kplant-bridge` | Servicio | `kplant-bridge.service` (activo) |
| Bridge ID | `KPBR0002` | | |

**Activo:** suscribe +/SENSORS y +/STATUS, inserta sensor_readings, sincroniza → readings (UUID), heartbeat 60s

**Pendiente:** credenciales MQTT por dispositivo, validar con hardware KPPL0001 real

---

## 5. Aplicación Web

**Stack:** Next.js 15 + Supabase SSR + Tailwind CSS v4 + Chart.js + Lucide

### Funcionalidades implementadas
| Módulo | Estado |
|---|---|
| Auth (registro, login, confirmación email, reset password) | ✅ |
| Middleware de protección de rutas | ✅ |
| Today: listado plantas + realtime + alerta agua < 30% | ✅ |
| Plant detail: stats actuales + selector rango (1h/6h/24h/7d) + gráficos | ✅ |
| Gráficos: valor actual visible + eje X tiempo + tooltips + spanGaps | ✅ |
| Plant actions: editar nombre/especie/ubicación + eliminar | ✅ |
| Device detail: estado + hardware + batería + planta vinculada | ✅ |
| Device actions: desvincular de planta | ✅ |
| Registro wizard: nueva planta + vincular dispositivo | ✅ |
| Settings: editar perfil + cambiar contraseña + cerrar sesión | ✅ |
| PWA: manifest.json + meta tags + theme-color | ✅ |
| Estabilidad: error.tsx + not-found.tsx + loading.tsx | ✅ |
| Paleta verde hoja vivo (lima → verde oscuro) | ✅ |

### Pendiente app
- Validar Realtime con hardware transmitiendo
- Validar estado online/offline con lastSeen real
- Prueba E2E completa

---

## 6. TRL Actual

| Componente | TRL Actual | Meta Dic 2025 | Meta 2026 |
|---|---|---|---|
| Firmware ESP32-C3 | 5–6 | 7 | 8 |
| Conectividad MQTT + Bridge | 6 | 7 | 8 |
| App Web | 7 | 8 | 9 |
| Sistema E2E integrado | 5–6 | 7 | 8–9 |
| Modelo IA predictivo | 1–2 | 3 | 5 |

---

## 7. Alineación PMI

| Documento | Relevancia |
|---|---|
| `PMI/01_ACTA_CONSTITUCION.md` | Objetivos SMART y alcance del proyecto de fondos |
| `PMI/04_CRONOGRAMA_HITOS.md` | Hito crítico: constituir empresa (Abr 2025) |
| `PMI/06_REGISTRO_RIESGOS.md` | R01 y R02 activos (convocatorias y empresa) |
| `PMI/09_CUADRO_MANDO_KPI.md` | TRL 6–7 línea base; 0 postulaciones enviadas |
| `PMI/10_FONDOS_CATALOGO.md` | BUILD + ANID Startup Ciencia = prioridad inmediata |
| `PMI/11_PLAN_NEGOCIO.md` | Plan de negocio en elaboración |

---

## 8. Referencias

| Archivo | Descripción |
|---|---|
| `kplant/PENDING_TASKS.md` | Tareas priorizadas alineadas con PMI WBS |
| `kplant/Docs/CONNECTIVITY_SETUP_CHECKLIST.md` | Checklist conectividad e infraestructura |
| `kplant/bridge/DEPLOY_RPI.md` | Deploy bridge en Raspberry Pi |
| `kplant/supabase/migrations/` | SQL de migraciones aplicadas |
| `kplant/PMI/` | Documentación PMI completa |
