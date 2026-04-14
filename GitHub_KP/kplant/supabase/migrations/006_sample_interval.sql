-- Add sample_interval_ms to devices table.
-- Stores the currently configured sampling interval for each device.
-- Default 900000ms (15min). Updated by the web app on SET_INTERVAL command
-- and by the bridge when the device reports wake_interval_ms in STATUS.

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS sample_interval_ms INTEGER DEFAULT 900000;
