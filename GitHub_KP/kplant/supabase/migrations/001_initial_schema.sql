-- Kplant initial schema + RLS
-- Run in Supabase SQL Editor (or supabase migration tool)

create extension if not exists pgcrypto;

-- Plants (equivalent of pets in Kittypau)
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  location text,
  photo_url text,
  plant_state text not null default 'active',
  created_at timestamptz not null default now()
);

-- Devices
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique, -- KPPL0001
  device_type text not null check (device_type in ('plant_monitor', 'bridge')),
  device_state text not null default 'factory',
  device_model text,
  owner_id uuid references auth.users(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  wifi_status text,
  wifi_ssid text,
  wifi_ip text,
  sensor_health text,
  last_seen timestamptz,
  ip_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Raw readings from bridge
create table if not exists public.sensor_readings (
  id bigserial primary key,
  device_id text not null references public.devices(device_id) on delete cascade,
  soil_moisture double precision,
  soil_condition text,
  temperature double precision,
  humidity double precision,
  light_lux double precision,
  light_percent double precision,
  light_condition text,
  battery_level double precision,
  battery_voltage double precision,
  device_timestamp timestamptz,
  created_at timestamptz not null default now()
);

-- Processed app-facing readings (UUID references)
create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  soil_moisture double precision,
  soil_condition text,
  temperature double precision,
  humidity double precision,
  light_lux double precision,
  light_percent double precision,
  light_condition text,
  battery_level double precision,
  battery_voltage double precision,
  recorded_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  clock_invalid boolean not null default false,
  unique (device_id, recorded_at)
);

-- User profile
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text,
  owner_name text,
  photo_url text,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_plants_owner_id on public.plants(owner_id);
create index if not exists idx_devices_owner_id on public.devices(owner_id);
create index if not exists idx_devices_plant_id on public.devices(plant_id);
create index if not exists idx_sensor_readings_device_id on public.sensor_readings(device_id);
create index if not exists idx_sensor_readings_created_at on public.sensor_readings(created_at desc);
create index if not exists idx_readings_device_id on public.readings(device_id);
create index if not exists idx_readings_plant_id on public.readings(plant_id);
create index if not exists idx_readings_recorded_at on public.readings(recorded_at desc);

-- Enable RLS
alter table public.plants enable row level security;
alter table public.devices enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.readings enable row level security;
alter table public.profiles enable row level security;

-- Plants policies
drop policy if exists plants_select_own on public.plants;
create policy plants_select_own on public.plants
for select using (owner_id = auth.uid());

drop policy if exists plants_insert_own on public.plants;
create policy plants_insert_own on public.plants
for insert with check (owner_id = auth.uid());

drop policy if exists plants_update_own on public.plants;
create policy plants_update_own on public.plants
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists plants_delete_own on public.plants;
create policy plants_delete_own on public.plants
for delete using (owner_id = auth.uid());

-- Devices policies
drop policy if exists devices_select_own on public.devices;
create policy devices_select_own on public.devices
for select using (owner_id = auth.uid());

drop policy if exists devices_insert_own on public.devices;
create policy devices_insert_own on public.devices
for insert with check (owner_id = auth.uid());

drop policy if exists devices_update_own on public.devices;
create policy devices_update_own on public.devices
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists devices_delete_own on public.devices;
create policy devices_delete_own on public.devices
for delete using (owner_id = auth.uid());

-- Sensor readings policies (owner by linked device.owner_id)
drop policy if exists sensor_readings_select_own on public.sensor_readings;
create policy sensor_readings_select_own on public.sensor_readings
for select using (
  exists (
    select 1
    from public.devices d
    where d.device_id = sensor_readings.device_id
      and d.owner_id = auth.uid()
  )
);

drop policy if exists sensor_readings_insert_own on public.sensor_readings;
create policy sensor_readings_insert_own on public.sensor_readings
for insert with check (
  exists (
    select 1
    from public.devices d
    where d.device_id = sensor_readings.device_id
      and d.owner_id = auth.uid()
  )
);

-- Readings policies (owner by linked device.owner_id)
drop policy if exists readings_select_own on public.readings;
create policy readings_select_own on public.readings
for select using (
  exists (
    select 1
    from public.devices d
    where d.id = readings.device_id
      and d.owner_id = auth.uid()
  )
);

drop policy if exists readings_insert_own on public.readings;
create policy readings_insert_own on public.readings
for insert with check (
  exists (
    select 1
    from public.devices d
    where d.id = readings.device_id
      and d.owner_id = auth.uid()
  )
);

drop policy if exists readings_update_own on public.readings;
create policy readings_update_own on public.readings
for update using (
  exists (
    select 1
    from public.devices d
    where d.id = readings.device_id
      and d.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.devices d
    where d.id = readings.device_id
      and d.owner_id = auth.uid()
  )
);

drop policy if exists readings_delete_own on public.readings;
create policy readings_delete_own on public.readings
for delete using (
  exists (
    select 1
    from public.devices d
    where d.id = readings.device_id
      and d.owner_id = auth.uid()
  )
);

-- Profiles policies
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
for delete using (id = auth.uid());
