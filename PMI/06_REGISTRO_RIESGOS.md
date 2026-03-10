# REGISTRO DE RIESGOS
**PMBOK 6ª Ed. — Gestión de los Riesgos | Procesos 11.1–11.6**
**PMBOK 7ª Ed. — Dominio de Desempeño: Incertidumbre | Principio: Optimizar los Riesgos**

---

## 1. Escala de Evaluación

| Nivel | Probabilidad | Valor |
|---|---|---|
| Alta | > 60% | 3 |
| Media | 30–60% | 2 |
| Baja | < 30% | 1 |

| Nivel | Impacto en Proyecto | Valor |
|---|---|---|
| Alto | Compromete el acceso al fondo o retrasa > 6 meses | 3 |
| Medio | Retrasa 2–6 meses o requiere replantear estrategia | 2 |
| Bajo | Retraso < 2 meses, subsanable sin impacto mayor | 1 |

**Severidad = Probabilidad × Impacto**
- 7–9: **CRÍTICO** (acción inmediata)
- 4–6: **ALTO** (plan de mitigación activo)
- 2–3: **MEDIO** (monitorear)
- 1: **BAJO** (aceptar)

---

## 2. Registro de Riesgos

| ID | Categoría | Riesgo | Probabilidad | Impacto | Severidad | Tipo | Estrategia | Plan de Respuesta | Propietario |
|---|---|---|---|---|---|---|---|---|---|
| R01 | Planificación | Convocatorias cierran antes de preparar la postulación | Alta (3) | Alto (3) | **9 — CRÍTICO** | Amenaza | **Mitigar** | Monitorear calendarios en fondos.gob.cl + ANID mensualmente; preparar dossier base antes de que abran convocatorias | Director de Proyecto |
| R02 | Legal/Admin | No hay empresa formalmente constituida al momento de postular | Alta (3) | Alto (3) | **9 — CRÍTICO** | Amenaza | **Mitigar** | Constituir SPA/SpA como primera acción del proyecto (mes 1) | CEO |
| R03 | Socios | No se encuentra universidad socia para IDeA I+D / FIC-R | Media (2) | Alto (3) | **6 — ALTO** | Amenaza | **Mitigar** | Contactar ≥ 3 departamentos de ingeniería/agronomía en Q1 2025; ofrecer coautoría de publicaciones | CEO |
| R04 | Financiero | Falta de contraparte económica (cofinanciamiento) para fondos que lo requieren | Media (2) | Alto (3) | **6 — ALTO** | Amenaza | **Mitigar / Evitar** | Postular primero a fondos sin contraparte (BUILD, Semilla Inicia); usar fondo obtenido como contraparte del siguiente | Director de Proyecto |
| R05 | Legal | PI no protegida antes de postulaciones internacionales (EIC, IDB) | Media (2) | Alto (3) | **6 — ALTO** | Amenaza | **Mitigar** | Iniciar proceso INAPI antes de Q4 2025, previo a cualquier postulación internacional | CTO + Abogado PI |
| R06 | Evaluación | Postulación rechazada por evaluadores en primera ronda | Media (2) | Medio (2) | **4 — ALTO** | Amenaza | **Aceptar + Contingencia** | Solicitar feedback obligatoriamente; re-postular con correcciones en siguiente convocatoria; postular en paralelo a ≥ 2 fondos | Director de Proyecto |
| R07 | Regulatorio | Cambios en bases o cierre de programas CORFO/ANID 2025 | Baja (1) | Alto (3) | **3 — MEDIO** | Amenaza | **Mitigar** | Suscribirse a alertas fondos.gob.cl + newsletter CORFO/ANID; tener fondos alternativos mapeados | Director de Proyecto |
| R08 | Equipo | Falta de tiempo del equipo fundador para gestión de postulaciones | Media (2) | Alto (3) | **6 — ALTO** | Amenaza | **Mitigar** | Designar un responsable exclusivo de fondos; contratar consultor externo si es necesario | CEO |
| R09 | Técnico | El MVP actual no cumple los requisitos técnicos mínimos del evaluador | Baja (1) | Alto (3) | **3 — MEDIO** | Amenaza | **Mitigar** | Documentar TRL actual con evidencias (video funcionando, datos reales, usuarios piloto) antes de postular | CTO |
| R10 | Narrativa | El pitch de Kplant no conecta con evaluadores de fondos agrícolas (FIA) | Media (2) | Medio (2) | **4 — ALTO** | Amenaza | **Mitigar** | Reformular narrativa hacia "agricultura urbana de precisión y gestión de agua"; validar con experto agro antes de enviar | CEO |
| R11 | Internacional | EIC Accelerator requiere empresa domiciliada en Europa | Alta (3) | Medio (2) | **6 — ALTO** | Amenaza | **Aceptar (largo plazo)** | Planificar constitución de filial en España/Portugal para 2026–2027 solo si hay tracción que lo justifique | CEO |
| R12 | Oportunidad | Aparece nueva convocatoria no mapeada con alta compatibilidad | Baja (1) | Alto (3) | **3 — OPORTUNIDAD** | Oportunidad | **Explotar** | Mantener sistema de alerta activo; evaluar rápidamente con checklist de compatibilidad | Director de Proyecto |
| R13 | Oportunidad | Universidad socia tiene línea de investigación complementaria que fortalece la propuesta | Baja (1) | Alto (3) | **3 — OPORTUNIDAD** | Oportunidad | **Explotar** | Integrar publicaciones e investigación previa del socio en el dossier de I+D | CTO |

---

## 3. Mapa de Calor de Riesgos

```
        IMPACTO
         Bajo    Medio    Alto
        ┌───────┬────────┬──────────┐
Alta    │       │        │ R01, R02 │
        │       │        │ R08      │
        ├───────┼────────┼──────────┤
Media   │       │ R06,R10│ R03,R04  │
        │       │        │ R05, R11 │
        ├───────┼────────┼──────────┤
Baja    │       │        │ R07, R09 │
PROB.   │       │        │ R12, R13 │
        └───────┴────────┴──────────┘
          BAJO   MEDIO    ALTO
```

---

## 4. Plan de Contingencia General

| Situación | Contingencia |
|---|---|
| Los 3 primeros fondos son rechazados | Contratar consultor especializado en postulaciones CORFO/ANID; replantear pitch con feedback acumulado |
| No se consigue universidad socia en 6 meses | Explorar institutos tecnológicos (INACAP, DuocUC) o centros de I+D privados (CENIA, NIC) como alternativa |
| Empresa no puede asumir cofinanciamiento | Postular exclusivamente a fondos sin contraparte; buscar socio de negocio con capacidad de aporte |
| Cambio regulatorio elimina un programa clave | Reasignar esfuerzo al siguiente fondo en el ranking de compatibilidad |

---

## 5. Registro de Seguimiento de Riesgos

| ID | Último Seguimiento | Estado Actual | Cambios |
|---|---|---|---|
| R01 | — | Activo | — |
| R02 | — | Activo | — |
| R03 | — | Activo | — |
| *(actualizar en cada revisión mensual)* | | | |
