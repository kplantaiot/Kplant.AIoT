-- ============================================================
-- MIGRACION V4: device_type (funcion) + device_model (placa)
--
-- device_type = funcion del dispositivo: "comedero", "bebedero",
--               "comedero_cam", "bebedero_cam"
-- device_model = modelo de placa: "AI-Thinker ESP32-CAM",
--                "NodeMCU v3 CP2102"
--
-- + Agrega columna device_model (TEXT)
-- + Redefine device_type como funcion (limpia valores antiguos)
-- + Actualiza vista device_summary con ambas columnas
-- Fecha: 2026-02-09
--
-- Ejecutar en Supabase SQL Editor (todo de una vez)
-- Idempotente: se puede ejecutar multiples veces sin error
-- ============================================================

-- 1. Agregar columna device_model si no existe
ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_model TEXT;

COMMENT ON COLUMN devices.device_type IS 'Funcion del dispositivo: comedero, bebedero, comedero_cam, bebedero_cam';
COMMENT ON COLUMN devices.device_model IS 'Modelo de placa electronica: AI-Thinker ESP32-CAM, NodeMCU v3 CP2102, etc.';

-- 2. Migrar datos historicos de device_type (que contienen modelo de placa) a device_model
-- Solo para dispositivos que tienen valores antiguos en device_type
UPDATE devices
SET device_model = device_type
WHERE device_type IS NOT NULL
  AND device_model IS NULL
  AND device_type NOT IN ('comedero', 'bebedero', 'comedero_cam', 'bebedero_cam');

-- 3. Limpiar device_type: los valores antiguos eran modelos de placa, no funciones
-- Se ponen en NULL para que el firmware nuevo los sobreescriba con la funcion correcta
UPDATE devices
SET device_type = NULL
WHERE device_type IS NOT NULL
  AND device_type NOT IN ('comedero', 'bebedero', 'comedero_cam', 'bebedero_cam');

-- 4. Actualizar vista device_summary con ambas columnas
DROP VIEW IF EXISTS device_summary;
CREATE VIEW device_summary AS
SELECT
  d.id,
  d.device_id,
  d.device_type,
  d.device_model,
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
