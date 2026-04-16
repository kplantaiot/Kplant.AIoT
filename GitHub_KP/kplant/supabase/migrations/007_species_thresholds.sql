-- ============================================================
-- Migración 007: Umbrales de sensores por especie + FK plants → species
-- ============================================================

-- 1. Agregar umbrales de sensores a plant_species
ALTER TABLE public.plant_species
  ADD COLUMN IF NOT EXISTS soil_min_pct     INT DEFAULT 30,   -- suelo mínimo % (por debajo = seco)
  ADD COLUMN IF NOT EXISTS soil_max_pct     INT DEFAULT 70,   -- suelo máximo % (por encima = encharcado)
  ADD COLUMN IF NOT EXISTS light_min_lux    INT DEFAULT 100,  -- lux mínimo (por debajo = muy oscuro)
  ADD COLUMN IF NOT EXISTS light_max_lux    INT DEFAULT 50000; -- lux máximo (por encima = quemante)

-- 2. Actualizar umbrales por grupo de plantas
-- Tropicales (Monsteras, Philodendros, Alocasias, Anthurium, Spathiphyllum, etc.)
UPDATE public.plant_species SET
  soil_min_pct = 35, soil_max_pct = 70,
  light_min_lux = 200, light_max_lux = 10000
WHERE subcategory = 'tropical';

-- Calatheas y Marantas (mucho más exigentes en humedad y sombra)
UPDATE public.plant_species SET
  soil_min_pct = 45, soil_max_pct = 75,
  light_min_lux = 50, light_max_lux = 2000
WHERE common_name IN ('Calathea Ornata','Calathea Orbifolia','Calathea Lancifolia','Calathea Zebrina','Maranta');

-- Trepadoras y colgantes (Pothos, Tradescantia, Singonio, Mala Madre, Hiedra)
UPDATE public.plant_species SET
  soil_min_pct = 30, soil_max_pct = 65,
  light_min_lux = 100, light_max_lux = 8000
WHERE subcategory = 'trepadora';

-- Palmeras y plantas grandes (Ficus, Dracaena, etc.)
UPDATE public.plant_species SET
  soil_min_pct = 30, soil_max_pct = 60,
  light_min_lux = 500, light_max_lux = 20000
WHERE subcategory = 'palmera';

-- Lengua de Suegra / Dracaena trifasciata (muy tolerante a sequía)
UPDATE public.plant_species SET
  soil_min_pct = 15, soil_max_pct = 45,
  light_min_lux = 50, light_max_lux = 30000
WHERE common_name = 'Lengua de Suegra';

-- Suculentas (Echeveria, Haworthia, Aloe, Jade, Kalanchoe, Collar de Perlas)
UPDATE public.plant_species SET
  soil_min_pct = 10, soil_max_pct = 40,
  light_min_lux = 1000, light_max_lux = 80000
WHERE subcategory = 'suculenta';

-- Aloe Vera (más luz directa)
UPDATE public.plant_species SET
  soil_min_pct = 10, soil_max_pct = 35,
  light_min_lux = 2000, light_max_lux = 80000
WHERE common_name = 'Aloe Vera';

-- Haworthia (soporta menos luz que otras suculentas)
UPDATE public.plant_species SET
  soil_min_pct = 10, soil_max_pct = 40,
  light_min_lux = 300, light_max_lux = 30000
WHERE common_name = 'Haworthia';

-- Cactus (Mammillaria, Nopal, Cactus de Navidad)
UPDATE public.plant_species SET
  soil_min_pct = 5, soil_max_pct = 30,
  light_min_lux = 2000, light_max_lux = 100000
WHERE subcategory = 'cactus';

-- Cactus de Navidad (más tolerante, florece con ciclos de oscuridad)
UPDATE public.plant_species SET
  soil_min_pct = 20, soil_max_pct = 50,
  light_min_lux = 500, light_max_lux = 30000
WHERE common_name = 'Cactus de Navidad';

-- Pequeñas de mesa (Peperomia, Pilea, Begonia)
UPDATE public.plant_species SET
  soil_min_pct = 30, soil_max_pct = 60,
  light_min_lux = 200, light_max_lux = 8000
WHERE subcategory = 'pequena';

-- Begonia Rex (más húmeda)
UPDATE public.plant_species SET
  soil_min_pct = 40, soil_max_pct = 70,
  light_min_lux = 300, light_max_lux = 5000
WHERE common_name = 'Begonia Rex';

-- 3. FK species_id en la tabla plants
ALTER TABLE public.plants
  ADD COLUMN IF NOT EXISTS species_id UUID REFERENCES public.plant_species(id) ON DELETE SET NULL;

-- Índice para lookups rápidos
CREATE INDEX IF NOT EXISTS idx_plants_species_id ON public.plants(species_id);

-- 4. Tabla system_events (alertas / eventos del motor de alertas)
CREATE TABLE IF NOT EXISTS public.system_events (
  id            BIGSERIAL PRIMARY KEY,
  device_id     TEXT NOT NULL,
  plant_id      UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,   -- soil_dry, soil_wet, temp_high, temp_low, light_low, humidity_low
  severity      TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  message       TEXT NOT NULL,
  sensor_value  NUMERIC,
  threshold     NUMERIC,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: cada usuario ve solo sus propios eventos
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select_own ON public.system_events;
CREATE POLICY events_select_own ON public.system_events
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS events_insert_service ON public.system_events;
CREATE POLICY events_insert_service ON public.system_events
  FOR INSERT WITH CHECK (TRUE);  -- bridge usa service_role, bypasa RLS

DROP POLICY IF EXISTS events_update_own ON public.system_events;
CREATE POLICY events_update_own ON public.system_events
  FOR UPDATE USING (auth.uid() = owner_id);

-- Índices para queries de alertas activas por usuario / planta
CREATE INDEX IF NOT EXISTS idx_events_owner_unresolved
  ON public.system_events (owner_id, resolved, created_at DESC)
  WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_events_device
  ON public.system_events (device_id, created_at DESC);
