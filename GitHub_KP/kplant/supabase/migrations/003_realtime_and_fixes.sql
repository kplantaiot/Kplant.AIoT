-- Migration 003: Enable Realtime + fix device update policy for bridge

-- Enable Supabase Realtime on sensor_readings
-- Required for PlantCard live subscription (postgres_changes)
alter publication supabase_realtime add table public.sensor_readings;

-- Also enable on devices so UI can react to online/offline changes
alter publication supabase_realtime add table public.devices;

-- The bridge uses service role key (bypasses RLS) so no extra policies needed.
-- However, unclaimed devices (owner_id IS NULL) can't be selected/updated by
-- regular users anyway — correct behavior.

-- Add policy: allow bridge service role to insert readings for any device
-- (service role already bypasses RLS, this is belt-and-suspenders for clarity)
-- No action needed — service role bypasses all RLS policies.

-- Fix: devices update policy currently requires owner_id = auth.uid()
-- but bridge (service role) needs to update devices it auto-registered (owner_id IS NULL).
-- Since service role bypasses RLS, no policy change needed.

-- Add select policy: allow users to see unclaimed devices they're trying to link
drop policy if exists devices_select_unclaimed on public.devices;
create policy devices_select_unclaimed on public.devices
for select using (owner_id is null);
-- This allows /api/devices to find a device by code even before it's claimed.

-- Cleanup: trim old sensor_readings to avoid table bloat (keep last 10,000 rows per device)
-- This is a manual maintenance query — not run automatically.
-- Run periodically:
-- delete from public.sensor_readings
-- where id not in (
--   select id from public.sensor_readings
--   order by created_at desc
--   limit 10000
-- );
