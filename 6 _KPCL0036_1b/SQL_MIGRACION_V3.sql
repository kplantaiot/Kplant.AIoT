-- ============================================================
-- MIGRACION V3: Historial de dispositivos
-- + Columna notes (TEXT) para anotaciones manuales
-- + Columna ip_history (JSONB) para registro de IPs pasadas
-- + Columna retired_at (TIMESTAMPTZ) para dispositivos retirados
-- + Marcar KPCL0039 como retirado (re-flasheado como KPCL0031)
-- Fecha: 2026-02-09
--
-- Ejecutar en Supabase SQL Editor (todo de una vez)
-- Idempotente: se puede ejecutar multiples veces sin error
-- ============================================================

-- 1. Agregar columnas si no existen
ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ip_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;

-- 2. Marcar KPCL0039 como retirado
UPDATE devices
SET
  retired_at = '2026-02-09T03:37:00Z',
  notes = 'Retirado: re-flasheado como KPCL0031 via OTA el 2026-02-09. Mismo hardware fisico.'
WHERE device_id = 'KPCL0039'
  AND retired_at IS NULL;

-- 3. Registrar IP historica de KPCL0039 antes de retirarlo
UPDATE devices
SET ip_history = '[{"ip": "192.168.1.91", "ssid": "Casa 15", "from": "2026-02-07", "to": "2026-02-09", "note": "Ultima IP antes de re-flasheo como KPCL0031"}]'::jsonb
WHERE device_id = 'KPCL0039'
  AND ip_history = '[]'::jsonb;

-- 4. Actualizar vista device_summary para incluir nuevos campos
-- Nota: DROP es necesario porque PostgreSQL no permite agregar columnas con CREATE OR REPLACE
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
