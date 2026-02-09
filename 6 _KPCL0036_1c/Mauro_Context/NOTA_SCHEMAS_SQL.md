# Nota: Discrepancia entre Schemas SQL

## Problema detectado (2026-02-06)

Existen **dos schemas SQL diferentes** en el proyecto que son incompatibles entre si:

---

## Schema 1: App (Mauro_Context)
**Archivo**: `Mauro_Context/SQL_SCHEMA.sql`
**Proposito**: Schema completo para la aplicacion web (perfiles, mascotas, dispositivos, lecturas)

### Tabla `devices`
- `id` UUID (PK, auto-generado)
- `owner_id` UUID (FK -> profiles)
- `pet_id` UUID (FK -> pets)
- `device_id` TEXT UNIQUE (ej: KPCL0001)
- `device_type` TEXT (food_bowl/water_bowl)
- `status` TEXT (active/inactive)
- `device_state` TEXT (factory/claimed/linked/offline/lost)
- `battery_level` INT
- `last_seen` TIMESTAMPTZ

### Tabla `readings`
- `id` UUID (PK)
- `device_id` UUID (FK -> devices.id)
- `pet_id` UUID (FK -> pets)
- `weight_grams` INT
- `water_ml` INT
- `temperature` NUMERIC
- `humidity` NUMERIC
- `battery_level` INT
- `recorded_at` TIMESTAMPTZ

### Caracteristicas
- RLS habilitado en todas las tablas
- Policies por usuario (`auth.uid()`)
- Tablas adicionales: profiles, pets, breeds, pet_breeds
- Inserciones de readings via `service_role`

---

## Schema 2: Bridge (IoT)
**Archivo**: `bridge/supabase_schema.sql`
**Proposito**: Schema simple para el bridge MQTT que escribe datos de sensores

### Tabla `devices`
- `device_id` TEXT (PK, ej: "KPCL0038")
- `wifi_status` TEXT
- `wifi_ssid` TEXT
- `wifi_ip` TEXT
- `status` TEXT (Online/Offline)
- `sensor_health` TEXT
- `last_seen` TIMESTAMPTZ

### Tabla `sensor_readings`
- `id` BIGSERIAL (PK)
- `device_id` TEXT (FK -> devices.id)
- `weight` REAL (no `weight_grams`)
- `temp` REAL (no `temperature`)
- `hum` REAL (no `humidity`)
- `light_lux` REAL
- `light_percent` INTEGER
- `light_condition` TEXT

### Caracteristicas
- RLS comentado (opcional)
- Vistas: `latest_readings`, `device_summary`
- Sin tablas de usuarios/mascotas
- Bridge usa `SUPABASE_KEY` (anon) para insertar

---

## Diferencias criticas

| Aspecto | Schema App | Schema Bridge |
|---------|-----------|---------------|
| PK de devices | UUID auto-generado | TEXT (device_id directo) |
| FK de readings | UUID -> devices.id | TEXT -> devices.id |
| Nombre tabla lecturas | `readings` | `sensor_readings` |
| Campo peso | `weight_grams` (INT) | `weight` (REAL) |
| Campo temp | `temperature` (NUMERIC) | `temp` (REAL) |
| Campo humedad | `humidity` (NUMERIC) | `hum` (REAL) |
| Campo luz | No existe | `light_lux`, `light_percent`, `light_condition` |
| Campo agua | `water_ml` (INT) | No existe |
| Campo bateria | `battery_level` (INT) | No existe (en readings) |
| Owner/Pet | Tiene `owner_id`, `pet_id` | No tiene |
| RLS | Habilitado con policies | Comentado |

---

## Decision pendiente

Antes de hacer el deploy final, hay que decidir:

### Opcion A: Unificar en un solo schema
- Crear un schema hibrido que cubra tanto la app como el bridge.
- El bridge escribe en tablas compatibles con la app.
- Requiere modificar `bridge.js` para adaptarse a los nombres de columnas del schema App.

### Opcion B: Mantener separados
- La Supabase de produccion usa el Schema App completo.
- El bridge escribe en tablas adicionales (`sensor_readings` del Schema Bridge).
- Una vista o funcion SQL reconcilia ambas tablas.

### Opcion C: Migrar bridge al schema App (recomendada)
- Modificar `bridge.js` para:
  - Buscar dispositivos por `device_id` en vez de usar el code como PK.
  - Insertar en `readings` con los campos del Schema App.
  - Mapear: `weight` -> `weight_grams`, `temp` -> `temperature`, `hum` -> `humidity`.
- Auto-registro crea dispositivo con `device_id` y estado `factory`.
- No requiere tablas extra.

---

## RESUELTO (2026-02-07)

**Se eligio Opcion C** - Schema unificado con bridge adaptado.

### Lo que se hizo:
1. **`SQL_UNIFICADO.sql`** - Schema completo con 7 tablas: profiles, breeds, pets, pet_breeds, devices, sensor_readings, system_events. Devices usa UUID como PK + device_id TEXT UNIQUE. Incluye campos IoT (wifi_status, sensor_health, light_*) y campos App (owner_id, pet_id, device_state). RLS, triggers y vistas incluidas.
2. **`bridge/bridge.js` v2.0** - Busca device por device_id para obtener UUID, mapea weight→weight_grams, temp→temperature, hum→humidity, cache en memoria device_id→UUID.
3. **`bridge/supabase_schema.sql`** - Deprecado, redirige a SQL_UNIFICADO.sql.

### Siguiente paso:
- Ejecutar `SQL_UNIFICADO.sql` en Supabase de produccion.
- Deploy del bridge v2.0 en la RPi.

Ver tambien:
- `SQL_UNIFICADO.sql` (Schema definitivo)
- `Hitos-Pendientes.md` (tracking general)
