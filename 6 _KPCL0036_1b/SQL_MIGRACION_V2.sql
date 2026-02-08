-- ============================================================
-- MIGRACION V2: device_id (TEXT) como PRIMARY KEY de devices
-- + sensor_readings usa device_id como FK directa
-- + Renombrar devices.device_code → device_id
-- Fecha: 2026-02-07
--
-- Ejecutar en Supabase SQL Editor (todo de una vez)
-- ============================================================

-- 1. Eliminar dependencias de sensor_readings y devices
DROP POLICY IF EXISTS readings_select ON sensor_readings;
DROP POLICY IF EXISTS devices_select ON devices;
DROP POLICY IF EXISTS devices_update ON devices;
DROP POLICY IF EXISTS devices_delete ON devices;
DROP TRIGGER IF EXISTS trg_reading_updates_device ON sensor_readings;
DROP TRIGGER IF EXISTS trg_devices_updated_at ON devices;
DROP VIEW IF EXISTS device_summary CASCADE;
DROP VIEW IF EXISTS latest_readings CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;

-- 2. Renombrar device_code → device_id en devices
-- YA EJECUTADO: ALTER TABLE devices RENAME COLUMN device_code TO device_id;

-- 3. Cambiar PK de devices: id UUID → device_id TEXT
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_pkey;
ALTER TABLE devices ADD PRIMARY KEY (device_id);

-- id UUID se mantiene como identificador interno (UNIQUE, no PK)
ALTER TABLE devices ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_id_unique;
ALTER TABLE devices ADD CONSTRAINT devices_id_unique UNIQUE (id);

-- Eliminar indice viejo de device_code/device_id (ya no es necesario, es PK)
DROP INDEX IF EXISTS idx_devices_device_code;
DROP INDEX IF EXISTS idx_devices_device_id;

-- 4. Recrear sensor_readings con device_id TEXT como FK
CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  weight_grams REAL,
  water_ml REAL,
  temperature REAL,
  humidity REAL,
  light_lux REAL,
  light_percent INTEGER,
  light_condition TEXT
    CHECK (light_condition IN ('dark', 'dim', 'normal', 'bright')),
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  device_timestamp TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_readings_device_id ON sensor_readings(device_id);
CREATE INDEX idx_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX idx_readings_device_time ON sensor_readings(device_id, recorded_at DESC);

-- 5. Recrear trigger update_device_last_seen (usa device_id)
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

CREATE TRIGGER trg_reading_updates_device
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();

-- Recrear trigger updated_at en devices
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Recrear vistas
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

CREATE OR REPLACE VIEW device_summary AS
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
  p.name AS pet_name,
  lr.weight_grams AS last_weight,
  lr.temperature AS last_temp,
  lr.humidity AS last_humidity,
  lr.recorded_at AS last_reading_at
FROM devices d
LEFT JOIN pets p ON p.id = d.pet_id
LEFT JOIN latest_readings lr ON lr.device_id = d.device_id;

-- 7. Recrear RLS y policies
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY readings_select ON sensor_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM devices
    WHERE devices.device_id = sensor_readings.device_id
    AND (devices.owner_id = auth.uid() OR devices.owner_id IS NULL)
  ));

CREATE POLICY devices_select ON devices FOR SELECT
  USING (owner_id IS NULL OR auth.uid() = owner_id);
CREATE POLICY devices_update ON devices FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY devices_delete ON devices FOR DELETE USING (auth.uid() = owner_id);
