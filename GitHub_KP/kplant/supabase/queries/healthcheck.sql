-- Kplant healthcheck queries
-- Run sections independently in Supabase SQL Editor

-- 1) Bridge live status (requires view from migration 002)
select *
from public.bridge_status_live;

-- 2) Last seen devices
select
  device_id,
  device_type,
  device_state,
  wifi_status,
  wifi_ip,
  sensor_health,
  last_seen
from public.devices
order by last_seen desc nulls last
limit 20;

-- 3) Latest raw telemetry
select
  id,
  device_id,
  soil_moisture,
  soil_condition,
  temperature,
  humidity,
  light_lux,
  battery_level,
  battery_voltage,
  device_timestamp,
  created_at
from public.sensor_readings
order by id desc
limit 20;

-- 4) Latest app-facing readings (only claimed devices)
select
  id,
  device_id,
  plant_id,
  soil_moisture,
  temperature,
  humidity,
  light_lux,
  battery_level,
  recorded_at,
  ingested_at,
  clock_invalid
from public.readings
order by ingested_at desc
limit 20;

-- 5) Focus check: specific IDs used during setup
select
  device_id,
  device_type,
  device_state,
  wifi_status,
  wifi_ip,
  sensor_health,
  last_seen
from public.devices
where device_id in ('KPBR0002', 'KPPL0001', 'KPPLTEST')
order by device_id;
