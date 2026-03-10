# PLAN DE GESTIÓN DE LAS COMUNICACIONES
**PMBOK 6ª Ed. — Gestión de las Comunicaciones | Procesos 10.1 Planificar, 10.2 Gestionar, 10.3 Monitorear**
**PMBOK 7ª Ed. — Dominio de Desempeño: Interesados**

---

## 1. Principios de Comunicación del Proyecto

- **Transparencia interna:** el equipo fundador conoce el estado de todas las postulaciones en tiempo real
- **Proactividad externa:** se contacta a los organismos financiadores antes del cierre de convocatoria, no después
- **Trazabilidad:** cada comunicación relevante queda registrada en el Log de Comunicaciones
- **Adaptación del mensaje:** el pitch del producto se adapta al foco de cada financiador (tech, agro, científico)

---

## 2. Matriz de Comunicaciones

| Comunicación | Destinatario | Propósito | Frecuencia | Canal | Formato | Responsable |
|---|---|---|---|---|---|---|
| Informe de estado de postulaciones | Equipo fundador | Mantener al equipo actualizado sobre avances, plazos y resultados | Semanal | Reunión + Notion/Sheets | Tabla de seguimiento | Director de Proyecto |
| Alerta de apertura de convocatoria | Equipo fundador | Activar preparación inmediata al detectar convocatoria compatible | Inmediata | WhatsApp / Email | Notificación con link y deadline | Director de Proyecto |
| Reunión de kick-off de postulación | Equipo fundador | Asignar responsabilidades y plazos para cada postulación | Por postulación | Reunión presencial/Teams | Acta de reunión | Director de Proyecto |
| Consulta previa a organismo financiador | CORFO / ANID / FIA | Resolver dudas antes de postular; construir relación con ejecutivo | Por postulación | Email + teléfono | Email formal | CEO |
| Envío de postulación | CORFO / ANID / FIA / GORE | Presentar candidatura formal al fondo | Por convocatoria | Plataforma digital del fondo | Formulario oficial + anexos | Director de Proyecto |
| Seguimiento post-postulación | CORFO / ANID / FIA | Confirmar recepción y consultar estado de evaluación | Mensual (hasta resolución) | Email | Email breve y directo | CEO |
| Presentación/entrevista de evaluación | Evaluadores del fondo | Defender la propuesta ante el panel evaluador | Si aplica (por fondo) | Video-llamada o presencial | Pitch deck + demo producto | CEO + CTO |
| Comunicación con universidad socia | Investigador principal | Coordinar el desarrollo del plan de I+D conjunto | Semanal (durante preparación) | Email + reunión | Acta + Google Docs compartido | CEO + CTO |
| Informe de avance al fondo | CORFO / ANID / FIA | Rendir cuentas del uso de los fondos aprobados | Según exige el fondo | Plataforma del fondo | Informe formal con evidencias | Director de Proyecto |
| Newsletter interna de fondos | Equipo fundador | Compartir aprendizajes, nuevas oportunidades, best practices de postulación | Mensual | Email interno | Texto + links | Director de Proyecto |
| Pitch internacional | IDB Lab / EIC | Presentar Kplant en inglés a inversores/fondos internacionales | Por convocatoria | Plataforma / evento | Pitch deck EN + demo | CEO |

---

## 3. Plantillas de Comunicación

### 3.1 Email de Consulta Previa a CORFO/ANID

```
Asunto: Consulta sobre elegibilidad — [Nombre del Programa] — Proyecto Kplant

Estimado/a [Nombre del Ejecutivo],

Me dirijo a usted en representación de Kplant, una startup chilena de tecnología AIoT
(Inteligencia Artificial de las Cosas) dedicada al monitoreo inteligente de plantas mediante
sensores IoT y aplicaciones web en tiempo real.

Estamos interesados en postular al programa [Nombre del Programa] y quisiéramos consultar
antes del envío formal si nuestro perfil cumple con los criterios de elegibilidad:

- Empresa: [nombre, RUT, fecha de constitución]
- Estado del producto: prototipo funcional (TRL 5–6), sin ventas formales aún
- Equipo: [N° personas] con dedicación [%] al proyecto
- Principal ask: financiamiento para [objetivo específico]

¿Sería posible agendar una breve llamada de 15 minutos para confirmar elegibilidad y resolver
dudas sobre el proceso de postulación?

Quedamos atentos a su respuesta.

Saludos cordiales,
[Nombre]
CEO, Kplant
[Email] | [Teléfono]
```

### 3.2 Estructura del One-Pager para postulaciones

```
KPLANT — MONITOREO INTELIGENTE DE PLANTAS (AIoT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEMA
El 70% de las personas riega sus plantas en el momento equivocado. La falta de información
objetiva sobre el estado del sustrato genera pérdidas de plantas y desperdicio de agua.

SOLUCIÓN
Kplant es un sensor IoT de bajo costo (ESP32-C3) que monitorea en tiempo real la humedad
del suelo, temperatura, humedad ambiental e iluminación. Los datos se visualizan en una
aplicación web con alertas automáticas y (en desarrollo) recomendaciones de IA predictiva.

TECNOLOGÍA
- Hardware: ESP32-C3 SuperMini + sensores AHT10 + VEML7700 + capacitivo
- Conectividad: MQTT sobre HiveMQ Cloud
- Backend: Supabase (PostgreSQL + Realtime)
- App web: Next.js 15 (Vercel) — PWA instalable
- TRL actual: 5–6

MERCADO
- TAM: Mercado global de smart home & urban farming (USD 12B, 2024)
- SAM: Chile + LATAM, segmentos hogares urbanos y pequeños productores
- SOM: Primeros 1.000 clientes chilenos en 18 meses

EQUIPO
[Nombre CEO] — [Background]
[Nombre CTO] — Ingeniero, firmware + full-stack

ASK
[Nombre del fondo]: CLP $XX.XXX.XXX para [objetivo específico: desarrollo de IA /
validación comercial / producción de serie piloto]
```

---

## 4. Log de Comunicaciones

| Fecha | Destinatario | Tipo | Canal | Resumen | Próxima Acción | Responsable |
|---|---|---|---|---|---|---|
| — | — | — | — | *(registrar aquí cada comunicación relevante)* | — | — |

---

## 5. Gestión de la Información del Proyecto

| Tipo de Información | Dónde se almacena | Acceso | Responsable |
|---|---|---|---|
| Documentos de postulaciones | Carpeta compartida (Drive/OneDrive) | Equipo fundador | Director de Proyecto |
| Formularios enviados (PDF) | Carpeta por fondo + fecha | Equipo fundador | Director de Proyecto |
| Resoluciones y notificaciones | Carpeta compartida + email archivado | Equipo fundador | CEO |
| Contactos de ejecutivos de fondos | Notion / CRM simple | Equipo fundador | CEO |
| Facturas y gastos del proyecto | Contabilidad + carpeta Drive | CEO + Contador | CEO |
| Versiones del dossier técnico | Drive con control de versiones | Equipo fundador | CTO |
