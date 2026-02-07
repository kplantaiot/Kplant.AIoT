-- ============================================================
-- KITTYPAU - SCHEMA SQL UNIFICADO
-- Fecha: 2026-02-07
--
-- Orden de ejecucion:
--   CATEGORIA 1: Usuarios  (profiles)
--   CATEGORIA 2: Mascotas  (breeds → pets → pet_breeds)
--   CATEGORIA 3: Dispositivos (devices → sensor_readings)
--   EXTRAS: Triggers, vistas, RLS
--
-- Este schema unifica el schema de la app (Mauro_Context)
-- con el schema del bridge IoT, capturando TODA la informacion.
-- ============================================================

-- ============================================================
-- CATEGORIA 1: USUARIOS
-- Se crea primero porque pets y devices dependen del usuario.
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'apple', 'email')),
  user_name TEXT NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT true,
  owner_name TEXT,                              -- solo si is_owner = false
  care_rating INTEGER NOT NULL CHECK (care_rating BETWEEN 1 AND 10),
  phone_number TEXT UNIQUE,                     -- opcional
  notification_channel TEXT NOT NULL DEFAULT 'app'
    CHECK (notification_channel IN ('app', 'whatsapp', 'email', 'whatsapp_email')),
  city TEXT,
  country TEXT,
  onboarding_step TEXT NOT NULL DEFAULT 'profile'
    CHECK (onboarding_step IN ('profile', 'pet', 'device', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Usuarios de la app. Se crea al registrarse via Supabase Auth.';
COMMENT ON COLUMN profiles.is_owner IS 'true = dueno directo, false = cuidador (requiere owner_name)';
COMMENT ON COLUMN profiles.care_rating IS 'Autoevaluacion de cuidado 1-10';
COMMENT ON COLUMN profiles.onboarding_step IS 'Paso actual del registro: profile → pet → device → completed';


-- ============================================================
-- CATEGORIA 2: MASCOTAS
-- Depende de profiles. Se crea antes que devices porque
-- un dispositivo se asocia a una mascota.
-- ============================================================

-- 2a. Tabla de razas (referencia, se carga una sola vez)
CREATE TABLE breeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('cat', 'dog')),
  is_mixed BOOLEAN NOT NULL DEFAULT false,       -- raza mestiza
  is_unknown BOOLEAN NOT NULL DEFAULT false      -- raza desconocida
);

COMMENT ON TABLE breeds IS 'Catalogo de razas. is_mixed = quiltro/mestizo (excluyente con otras razas).';

