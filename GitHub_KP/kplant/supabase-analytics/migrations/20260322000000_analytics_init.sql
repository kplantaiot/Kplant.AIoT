-- ============================================================
-- KPlant Analytics DB — Init
-- Proyecto: Kplant_Analytics (Supabase separado)
-- URL: killtbpeuinqvyxpbtbt.supabase.co
-- Fecha: 2026-03-22
--
-- Propósito: almacenar data procesada por el Bridge.
--            Raw data (sensor_readings) permanece en la DB principal.
--
-- Tablas:
--   plant_daily_summary  → resumen diario por dispositivo (Bridge lo genera)
--   watering_events      → riegos detectados por salto brusco de soil_moisture
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ────────────────────────────────────────────────────────────

create type watering_intensity_enum as enum (
  'light',    -- delta soil < 20%  (riego leve / llovizna)
  'normal',   -- delta soil 20-40% (riego normal)
  'heavy'     -- delta soil > 40%  (riego abundante / inundación)
);

-- ────────────────────────────────────────────────────────────
-- 2. plant_daily_summary
--    Una fila = un día calendario por dispositivo.
--    El Bridge la genera/actualiza al procesar cada lote de
--    lecturas (upsert por device_id + summary_date).
--    Fuente principal para gráficos de tendencia semanal/mensual.
-- ────────────────────────────────────────────────────────────

create table public.plant_daily_summary (
  id                  uuid    primary key default gen_random_uuid(),

  -- referencias al proyecto principal (no FK, DB distinta)
  owner_id            uuid    not null,
  plant_id            uuid,                -- null si el device no está vinculado a planta
  device_id           text    not null,    -- 'KPLT0001'

  summary_date        date    not null,

  -- temperatura (°C)
  temp_min            numeric(5,2),
  temp_max            numeric(5,2),
  temp_avg            numeric(5,2),

  -- humedad relativa del aire (%)
  humidity_min        numeric(5,2),
  humidity_max        numeric(5,2),
  humidity_avg        numeric(5,2),

  -- humedad del suelo (%)
  soil_min            integer,
  soil_max            integer,
  soil_avg            numeric(5,2),

  -- luz (lux)
  lux_min             numeric(10,2),
  lux_max             numeric(10,2),
  lux_avg             numeric(10,2),

  -- batería (%)
  battery_avg         integer,
  battery_min         integer,

  -- conteo de lecturas procesadas ese día
  readings_count      integer not null default 0,

  -- riegos detectados ese día (desnormalizado para queries rápidas)
  watering_count      integer not null default 0,

  -- metadata del procesador
  processed_at        timestamptz not null default now(),

  constraint uq_device_daily unique (device_id, summary_date),
  constraint chk_soil_range check (
    soil_min is null or (soil_min between 0 and 100)
  )
);

comment on table public.plant_daily_summary is
  'Resumen diario por dispositivo KPlant generado por el Bridge. '
  'Fuente para gráficos de tendencia semanal/mensual sin necesidad de '
  'agregar millones de filas de sensor_readings en tiempo real.';

comment on column public.plant_daily_summary.plant_id is
  'UUID de la planta en el Supabase principal. Puede ser null si el device aún no está vinculado.';

comment on column public.plant_daily_summary.watering_count is
  'Cantidad de riegos detectados ese día. Desnormalizado desde watering_events para joins rápidos.';

-- índices para queries frecuentes de la app
create index idx_plant_daily_device_date
  on public.plant_daily_summary (device_id, summary_date desc);

create index idx_plant_daily_owner_date
  on public.plant_daily_summary (owner_id, summary_date desc);

create index idx_plant_daily_plant_date
  on public.plant_daily_summary (plant_id, summary_date desc)
  where plant_id is not null;

-- ────────────────────────────────────────────────────────────
-- 3. watering_events
--    Una fila = un riego detectado por el Bridge.
--    Detección: soil_moisture sube ≥ 15% en una ventana de
--    ≤ 30 minutos → se considera riego.
--    El Bridge puede corregir/descartar falsos positivos.
-- ────────────────────────────────────────────────────────────

create table public.watering_events (
  id                  uuid        primary key default gen_random_uuid(),

  -- referencias al proyecto principal (no FK, DB distinta)
  owner_id            uuid        not null,
  plant_id            uuid,
  device_id           text        not null,

  -- ventana de detección
  detected_at         timestamptz not null,   -- primera lectura que supera el umbral
  stabilized_at       timestamptz,            -- lectura donde soil se estabiliza
  duration_min        integer,                -- minutos entre detected_at y stabilized_at

  -- valores de suelo
  soil_before         integer     not null,   -- % suelo antes del riego
  soil_after          integer,                -- % suelo al estabilizarse
  soil_delta          integer,                -- soil_after - soil_before

  -- clasificación automática basada en soil_delta
  intensity           watering_intensity_enum not null default 'normal',

  -- contexto ambiental al momento del riego
  temp_at_watering    numeric(5,2),
  humidity_at_watering numeric(5,2),

  -- flag para futura confirmación manual del usuario
  -- (en UI: "¿Regaste tu planta hoy?" → confirma o descarta)
  user_confirmed      boolean,                -- null = pendiente, true = confirmado, false = falso positivo

  created_at          timestamptz not null default now(),

  constraint chk_soil_before_range check (soil_before between 0 and 100),
  constraint chk_soil_after_range  check (soil_after is null or soil_after between 0 and 100),
  constraint chk_duration_positive check (duration_min is null or duration_min >= 0)
);

comment on table public.watering_events is
  'Riegos detectados automáticamente por el Bridge cuando soil_moisture '
  'sube ≥ 15% en ≤ 30 minutos. Permite historial de riego y recomendaciones.';

comment on column public.watering_events.soil_before is
  'Porcentaje de humedad de suelo justo antes de detectar la subida.';

comment on column public.watering_events.soil_delta is
  'Diferencia soil_after - soil_before. Positivo = riego. Negativo = posible error sensor.';

comment on column public.watering_events.user_confirmed is
  'null = sin revisar | true = riego confirmado | false = falso positivo descartado por el usuario.';

-- índices
create index idx_watering_device_date
  on public.watering_events (device_id, detected_at desc);

create index idx_watering_plant_date
  on public.watering_events (plant_id, detected_at desc)
  where plant_id is not null;

create index idx_watering_owner_date
  on public.watering_events (owner_id, detected_at desc);

-- índice para queries de confirmación pendiente en la app
create index idx_watering_unconfirmed
  on public.watering_events (owner_id, detected_at desc)
  where user_confirmed is null;

-- ────────────────────────────────────────────────────────────
-- 4. RLS — acceso solo via service_role (Bridge + API Next.js)
--    Los clientes nunca consultan esta DB directamente.
--    La API usa service_role y filtra por owner_id.
-- ────────────────────────────────────────────────────────────

alter table public.plant_daily_summary enable row level security;
alter table public.watering_events      enable row level security;

revoke all on table public.plant_daily_summary from anon, authenticated;
revoke all on table public.watering_events      from anon, authenticated;

create policy kp_analytics_service_role on public.plant_daily_summary
  for all to service_role using (true) with check (true);

create policy kp_analytics_service_role on public.watering_events
  for all to service_role using (true) with check (true);
