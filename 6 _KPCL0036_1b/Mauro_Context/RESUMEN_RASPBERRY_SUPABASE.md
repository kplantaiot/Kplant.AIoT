# Resumen: Bridge Raspberry + Supabase (2026-02-09)

## Contexto
Se actualizo el Bridge (Raspberry Pi) para escribir en el nuevo proyecto de Supabase. El flujo operativo es:
ESP8266 -> HiveMQ -> Bridge (Raspberry) -> Supabase

## Estado actual
- Bridge en Raspberry: **activo y corriendo** via systemd.
- Supabase: **recibiendo datos** (sensor_readings y status).
- Sensores con errores (ej. `ERR_HX711`) **se ignoran por ahora**.

## Verificaciones en Raspberry
Comandos usados:
```bash
systemctl status kittypau-bridge
journalctl -u kittypau-bridge -n 100 --no-pager
```

Resultado observado (extracto):
- `✓ Sensor data guardado` para KPCL0036 y KPCL0037
- `✓ Status actualizado` para KPCL0036 y KPCL0037

## Ajustes aplicados en Supabase
Se realizaron ajustes para compatibilidad con el bridge:

1) Estructura devices
- Se confirmo que `devices` usa `device_id` (ya renombrado).
- Se agregaron columnas IoT faltantes:
  - `wifi_status`, `wifi_ssid`, `wifi_ip`, `sensor_health`
  - `notes`, `ip_history`, `retired_at`
- Se creo `updated_at` en `devices` (requerido por trigger).
- Se relajaron columnas `NOT NULL` que el bridge deja vacias:
  - `owner_id`, `pet_id`, `device_type`, `status`, `battery_level`, `last_seen`

2) Lecturas
- Se creo `sensor_readings` con FK a `devices(device_id)`.
- Indices de lectura: por `device_id`, `recorded_at` y combinado.
- Trigger `update_device_last_seen` aplicado.

3) Vistas
- `latest_readings`
- `device_summary` (incluye notes, retired_at)

## SQL aplicados (resumen)

**1) Ajustes en `devices` (nullable y columnas faltantes):**
```sql
ALTER TABLE devices
  ALTER COLUMN owner_id DROP NOT NULL,
  ALTER COLUMN pet_id DROP NOT NULL,
  ALTER COLUMN device_type DROP NOT NULL,
  ALTER COLUMN status DROP NOT NULL,
  ALTER COLUMN battery_level DROP NOT NULL,
  ALTER COLUMN last_seen DROP NOT NULL;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_status TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_ssid TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS wifi_ip TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sensor_health TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ip_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE devices SET updated_at = NOW() WHERE updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_key ON devices(device_id);
```

**2) Crear `sensor_readings`:**
```sql
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  weight_grams REAL,
  water_ml REAL,
  temperature REAL,
  humidity REAL,
  light_lux REAL,
  light_percent INTEGER,
  light_condition TEXT CHECK (light_condition IN ('dark', 'dim', 'normal', 'bright')),
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  device_timestamp TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_readings_device_id ON sensor_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_device_time ON sensor_readings(device_id, recorded_at DESC);
```

**3) Trigger `last_seen`:**
```sql
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.recorded_at,
      updated_at = NOW()
  WHERE device_id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reading_updates_device ON sensor_readings;
CREATE TRIGGER trg_reading_updates_device
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();
```

**4) Vistas:**
```sql
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (sr.device_id)
  sr.device_id,
  sr.weight_grams,
  sr.water_ml,
  sr.temperature,
  sr.humidity,
  sr.light_lux,
  sr.light_percent,
  sr.light_condition,
  sr.recorded_at
FROM sensor_readings sr
ORDER BY sr.device_id, sr.recorded_at DESC;

DROP VIEW IF EXISTS device_summary;
CREATE VIEW device_summary AS
SELECT
  d.id,
  d.device_id,
  d.device_type,
  d.device_state,
  d.wifi_status,
  d.wifi_ssid,
  d.wifi_ip,
  d.sensor_health,
  d.last_seen,
  d.owner_id,
  d.pet_id,
  d.notes,
  d.retired_at,
  p.name AS pet_name,
  lr.weight_grams AS last_weight,
  lr.temperature AS last_temp,
  lr.humidity AS last_humidity,
  lr.recorded_at AS last_reading_at
FROM devices d
LEFT JOIN pets p ON p.id = d.pet_id
LEFT JOIN latest_readings lr ON lr.device_id = d.device_id;
```

## Errores resueltos
Durante la puesta en marcha se corrigieron:
- Key de Supabase en bridge (service_role / anon).
- Esquema incompleto en Supabase.
- Falta de columnas (`device_id`, `updated_at`).
- Restricciones `NOT NULL` que bloqueaban auto-registro.

## Pendiente / Proximo paso
- Se planea **modificar las tablas** y luego validar nuevamente.
- Tras los cambios, repetir:
```bash
sudo systemctl restart kittypau-bridge
journalctl -u kittypau-bridge -n 50 --no-pager
```

## Nota sobre sensores
Errores como `ERR_HX711` se consideran **hardware/calibracion** y no afectan la integracion del bridge.