-- 2b. Mascotas
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cat', 'dog')),  -- NO editable despues de crear
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
  health_notes TEXT,                             -- solo si has_health_condition = true
  photo_url TEXT,                                -- reemplazable, no versionada, max 5MB
  pet_state TEXT NOT NULL DEFAULT 'created'
    CHECK (pet_state IN ('created', 'completed_profile', 'device_pending', 'device_linked', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pets IS 'Mascotas del usuario. type no es editable post-creacion.';
COMMENT ON COLUMN pets.pet_state IS 'created → completed_profile → device_pending → device_linked → inactive';
COMMENT ON COLUMN pets.weight_kg IS 'Peso corporal de la mascota (no confundir con peso del plato)';

-- 2c. Razas por mascota (max 3, quiltro es excluyente)
CREATE TABLE pet_breeds (
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  breed_id UUID NOT NULL REFERENCES breeds(id) ON DELETE CASCADE,
  PRIMARY KEY (pet_id, breed_id)
);

COMMENT ON TABLE pet_breeds IS 'Relacion N:M. Maximo 3 razas por mascota. Quiltro/mestizo es excluyente.';


-- ============================================================
-- CATEGORIA 3: DISPOSITIVOS Y LECTURAS
-- Depende de profiles y pets.
-- Aqui se unifica el schema IoT del bridge con el de la app.
-- ============================================================

-- 3a. Dispositivos (unifica app + bridge)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- nullable: bridge auto-registra sin dueno
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,        -- nullable: puede existir sin mascota
  device_code TEXT UNIQUE NOT NULL,              -- ej: KPCL0036 (viene del QR y del MQTT topic)
  device_type TEXT CHECK (device_type IN ('food_bowl', 'water_bowl')),
  device_state TEXT NOT NULL DEFAULT 'factory'
    CHECK (device_state IN ('factory', 'claimed', 'linked', 'offline', 'lost')),
  -- Campos IoT (actualizados por el bridge via STATUS)
  wifi_status TEXT,                              -- 'Conectado' / 'Desconectado'
  wifi_ssid TEXT,                                -- red WiFi actual
  wifi_ip TEXT,                                  -- IP local del dispositivo
  sensor_health TEXT,                            -- 'OK', 'ERR_HX711', 'ERR_DHT', 'Initializing'
  firmware_version TEXT,                         -- version del firmware (futuro)
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  last_seen TIMESTAMPTZ,                         -- ultimo mensaje recibido
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE devices IS 'Dispositivos fisicos. El bridge auto-registra con device_code al primer mensaje MQTT.';
COMMENT ON COLUMN devices.device_code IS 'Identificador unico del hardware (ej: KPCL0036). Usado como topic MQTT.';
COMMENT ON COLUMN devices.device_state IS 'factory → claimed (QR escaneado) → linked (asociado a mascota) → offline/lost';
COMMENT ON COLUMN devices.owner_id IS 'NULL cuando el bridge auto-registra. Se asigna cuando el usuario escanea el QR.';

-- Indice para busqueda rapida por device_code (el bridge busca por esto)
CREATE INDEX idx_devices_device_code ON devices(device_code);

-- 3b. Lecturas de sensores (unifica app + bridge)
CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,                      -- autoincremental para alto volumen
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  -- Datos del plato de comida/agua
  weight_grams REAL,                             -- peso en gramos (HX711 load cell)
  water_ml REAL,                                 -- mililitros de agua (futuro, para water_bowl)
  -- Datos ambientales
  temperature REAL,                              -- celsius (DHT11/DHT22), null si sensor error
  humidity REAL,                                 -- humedad relativa % (DHT), null si sensor error
  -- Datos de luz (LDR)
  light_lux REAL,                                -- lux calculados
  light_percent INTEGER,                         -- porcentaje de luz 0-100
  light_condition TEXT                           -- 'dark', 'dim', 'normal', 'bright'
    CHECK (light_condition IN ('dark', 'dim', 'normal', 'bright')),
  -- Metadata
  battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
  device_timestamp TEXT,                         -- timestamp del ESP8266 (MM-dd-aaaa HH:mm:ss)
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- timestamp del servidor
);

COMMENT ON TABLE sensor_readings IS 'Lecturas de sensores. El bridge inserta cada 10s por dispositivo. ~8640 filas/dia/dispositivo.';
COMMENT ON COLUMN sensor_readings.weight_grams IS 'Peso medido por HX711. Mapeado desde "weight" del bridge.';
COMMENT ON COLUMN sensor_readings.device_timestamp IS 'Timestamp NTP del ESP8266. Referencia, no se usa como PK.';

-- Indices para consultas frecuentes
CREATE INDEX idx_readings_device_id ON sensor_readings(device_id);
CREATE INDEX idx_readings_recorded_at ON sensor_readings(recorded_at DESC);
CREATE INDEX idx_readings_device_time ON sensor_readings(device_id, recorded_at DESC);


-- ============================================================
-- TABLA EXTRA: EVENTOS DEL SISTEMA
-- Registro de acciones importantes para auditoria y analytics.
-- ============================================================

CREATE TABLE system_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,                      -- 'pet_created', 'device_linked', 'device_offline', etc.
  entity_type TEXT,                              -- 'pet', 'device', 'profile'
  entity_id TEXT,                                -- UUID o device_code segun contexto
  metadata JSONB,                                -- datos adicionales del evento
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE system_events IS 'Log de eventos: pet_created, device_linked, device_offline, calibration, firmware_update, etc.';

CREATE INDEX idx_events_user ON system_events(user_id);
CREATE INDEX idx_events_type ON system_events(event_type);
CREATE INDEX idx_events_created ON system_events(created_at DESC);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: actualizar devices.last_seen cuando llega una lectura
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

-- Trigger: actualizar updated_at en profiles
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


-- ============================================================
-- VISTAS UTILES
-- ============================================================

-- Vista: ultima lectura por dispositivo
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

-- Vista: resumen de dispositivos con estado y ultima lectura
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


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- breeds: lectura publica (catalogo)
-- No se habilita RLS en breeds para que todos puedan leerla

-- profiles: solo el propio usuario
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- pets: solo mascotas del usuario
CREATE POLICY pets_select ON pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pets_insert ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pets_update ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY pets_delete ON pets FOR DELETE USING (auth.uid() = user_id);

-- pet_breeds: acceso via propietario de la mascota
CREATE POLICY pet_breeds_select ON pet_breeds FOR SELECT
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));
CREATE POLICY pet_breeds_insert ON pet_breeds FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));
CREATE POLICY pet_breeds_delete ON pet_breeds FOR DELETE
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_breeds.pet_id AND pets.user_id = auth.uid()));

-- devices: solo dispositivos del usuario
CREATE POLICY devices_select ON devices FOR SELECT
  USING (owner_id IS NULL OR auth.uid() = owner_id);  -- NULL = bridge auto-registrado, visible para asignar
CREATE POLICY devices_update ON devices FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY devices_delete ON devices FOR DELETE USING (auth.uid() = owner_id);

-- devices: el bridge inserta con service_role (sin RLS), los usuarios reclaman con UPDATE
-- INSERT solo via service_role (bridge) - no se crea policy INSERT para usuarios normales

-- sensor_readings: lectura via propiedad del dispositivo, escritura solo bridge (service_role)
CREATE POLICY readings_select ON sensor_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM devices
    WHERE devices.id = sensor_readings.device_id
    AND (devices.owner_id = auth.uid() OR devices.owner_id IS NULL)
  ));
-- INSERT solo via service_role (bridge) - no se crea policy INSERT

-- system_events: solo eventos del propio usuario
CREATE POLICY events_select ON system_events FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);


-- ============================================================
-- DATOS INICIALES: Razas
-- ============================================================

INSERT INTO breeds (name, species, is_mixed, is_unknown) VALUES
  -- Gatos
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
  -- Perros
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
