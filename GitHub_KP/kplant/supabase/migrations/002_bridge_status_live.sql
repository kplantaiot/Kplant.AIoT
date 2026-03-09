-- Bridge live status view
-- Shows online/degraded/offline based on last_seen recency.

create or replace view public.bridge_status_live as
select
  d.device_id as bridge_id,
  d.device_model,
  d.wifi_ip,
  d.wifi_status,
  d.sensor_health,
  d.last_seen,
  round(extract(epoch from (now() - d.last_seen))::numeric, 0) as seconds_since_last_seen,
  case
    when d.last_seen is null then 'offline'
    when now() - d.last_seen <= interval '120 seconds' then 'online'
    when now() - d.last_seen <= interval '300 seconds' then 'degraded'
    else 'offline'
  end as bridge_status
from public.devices d
where d.device_type = 'bridge'
order by d.last_seen desc;
