# Kplant — Tareas Pendientes
**Alineado con PMI WBS (ver `PMI/03_EDT_WBS.md`)**
Última actualización: Marzo 2025

---

## PRIORIDAD CRÍTICA — PMI Fase Preparatoria (WBS 1.1)
> Desbloquean acceso a todos los fondos concursables

- [ ] **Constituir empresa SPA/SpA** — notaría + CBR + SII (prerequisito para BUILD, ANID, FIA)
- [ ] **Registrar en fondos.gob.cl** y plataforma ANID como empresa postulante
- [ ] **Finalizar dossier técnico base** — ficha TRL, canvas, roadmap 12 meses
- [ ] **Grabar video pitch** (2 min, producto funcionando, español + inglés)
- [ ] **Evaluar patentabilidad** — consulta con abogado PI o INAPI directamente
- [ ] **Contactar CORFO** — confirmar fecha próxima convocatoria Startup Chile BUILD 2025
- [ ] **Contactar ANID** — confirmar apertura Startup Ciencia 2025
- [ ] **Identificar universidad socia** (contactar ≥ 3 depts. ingeniería/agronomía para IDeA I+D)

---

## PRIORIDAD ALTA — Técnico (WBS 1.1 + habilitadores TRL)

### Firmware ESP32-C3
- [ ] Configurar `config.h` con WiFi real + MQTT broker + `DEVICE_ID` (KPPL0001)
- [ ] Validar publicación `SENSORS` y `STATUS` desde hardware físico
- [ ] Validar TLS MQTT (certificado CA en firmware)
- [ ] Implementar comandos MQTT en `/cmd` (`REBOOT`, `SET_INTERVALS`, `WIFI_UPDATE`)
- [ ] Implementar modo bajo consumo / deep sleep orientado a batería
- [ ] Implementar calibración guiada de sensor de suelo por serial + persistencia `SOIL_ADC_DRY/WET`

### Bridge (Raspberry Pi)
- [ ] Migrar credenciales MQTT compartidas → credenciales por dispositivo
- [ ] Validar inserciones reales en `sensor_readings` + `readings` con device `KPPL0001`
- [ ] Validar telemetría completa con hardware físico transmitiendo

### App Web (kplantapp.vercel.app)
- [ ] Cerrar integración Git en Vercel con `Jeivous/kittypau_1a` (bloqueo actual)
- [ ] Ajustar `Root Directory` a `GitHub_KP/kplant/kplant_app`
- [ ] Configurar variables Preview (al cerrar integración Git)
- [ ] Probar deploy automático con push en rama `3.1a`
- [ ] Validar Realtime en `/today` con hardware transmitiendo
- [ ] Validar estado online/offline del dispositivo con dato real

### Infraestructura
- [ ] Activar 2FA en cuenta `kplant.aiot@gmail.com`
- [ ] Definir secret manager (1Password o Bitwarden) para credenciales del proyecto
- [ ] Rotar passwords iniciales (MQTT, Supabase) post-validación
- [ ] Documentar runbook de recovery y operación

---

## PRIORIDAD ALTA — PMI / Negocio (WBS 1.2 — Tier 1 Fondos)

- [ ] **Postular Startup Chile BUILD** (tan pronto como convocatoria esté abierta + empresa constituida)
- [ ] **Postular ANID Startup Ciencia 2025** (identificar Director CT + redactar plan I+D)
- [ ] **Evaluar Semilla Inicia** como opción paralela si empresa < 18 meses sin ventas
- [ ] **Comenzar Plan de Negocio** (ver `PMI/11_PLAN_NEGOCIO.md` — estructura lista)

---

## PRIORIDAD MEDIA — PMI / Negocio (WBS 1.3 — Tier 2 Fondos, 2025-2026)

- [ ] **FIA Proyectos Agro** — identificar socio agrícola / INIA + reformular pitch
- [ ] **ANID IDeA I+D** — articular consorcio empresa-universidad + hipótesis IA predictiva
- [ ] **FIC-R Regional** — identificar GORE afín + universidad ejecutora regional
- [ ] **Solicitar patente de utilidad INAPI** (prerequisito para postulaciones internacionales)

---

## PRIORIDAD BAJA — Largo Plazo (WBS 1.4 — Tier 3 Fondos, 2026+)

- [ ] Startup Chile IGNITE (cuando haya ventas acumuladas)
- [ ] CORFO Semilla Expande (post primeras ventas)
- [ ] IDB Lab STEM (pitch en inglés + tracción demostrada)
- [ ] Evaluar viabilidad filial europea (España/Portugal para EIC Accelerator 2027)

---

## VALIDACIÓN E2E (Prueba de Sistema Completo)

- [ ] Flujo completo validado: `ESP32-C3 → HiveMQ → Bridge RPi → Supabase → Vercel App`
- [ ] Realtime en `/today` validado con lectura de sensor real
- [ ] Estado online/offline validado con lastSeen real
- [ ] Alerta de agua (banner rojo) disparada con suelo < 30% real
- [ ] Gráficos con datos reales (al menos 24h de lecturas)

---

## REFERENCIA RÁPIDA PMI

| Documento | Ruta |
|---|---|
| Índice PMI | `kplant/PMI/00_INDICE.md` |
| Acta de Constitución | `kplant/PMI/01_ACTA_CONSTITUCION.md` |
| Cronograma de Hitos | `kplant/PMI/04_CRONOGRAMA_HITOS.md` |
| Registro de Riesgos | `kplant/PMI/06_REGISTRO_RIESGOS.md` |
| Catálogo de Fondos | `kplant/PMI/10_FONDOS_CATALOGO.md` |
| Plan de Negocio | `kplant/PMI/11_PLAN_NEGOCIO.md` |
