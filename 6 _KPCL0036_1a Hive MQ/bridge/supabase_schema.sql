-- ============================================
-- Kittypau - Esquema de Base de Datos Supabase
-- ============================================

-- Tabla de dispositivos (estado actual)
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,              -- KPCL0036, KPCL0037, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ,
  wifi_status TEXT,
  wifi_ssid TEXT,
  wifi_ip TEXT,
  status TEXT,                      -- Online/Offline
  sensor_health TEXT                -- OK, ERR_HX711, ERR_DHT, etc.
);

-- Tabla de lecturas de sensores (histórico)
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT REFERENCES devices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  weight REAL,                      -- Peso en gramos
  temp REAL,                        -- Temperatura en °C
  hum REAL,                         -- Humedad en %
  light_lux REAL,                   -- Luz en lux
  light_percent INTEGER,            -- Luz en %
  light_condition TEXT              -- dark, dim, normal, bright
);

-- Índice para consultas rápidas por dispositivo y tiempo
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
ON sensor_readings(device_id, created_at DESC);

-- Índice para consultas por timestamp
CREATE INDEX IF NOT EXISTS idx_sensor_readings_created
ON sensor_readings(created_at DESC);

-- ============================================
-- Row Level Security (RLS) - Opcional
-- ============================================
-- Si quieres habilitar RLS, descomenta estas líneas:

-- ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
-- CREATE POLICY "Allow public read" ON devices FOR SELECT USING (true);
-- CREATE POLICY "Allow public read" ON sensor_readings FOR SELECT USING (true);

-- Política para permitir inserción con API key
-- CREATE POLICY "Allow insert with key" ON devices FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow insert with key" ON sensor_readings FOR INSERT WITH CHECK (true);

-- ============================================
-- Vistas útiles (Opcional)
-- ============================================

-- Vista: Última lectura de cada dispositivo
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (device_id)
  device_id,
  created_at,
  weight,
  temp,
  hum,
  light_lux,
  light_percent,
  light_condition
FROM sensor_readings
ORDER BY device_id, created_at DESC;

-- Vista: Resumen de dispositivos con última lectura
CREATE OR REPLACE VIEW device_summary AS
SELECT
  d.id,
  d.status,
  d.wifi_ssid,
  d.wifi_ip,
  d.sensor_health,
  d.last_seen,
  lr.weight,
  lr.temp,
  lr.hum,
  lr.light_condition
FROM devices d
LEFT JOIN latest_readings lr ON d.id = lr.device_id;
