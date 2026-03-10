# PLAN DE NEGOCIO — KPLANT AIoT
**Versión:** 1.0 (Borrador) | **Fecha:** Marzo 2025
**PMBOK 7ª Ed. — Principio: Enfocarse en el Valor**

> Este documento es la base del plan de negocio. Cada sección tiene estructura y datos
> preliminares listos para profundizar. Las secciones marcadas con [COMPLETAR] requieren
> validación con datos reales del equipo fundador.

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [El Problema](#2-el-problema)
3. [La Solución — Kplant](#3-la-solución--kplant)
4. [Tecnología y Producto](#4-tecnología-y-producto)
5. [Mercado Objetivo](#5-mercado-objetivo)
6. [Modelo de Negocio](#6-modelo-de-negocio)
7. [Estrategia Go-to-Market](#7-estrategia-go-to-market)
8. [Análisis Competitivo](#8-análisis-competitivo)
9. [Equipo Fundador](#9-equipo-fundador)
10. [Plan de Operaciones](#10-plan-de-operaciones)
11. [Proyecciones Financieras](#11-proyecciones-financieras)
12. [Hoja de Ruta del Producto](#12-hoja-de-ruta-del-producto)
13. [Estrategia de Financiamiento](#13-estrategia-de-financiamiento)
14. [Riesgos del Negocio](#14-riesgos-del-negocio)
15. [Anexos](#15-anexos)

---

## 1. Resumen Ejecutivo

**Empresa:** Kplant [SpA — por constituir]
**Sector:** AgriTech / Smart Home / AIoT
**Etapa:** Prototipo funcional (TRL 6–7) — Pre-seed
**Ubicación:** Chile (expansión LATAM proyectada)

### El Negocio en 4 Líneas
Kplant es un dispositivo IoT de bajo costo y su plataforma de software que monitorea en
tiempo real la salud de plantas de interior y urbanas: humedad del suelo, temperatura,
luz y humedad ambiental. Los datos se visualizan en una app web con alertas automáticas y,
en desarrollo, recomendaciones de inteligencia artificial predictiva para el cuidado óptimo.

### Propuesta de Valor
> **"Kplant sabe cuándo tus plantas necesitan agua antes de que tú lo notes."**

### Métricas Clave (Estado Actual)
| Métrica | Valor |
|---|---|
| TRL del sistema | 6–7 |
| MVP desplegado en producción | Sí — kplantapp.vercel.app |
| Hardware prototipado | Sí — ESP32-C3 SuperMini |
| Ventas acumuladas | $0 (pre-comercial) |
| Usuarios en app | [COMPLETAR] |
| Financiamiento obtenido | $0 (pre-seed, capital propio) |
| **Ask actual** | **CLP $15M–$145M** (Startup Chile BUILD + ANID Startup Ciencia) |

---

## 2. El Problema

### 2.1 Problema Central
El **70% de las plantas de interior muere por riego incorrecto** — ya sea por exceso o por
defecto. Las personas no tienen información objetiva sobre cuándo y cuánto regar, y dependen
de reglas generales imprecisas ("regar 2 veces por semana") que no consideran las condiciones
reales de cada planta, especie, sustrato, temperatura o estación del año.

### 2.2 Dimensión del Problema

| Segmento | Problema específico |
|---|---|
| Hogares urbanos | No saben si la planta necesita agua; olvidan regar; riegan en exceso |
| Pequeños productores | Desperdicio de agua; pérdida de cultivos por riego mal gestionado |
| Empresas / Oficinas | Plantas ornamentales mueren sin cuidado profesional constante |
| Viveros y plant shops | Sin monitoreo remoto de stock vivo en transporte y almacenamiento |

### 2.3 Consecuencias del Problema
- Pérdida económica por plantas muertas (gasto promedio CLP $5.000–$80.000/planta)
- Desperdicio de agua (riego en exceso = hasta 3x el agua necesaria)
- Frustración del usuario → abandono del cultivo en interior
- En agricultura de pequeña escala: pérdidas de producción por estrés hídrico

### 2.4 Soluciones Actuales y sus Limitaciones

| Solución Actual | Limitación |
|---|---|
| Aplicaciones de recordatorio de riego (Planta, Greg) | Solo software — sin datos reales del suelo |
| Sensores de suelo simples (varillas LED) | Sin conectividad, sin historia, sin app |
| Sistemas de riego automático (Gardena, Xiaomi) | Caro (USD $50–$200+), complejidad de instalación |
| Contratación de jardinero | Costo alto, no escalable para plantas de interior |
| "Meter el dedo en la tierra" | Manual, impreciso, no funciona para múltiples plantas |

---

## 3. La Solución — Kplant

### 3.1 Qué es Kplant
Kplant es un ecosistema AIoT de monitoreo de plantas compuesto por:

1. **Dispositivo Kplant** (hardware) — sensor IoT basado en ESP32-C3 que mide:
   - Humedad capacitiva del suelo (0–100%)
   - Temperatura ambiental (AHT10)
   - Humedad relativa del aire (AHT10)
   - Iluminación en lux (VEML7700)
   - Nivel y voltaje de batería
   - Conectividad WiFi + MQTT TLS

2. **Kplant App** (software) — PWA web (instalable como app nativa):
   - Dashboard en tiempo real por planta
   - Historial de lecturas con gráficos (1h / 6h / 24h / 7d)
   - Alertas automáticas (suelo seco < 30%)
   - Gestión de múltiples plantas y dispositivos
   - Acceso desde cualquier dispositivo (smartphone, tablet, PC)

3. **Kplant AI** (en desarrollo) — modelo predictivo de IA:
   - Predicción de cuándo la planta necesitará agua
   - Alertas tempranas de estrés hídrico
   - Recomendaciones personalizadas por especie

### 3.2 Propuesta de Valor por Segmento

| Segmento | Propuesta de Valor |
|---|---|
| Hogar urbano | "Nunca más pierdas una planta por riego incorrecto" |
| Pequeño productor | "Optimiza el agua y maximiza la producción de tu huerta" |
| Empresa / Oficina | "Monitoreo remoto de tus plantas sin necesitar jardinero" |
| Vivero | "Controla la salud de tu stock vivo en tiempo real" |

### 3.3 Ventajas Competitivas

| Ventaja | Descripción |
|---|---|
| **Precio accesible** | Hardware de bajo costo (ESP32-C3 < USD $5 en componentes) vs. competencia USD $50+ |
| **Software propio** | App web PWA gratuita + suscripción premium; no depende de ecosistemas cerrados |
| **Datos en tiempo real** | MQTT con latencia < 1 seg; competencia actualiza cada 30–60 min |
| **Escalabilidad** | Arquitectura cloud (Supabase + Vercel) escala sin fricción |
| **IA predictiva** | Diferenciador futuro: ningún competidor tiene predicción de riego por ML |
| **Open por diseño** | MQTT estándar; posibilidad de integración con Home Assistant, etc. |

---

## 4. Tecnología y Producto

### 4.1 Arquitectura del Sistema
```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE HARDWARE                          │
│  ESP32-C3 SuperMini                                          │
│  ├── Sensor suelo (capacitivo ADC)                           │
│  ├── AHT10 (temperatura + humedad)                           │
│  ├── VEML7700 (lux)                                          │
│  ├── Batería LiPo + divisor de voltaje                       │
│  └── OLED SSD1306 (display local)                            │
└────────────────────┬────────────────────────────────────────┘
                     │ MQTT TLS 8883
┌────────────────────▼────────────────────────────────────────┐
│               BROKER MQTT (HiveMQ Cloud)                     │
│  Topics: {device_id}/SENSORS | {device_id}/STATUS            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              BRIDGE Node.js (Raspberry Pi / VPS)             │
│  ├── Parsea payload MQTT                                     │
│  ├── Inserta en Supabase (sensor_readings + readings)        │
│  └── Heartbeat de estado cada 60s                            │
└────────────────────┬────────────────────────────────────────┘
                     │ Supabase Client (service role)
┌────────────────────▼────────────────────────────────────────┐
│                  SUPABASE (Backend-as-a-Service)             │
│  ├── PostgreSQL (plants, devices, sensor_readings, readings) │
│  ├── Realtime (WebSocket subscriptions)                      │
│  ├── Auth (email/password + JWT)                             │
│  └── Row Level Security (RLS) por usuario                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              KPLANT APP (Next.js 15 + Vercel)                │
│  ├── Server Components (SSR seguro + auth)                   │
│  ├── Client Components (realtime + interactividad)           │
│  ├── PWA (instalable en smartphone)                          │
│  └── Chart.js (gráficos históricos)                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 TRL Actual y Roadmap Tecnológico

| Fase | Período | Objetivos TRL |
|---|---|---|
| **Fase 1 — Validación** (actual) | 2025 Q1–Q2 | TRL 7: hardware validado en entorno real + E2E funcional |
| **Fase 2 — Producción Piloto** | 2025 Q3–Q4 | TRL 8: 50 unidades piloto con usuarios reales |
| **Fase 3 — IA Predictiva** | 2026 | TRL 5–6 IA: modelos entrenados con datos reales |
| **Fase 4 — Escala** | 2027 | TRL 9: producto en mercado + manufactura serie |

### 4.3 Propiedad Intelectual
- **Estado actual:** Invención sin protección formal
- **Plan:** Solicitud de patente de utilidad INAPI (Dic 2025) — proteger la combinación hardware + algoritmo de predicción
- **Secreto industrial:** código del firmware y modelos de IA como trade secret hasta solicitud de patente

---

## 5. Mercado Objetivo

### 5.1 TAM / SAM / SOM

| Nivel | Descripción | Valor Estimado |
|---|---|---|
| **TAM** (Mercado Total Disponible) | Mercado global Smart Home + AgriTech IoT para plantas | USD ~$18.000M (2024) |
| **SAM** (Mercado Disponible Servible) | Chile + LATAM — hogares urbanos con plantas + pequeños productores agro | USD ~$320M |
| **SOM** (Mercado Objetivo 3 años) | Chile: 1.000–5.000 unidades + suscripciones Premium | USD ~$2,5M–$5M |

### 5.2 Segmentos Primarios

| Segmento | Tamaño Chile | Dolor | Disposición a Pagar |
|---|---|---|---|
| **Hogar urbano con plantas** | ~800.000 hogares | Media-Alta | CLP $15.000–$45.000/unidad hardware |
| **Pequeño productor / huerta urbana** | ~150.000 productores | Alta | CLP $25.000–$60.000/unidad |
| **Empresas / oficinas (B2B)** | ~50.000 empresas con plantas | Media | CLP $150.000–$500.000/paquete |
| **Viveros y plant shops** | ~2.000 establecimientos | Alta | CLP $80.000–$200.000/paquete |

### 5.3 Segmento de Entrada (Beachhead)
**Hogares urbanos con plantas ornamentales de interior en Santiago y ciudades principales.**
- Perfil: 25–45 años, NSE C1-C2-C3, con 2–8 plantas en casa, smartphone activo
- Pain point principal: plantas que mueren sin razón aparente
- Canal de entrada: e-commerce propio + redes sociales (Instagram, TikTok)
- Precio tolerado: CLP $15.000–$35.000 por dispositivo

---

## 6. Modelo de Negocio

### 6.1 Fuentes de Ingresos

| Stream | Descripción | Precio | Margen Estimado |
|---|---|---|---|
| **Hardware — Dispositivo Kplant** | Venta unitaria del sensor IoT | CLP $19.990–$29.990 (~USD 22–32) | 50–65% |
| **Suscripción Kplant Premium** | Acceso a historial extendido, IA predictiva, alertas avanzadas | CLP $2.990/mes (~USD 3,2) | 85–90% |
| **Pack Multi-planta** | Hardware ×3 + 1 año Premium | CLP $54.990 (~USD 59) | 55–60% |
| **Kplant Business (B2B)** | Paquete empresarial con hardware + dashboard admin + soporte | CLP $150.000–$500.000/empresa | 60–70% |
| **Kplant API (futuro)** | API de datos IoT para viveros, investigación, plataformas terceros | CLP $50.000–$200.000/mes | 80–90% |
| **Licenciamiento de datos agregados (futuro)** | Datos anonimizados de condiciones de plantas por zona geográfica | A definir | Alto |

### 6.2 Estructura de Costos

| Categoría | Descripción | Costo Unitario Est. |
|---|---|---|
| **COGS Hardware** | Componentes ESP32-C3 + sensores + PCB + carcasa | CLP $5.000–$8.000/unit |
| **Manufactura y ensamble** | Pequeña escala inicial (<500 unidades) | CLP $2.000–$4.000/unit |
| **Infraestructura cloud** | Supabase + Vercel + HiveMQ (escala con usuarios) | USD $50–$500/mes |
| **I+D continuo** | Desarrollo firmware, app, modelos IA | [según equipo] |
| **Marketing y adquisición** | Redes sociales + contenido + influencers plantas | 20–30% del ingreso |
| **Logística y distribución** | Envío, empaque, fulfillment | CLP $2.000–$4.000/envío |

### 6.3 Business Model Canvas

| Bloque | Contenido |
|---|---|
| **Propuesta de Valor** | Monitoreo inteligente y en tiempo real de la salud de plantas |
| **Segmentos** | Hogar urbano / Pequeño productor / Empresas / Viveros |
| **Canales** | E-commerce propio, Instagram/TikTok, viveros (distribución física), B2B directo |
| **Relación con Cliente** | App self-service + comunidad online + soporte por email |
| **Actividades Clave** | Desarrollo firmware + app, manufactura hardware, marketing digital, I+D IA |
| **Recursos Clave** | Hardware IoT, plataforma cloud, algoritmos IA, equipo técnico |
| **Socios Clave** | Proveedor componentes, plataforma de manufactura, viveros, universidad I+D |
| **Fuente de Ingresos** | Hardware + Suscripción SaaS + B2B |
| **Estructura de Costos** | COGS hardware + infraestructura + I+D + marketing |

---

## 7. Estrategia Go-to-Market

### 7.1 Fases de Lanzamiento

**Fase 1 — Early Adopters (Q3–Q4 2025)**
- 50–100 unidades piloto gratuitas/costo para usuarios entusiastas de plantas
- Objetivo: validar product-market fit, recopilar datos para IA, obtener testimonios
- Canal: Instagram + grupos de Facebook de plantas + contactos directos
- KPI: NPS > 50, retención > 60%, feedback cualitativo documentado

**Fase 2 — Lanzamiento Comercial Chile (2026 Q1–Q2)**
- E-commerce propio (Mercado Libre + tienda web Kplant)
- Meta: 500 unidades vendidas en 6 meses
- Precio: CLP $24.990 hardware + CLP $2.990/mes Premium
- Canal: Redes sociales orgánico + micropagos en influencers de plantas

**Fase 3 — Expansión B2B y Distribución (2026 Q3–Q4)**
- Alianzas con viveros y tiendas de plantas (distribución física)
- Paquetes empresariales para oficinas y empresas
- Meta: 5 distribuidores activos, CLP $50M en ventas acumuladas

**Fase 4 — Expansión LATAM (2027)**
- Colombia, México, Argentina como mercados prioritarios
- Adaptar app y comunicación a cada mercado
- Evaluar manufactura local o distribuidores exclusivos

### 7.2 Estrategia de Marketing Digital

| Canal | Estrategia | Inversión Estimada | KPI |
|---|---|---|---|
| Instagram / TikTok | Contenido orgánico + UGC (plantas en acción) | $0 (orgánico) / CLP $200K-500K (ads) | Seguidores, alcance, conversión |
| YouTube | Video demostración producto + tutoriales | Producción CLP $100K-300K | Views, suscriptores |
| Influencers plantas | Nano/micro influencers (5K-50K seguidores) | CLP $50K-150K/colaboración | Ventas trackadas con código |
| SEO | Blog sobre cuidado de plantas + keywords long-tail | Tiempo del equipo | Tráfico orgánico |
| Email Marketing | Newsletter semanal con consejos de cuidado | Plataforma: $0-50K/mes | Open rate, conversión |
| Comunidades | Facebook groups, Reddit r/houseplants, Discord | $0 | Engagement, reviews |

### 7.3 Precio de Lanzamiento

| Producto | Precio Early Adopter | Precio Regular | Precio B2B |
|---|---|---|---|
| Dispositivo Kplant x1 | CLP $18.990 | CLP $24.990 | Según volumen |
| Pack x3 + 1 año Premium | CLP $49.990 | CLP $64.990 | Descuento >10 unid. |
| Kplant Premium (mes) | CLP $1.990 | CLP $2.990 | Incluido en B2B |
| Kplant Premium (año) | CLP $19.990 | CLP $27.990 | Incluido en B2B |

---

## 8. Análisis Competitivo

### 8.1 Matriz Competidora

| Competidor | Precio Hardware | App | Realtime | IA | Escala |
|---|---|---|---|---|---|
| **Kplant** | CLP $25K (~USD 27) | PWA propia, gratuita | Sí (<1s) | En desarrollo | LATAM |
| **Xiaomi Mi Flora** | USD $15–20 | App Xiaomi/Flora | No (manual sync) | No | Global |
| **Planta (app solamente)** | $0 (sin hardware) | iOS/Android | No (sin sensores) | Básico | Global |
| **Gardena Smart Sensor** | USD $80–120 | App Gardena | No (30 min) | No | Europa |
| **Parrot Flower Power** | USD $50–70 | App Parrot | No (sync) | No | Global/Discontinuado |
| **Botanist (Netatmo)** | USD $100+ | App Netatmo | No | No | Europa |
| **Arduino DIY** | USD $10–30 (componentes) | Sin app / custom | Variable | No | Makers |

### 8.2 Ventaja Diferencial de Kplant

```
        ALTO PRECIO
             │
  Gardena    │  Botanist
  Smart      │  Netatmo
             │
─────────────┼─────────────
  Sin IA     │              Con IA
             │
  Mi Flora   │   KPLANT ★
  Parrot     │   (objetivo)
             │
        BAJO PRECIO
```

**Kplant ocupa el cuadrante único: precio accesible + IA predictiva (en desarrollo)**

### 8.3 Barreras de Entrada que Construye Kplant

1. **Base de datos propietaria de comportamiento de plantas** — datos reales de cientos de especies en condiciones reales de Chile/LATAM: inimitable a corto plazo
2. **Red de usuarios y comunidad** — efecto de red en plataforma
3. **Algoritmos de IA entrenados con datos locales** — superior a modelos genéricos globales
4. **Marca en español para LATAM** — comunicación nativa vs. productos europeos/asiáticos

---

## 9. Equipo Fundador

> [COMPLETAR con información real del equipo]

| Rol | Nombre | Background | Dedicación |
|---|---|---|---|
| CEO / Fundador | [COMPLETAR] | [background en negocio/diseño/agronomía] | [%] |
| CTO / Co-Fundador | [COMPLETAR] | [Ingeniería, firmware, full-stack] | [%] |
| Advisor técnico | Por identificar | IoT / Embedded Systems | Part-time |
| Advisor negocio | Por identificar | Startup / CORFO ecosystem | Part-time |

### Necesidades de equipo (próximos 12 meses)
- [ ] Especialista en manufactura y hardware (escala producción)
- [ ] Growth hacker / Community Manager (plantas en redes sociales)
- [ ] Científico de datos (para modelos de IA predictiva — puede ser vía universidad socia)

---

## 10. Plan de Operaciones

### 10.1 Manufactura (fase actual y escala)

| Fase | Volumen | Estrategia | Costo/Unit. Estimado |
|---|---|---|---|
| **Piloto (2025)** | 50–100 unidades | Ensamble manual propio + componentes AliExpress/LCSC | CLP $7.000–$12.000 |
| **Serie 1 (2026)** | 500–1.000 unidades | PCB fabricada en JLCPCB + ensamble local (Santiago) | CLP $5.000–$8.000 |
| **Escala (2027+)** | >5.000 unidades | Manufactura con proveedor local o EMS | CLP $3.500–$5.500 |

### 10.2 Logística

- **Canal online:** despacho desde bodega propia (Santiago) vía Chilexpress/Starken
- **Canal B2B:** entrega directa o acuerdo con distribuidor
- **LATAM:** exportación indirecta vía socio local o tiendas físicas especializadas

### 10.3 Soporte y Post-Venta
- FAQ + documentación online (primera línea)
- Email de soporte (< 24h respuesta)
- Comunidad de usuarios (Discord/Telegram)
- Garantía mínima: 6 meses hardware, reemplazo por defecto de fabricación

---

## 11. Proyecciones Financieras

### 11.1 Supuestos Base

| Supuesto | Valor |
|---|---|
| Precio promedio hardware | CLP $24.990 |
| Precio suscripción mensual | CLP $2.990 |
| Tasa de conversión a Premium | 30% de usuarios activos |
| Retención mensual Premium | 75% |
| Costo hardware (COGS) | CLP $8.000/unit |
| Crecimiento mensual de ventas | 15–25% (fase de lanzamiento) |

### 11.2 Proyección de Ingresos

| Período | Unidades Vendidas | Ingresos Hardware | Ingresos SaaS | Ingreso Total |
|---|---|---|---|---|
| **2025 Q3-Q4** (piloto) | 100 | CLP $2.499.000 | CLP $0 (free) | **CLP $2.499.000** |
| **2026** | 800 | CLP $19.992.000 | CLP $8.964.000 | **CLP $28.956.000** |
| **2027** | 3.500 | CLP $87.465.000 | CLP $63.000.000 | **CLP $150.465.000** |
| **2028** | 10.000 | CLP $249.900.000 | CLP $250.000.000 | **CLP ~$500.000.000** |

> Equivalencias aprox.: CLP $1.000 = USD $1,07 (tipo de cambio referencial 2025)

### 11.3 Punto de Equilibrio Estimado

Con estructura de costos básica (2 personas + cloud + marketing):
- Costo fijo mensual estimado: CLP $3.500.000–$6.000.000/mes
- Margen de contribución por unidad: ~CLP $17.000
- **Punto de equilibrio:** ~250–350 unidades/mes (aprox. 2026 Q3)

### 11.4 Uso de los Fondos (BUILD + ANID Startup Ciencia)

| Destino | % | Monto (CLP) | Descripción |
|---|---|---|---|
| I+D Hardware (v2) | 25% | $40.000.000 | PCB diseñada, carcasa moldeada, eficiencia energética |
| I+D Software (IA predictiva) | 30% | $48.000.000 | Modelos ML, API de predicción, pipeline de datos |
| Producción piloto (100 units) | 20% | $32.000.000 | Primera serie de unidades para usuarios beta |
| Marketing y adquisición | 15% | $24.000.000 | Lanzamiento digital, influencers, eventos |
| Operaciones y legal | 10% | $16.000.000 | Constitución empresa, patente, contabilidad |
| **Total** | **100%** | **$160.000.000** | (~USD 172K — escenario BUILD + ANID Startup Ciencia) |

---

## 12. Hoja de Ruta del Producto

```
2025 Q1-Q2 — VALIDACIÓN
├── Hardware v1: ESP32-C3 calibrado y funcionando con sensores reales
├── App: E2E validado (sensor → app en tiempo real)
├── 50 usuarios piloto con datos reales
└── Primeras ventas simbólicas (10–20 units)

2025 Q3-Q4 — HARDWARE v2 + LANZAMIENTO
├── PCB diseñada a medida (reemplaza breadboard/módulos)
├── Carcasa: diseño industrial para interiores (ABS/PLA injection o impresión 3D mejorada)
├── Deep sleep implementado (> 30 días de batería)
├── App: notificaciones push (PWA), mejoras UX, onboarding
├── Lanzamiento público: e-commerce + RRSS
└── 100 unidades vendidas

2026 — IA + ESCALA
├── Kplant AI: modelo de predicción de riego (Random Forest o LSTM por especie)
├── API para terceros (viveros, plataformas de smart home)
├── App v2: recomendaciones proactivas, identificación de enfermedades (foto)
├── Manufactura serie 1: 500–1.000 unidades
└── Expansión B2B: 5+ empresas clientes

2027 — LATAM + PLATAFORMA
├── Lanzamiento Colombia y México
├── Kplant Platform: dashboard multi-ubicación para empresas
├── Integración Home Assistant, Google Home, Alexa
├── Manufactura escalada: >5.000 units/año
└── Series A o EIC Accelerator
```

---

## 13. Estrategia de Financiamiento

*(Detalle completo en `PMI/10_FONDOS_CATALOGO.md`)*

| Fase | Fondo | Monto Objetivo | Plazo |
|---|---|---|---|
| **Pre-seed 1** | Startup Chile BUILD | USD $16K | 2025 |
| **Pre-seed 2** | ANID Startup Ciencia | USD $145K | 2025 |
| **Seed** | ANID IDeA I+D + FIA | USD $300K+ | 2026 |
| **Series A / Internacional** | IDB Lab + EIC Accelerator | USD $2M+ | 2027 |

**Política de financiamiento:**
- Priorizar fondos no dilutivos (subsidios, grants) mientras sea posible
- Considerar capital de riesgo solo a partir de Series A (2027+), cuando la tracción justifique la dilución
- No levantar deuda bancaria en etapas pre-comerciales

---

## 14. Riesgos del Negocio

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Componentes electrónicos con lead time largo | Alta | Stock de seguridad + proveedor alternativo |
| Copia del producto por competidor asiático | Media | Velocidad de ejecución + datos propietarios + marca |
| Churn alto en suscripción Premium | Media | Fortalecer propuesta de valor IA; precio accesible |
| Dependencia de Supabase/Vercel (single vendor) | Media | Documentar para migración; uso de estándares abiertos |
| Mercado chileno insuficiente para escala | Media | Expansión LATAM desde año 2 |
| Dificultad para fabricar hardware a escala | Alta | Alianza con proveedor de manufactura local |
| Regulaciones de exportación para electrónica | Baja | Consultoría legal previa a expansión |

---

## 15. Anexos

### A. Especificaciones Técnicas del Dispositivo Kplant v1

| Parámetro | Valor |
|---|---|
| MCU | ESP32-C3 SuperMini (RISC-V 160MHz, WiFi 802.11 b/g/n) |
| Sensor suelo | Capacitivo resistivo (ADC 12-bit, GPIO2) |
| Sensor temp/hum | AHT10 (I2C 0x38) — ±0,3°C, ±2% HR |
| Sensor luz | VEML7700 (I2C 0x10) — 0.0036 a 120.000 lux |
| Display | SSD1306 OLED 128×32 (I2C 0x3C) |
| Conectividad | WiFi 2.4GHz + MQTT TLS 1.2 |
| Batería | LiPo 3.7V (capacidad a definir en v2) |
| Alimentación | USB-C o batería |
| Dimensiones v1 | Por definir (prototyping board) |
| Dimensiones v2 | Objetivo: < 40×40×25mm |
| Protocolo datos | MQTT JSON sobre TLS |
| Intervalo SENSORS | Configurable (default: 60s) |
| Intervalo STATUS | Configurable (default: 30s) |

### B. Glosario

| Término | Definición |
|---|---|
| AIoT | Artificial Intelligence of Things — integración de IA con dispositivos IoT |
| TRL | Technology Readiness Level — escala de madurez tecnológica (1–9) |
| MQTT | Message Queuing Telemetry Transport — protocolo de mensajería IoT |
| PWA | Progressive Web App — app web instalable como app nativa |
| COGS | Cost of Goods Sold — costo directo de manufactura del producto |
| SaaS | Software as a Service — modelo de suscripción de software en la nube |
| NPS | Net Promoter Score — indicador de satisfacción y lealtad del cliente |
| MVP | Minimum Viable Product — versión mínima funcional del producto |

### C. Secciones a Completar [PENDIENTE]

- [ ] CVs completos del equipo fundador
- [ ] Validación del TAM/SAM con fuentes secundarias (SUBTEL, INE, ODEPA)
- [ ] Cartas de intención de usuarios piloto (viveros, pequeños productores)
- [ ] Cotizaciones de manufactura (PCB + carcasa)
- [ ] Análisis de patentabilidad formal (INAPI o agente de patentes)
- [ ] Estados financieros proyectados en Excel/Sheets (P&G, flujo de caja, balance)
- [ ] Encuesta de validación de mercado (mínimo 50 respuestas)
