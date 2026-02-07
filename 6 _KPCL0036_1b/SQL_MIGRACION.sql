-- ============================================================
-- KITTYPAU - MIGRACION A SCHEMA UNIFICADO
-- Fecha: 2026-02-07
--
-- INSTRUCCIONES:
--   1. Abrir Supabase Dashboard → SQL Editor
--   2. Ejecutar PASO 1 primero (limpieza)
--   3. Ejecutar PASO 2 (tablas nuevas)
--   4. Ejecutar PASO 3 (triggers, vistas, RLS, datos)
--
-- IMPORTANTE: Despues de ejecutar, actualizar el .env del bridge:
--   SUPABASE_KEY → cambiar por SUPABASE_SERVICE_ROLE_KEY
--   (Settings → API → service_role key)
--   El bridge necesita service_role porque RLS bloquea INSERT con anon key.
-- ============================================================


-- ============================================================
-- PASO 1: LIMPIEZA DE TABLAS ANTERIORES
-- Elimina el schema antiguo del bridge (devices TEXT pk, sensor_readings)
-- ============================================================

DROP VIEW IF EXISTS device_summary CASCADE;
DROP VIEW IF EXISTS latest_readings CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS devices CASCADE;


-- ============================================================
-- PASO 2: CREAR TABLAS NUEVAS
-- ============================================================

-- CATEGORIA 1: USUARIOS
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'apple', 'email')),
  user_name TEXT NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT true,
  owner_name TEXT,
  care_rating INTEGER NOT NULL CHECK (care_rating BETWEEN 1 AND 10),
  phone_number TEXT UNIQUE,
  notification_channel TEXT NOT NULL DEFAULT 'app'
    CHECK (notification_channel IN ('app', 'whatsapp', 'email', 'whatsapp_email')),
  city TEXT,
  country TEXT,
  onboarding_step TEXT NOT NULL DEFAULT 'profile'
    CHECK (onboarding_step IN ('profile', 'pet', 'device', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CATEGORIA 2: MASCOTAS
CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  is_mixed BOOLEAN NOT NULL DEFAULT false,
  is_unknown BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cat', 'dog')),
  origin TEXT CHECK (origin IN ('comprado', 'rescatado', 'llego_solo', 'regalado')),
  is_neutered BOOLEAN,
  has_neuter_tattoo BOOLEAN,
  has_microchip BOOLEAN,
  living_environment TEXT
    CHECK (living_environment IN ('departamento', 'casa', 'patio', 'exterior')),
  size TEXT CHECK (size IN ('pequeno', 'mediano', 'grande', 'gigante')),
  age_range TEXT CHECK (age_range IN ('cachorro', 'adulto', 'senior')),
  weight_kg NUMERIC CHECK (weight_kg > 0 AND weight_kg <= 120),
  activity_level TEXT
    CHECK (activity_level IN ('bajo', 'normal', 'activo', 'muy_activo')),
  alone_time TEXT
    CHECK (alone_time IN ('casi_nunca', 'algunas_horas', 'medio_dia', 'todo_el_dia')),
  has_health_condition BOOLEAN DEFAULT false,
  health_notes TEXT,
  photo_url TEXT,
  pet_state TEXT NOT NULL DEFAULT 'created'
    CHECK (pet_state IN ('created', 'completed_profile', 'device_pending', 'device_linked', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pet_breeds (
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  breed_id UUID NOT NULL REFERENCES breeds(id) ON DELETE CASCADE,
  PRIMARY KEY (pet_id, breed_id)
);

-- CATEGORIA 3: DISPOSITIVOS Y LECTURAS
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  device_code TEXT UNIQUE NOT NULL,
  device_type TEXT CHECK (device_type IN ('food_bowl', 'water_bowl')),
  device_state TEXT NOT NULL DEFAULT 'factory'
    CHECK (device_state IN ('factory', 'claimed', 'linked', 'offline', 'lost')),
  wifi_status TEXT,
  wifi_ssid TEXT,
  wifi_ip TEXT,
  sensor_health TEXT,
  firmware_version TEXT,
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_device_code ON devices(device_code);

CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
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

-- TABLA EXTRA: EVENTOS
CREATE TABLE system_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_user ON system_events(user_id);
CREATE INDEX idx_events_type ON system_events(event_type);
CREATE INDEX idx_events_created ON system_events(created_at DESC);


-- ============================================================
-- PASO 3: TRIGGERS, VISTAS, RLS Y DATOS INICIALES
-- ============================================================

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.recorded_at,
      updated_at = NOW()
  WHERE id = NEW.device_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reading_updates_device
  AFTER INSERT ON sensor_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- VISTAS
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (sr.device_id)
  sr.device_id,
  d.device_code,
  sr.weight_grams,
  sr.water_ml,
  sr.temperature,
  sr.humidity,
  sr.light_lux,
  sr.light_percent,
  sr.light_condition,
  sr.recorded_at
FROM sensor_readings sr
JOIN devices d ON d.id = sr.device_id
ORDER BY sr.device_id, sr.recorded_at DESC;

CREATE OR REPLACE VIEW device_summary AS
SELECT
  d.id,
  d.device_code,
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
LEFT JOIN latest_readings lr ON lr.device_id = d.id;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY pets_select ON pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pets_insert ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pets_update ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY pets_delete ON pets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY pet_breeds_select ON pet_breeds FOR SELECT
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));
CREATE POLICY pet_breeds_insert ON pet_breeds FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));
CREATE POLICY pet_breeds_delete ON pet_breeds FOR DELETE
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));

CREATE POLICY devices_select ON devices FOR SELECT
  USING (owner_id IS NULL OR auth.uid() = owner_id);
CREATE POLICY devices_update ON devices FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY devices_delete ON devices FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY readings_select ON sensor_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = sensor_readings.device_id
    AND (devices.owner_id = auth.uid() OR devices.owner_id IS NULL)
  ));

CREATE POLICY events_select ON system_events FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

-- DATOS INICIALES: RAZAS
INSERT INTO breeds (name, species, is_mixed, is_unknown) VALUES
  ('Quiltro/Mestizo', 'cat', true, false),
  ('Desconocida', 'cat', false, true),
  ('Siames', 'cat', false, false),
  ('Persa', 'cat', false, false),
  ('Maine Coon', 'cat', false, false),
  ('Bengala', 'cat', false, false),
  ('Ragdoll', 'cat', false, false),
  ('British Shorthair', 'cat', false, false),
  ('Abisinio', 'cat', false, false),
  ('Sphynx', 'cat', false, false),
  ('Scottish Fold', 'cat', false, false),
  ('Angora', 'cat', false, false),
  ('Quiltro/Mestizo', 'dog', true, false),
  ('Desconocida', 'dog', false, true),
  ('Labrador', 'dog', false, false),
  ('Golden Retriever', 'dog', false, false),
  ('Pastor Aleman', 'dog', false, false),
  ('Bulldog Frances', 'dog', false, false),
  ('Poodle', 'dog', false, false),
  ('Chihuahua', 'dog', false, false),
  ('Beagle', 'dog', false, false),
  ('Husky Siberiano', 'dog', false, false),
  ('Dachshund', 'dog', false, false),
  ('Border Collie', 'dog', false, false),
  ('Rottweiler', 'dog', false, false),
  ('Boxer', 'dog', false, false);
