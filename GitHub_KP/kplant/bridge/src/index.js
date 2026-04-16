require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const { processAnalytics } = require('./analytics');
const { evaluateAlerts } = require('./alerts');

const DEVICE_PREFIX = process.env.DEVICE_PREFIX || 'KPPL';
const BRIDGE_DEVICE_ID = process.env.BRIDGE_DEVICE_ID || 'KPBR0002';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  console.error('[SUPABASE] Missing SUPABASE_URL or service key.');
  process.exit(1);
}

if (!process.env.MQTT_BROKER || !process.env.MQTT_USER || !process.env.MQTT_PASS) {
  console.error('[MQTT] Missing MQTT_BROKER/MQTT_USER/MQTT_PASS in .env');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);
const knownDevices = new Set();
const lastKnownIp = new Map();
const BRIDGE_STATUS_INTERVAL_MS = 60000;

const mqttClient = mqtt.connect({
  host: process.env.MQTT_BROKER,
  port: Number(process.env.MQTT_PORT || 8883),
  protocol: 'mqtts',
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  rejectUnauthorized: false
});

console.log('=================================');
console.log('      Kplant Bridge v1.0');
console.log('=================================');
console.log(`MQTT Broker: ${process.env.MQTT_BROKER}`);
console.log(`Supabase: ${process.env.SUPABASE_URL}`);
console.log(`Device prefix: ${DEVICE_PREFIX}`);
console.log('Mode: wildcard +/SENSORS and +/STATUS');
console.log('=================================\n');

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected');
  mqttClient.subscribe('+/SENSORS', (err) => {
    if (!err) console.log('[MQTT] Subscribed +/SENSORS');
  });
  mqttClient.subscribe('+/STATUS', (err) => {
    if (!err) console.log('[MQTT] Subscribed +/STATUS');
  });

  // Register bridge status as soon as MQTT is up.
  publishBridgeStatus().catch((err) => {
    console.error('[BRIDGE-STATUS] Initial publish error:', err.message);
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('offline', () => {
  console.log('[MQTT] Offline - reconnecting...');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

mqttClient.on('message', async (topic, message) => {
  try {
    const [deviceId, type] = topic.split('/');
    if (!deviceId || !type) return;

    if (!deviceId.startsWith(DEVICE_PREFIX) && deviceId !== BRIDGE_DEVICE_ID) {
      return;
    }

    const data = JSON.parse(message.toString());
    await ensureDeviceExists(deviceId, data);

    if (type === 'SENSORS') {
      await handleSensorData(deviceId, data);
    } else if (type === 'STATUS') {
      await handleStatusData(deviceId, data);
    }
  } catch (err) {
    console.error('[BRIDGE] Message processing error:', err.message);
  }
});

async function ensureDeviceExists(deviceId, payload) {
  if (knownDevices.has(deviceId)) return;

  const { data: existing } = await supabase
    .from('devices')
    .select('device_id')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (existing) {
    knownDevices.add(deviceId);
    return;
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('devices').insert({
    device_id: deviceId,
    device_type: payload?.device_type || 'plant_monitor',
    device_state: 'factory',
    device_model: payload?.device_model || 'ESP32-C3 SuperMini',
    last_seen: now
  });

  if (error) {
    console.error(`[SUPABASE] Device auto-register error ${deviceId}: ${error.message}`);
    return;
  }

  knownDevices.add(deviceId);
  console.log(`[SUPABASE] Device auto-registered: ${deviceId}`);
}

async function handleSensorData(deviceId, data) {
  const { error } = await supabase.from('sensor_readings').insert({
    device_id: deviceId,
    soil_moisture: data.soil?.percent ?? data.soil_moisture ?? null,
    soil_condition: data.soil?.condition ?? data.soil_condition ?? null,
    temperature: data.temp ?? null,
    humidity: data.hum ?? null,
    light_lux: data.light?.lux ?? null,
    light_percent: data.light?.percent ?? data.light?.['%'] ?? null,
    light_condition: data.light?.condition ?? null,
    battery_level: data.battery?.percent ?? data.battery?.level ?? null,
    battery_voltage: data.battery?.voltage ?? null,
    device_timestamp: data.timestamp ?? null
  });

  if (error) {
    console.error(`[SUPABASE] sensor_readings insert error (${deviceId}): ${error.message}`);
  } else {
    console.log(`[SUPABASE] sensor_readings OK (${deviceId})`);
  }

  await writeToReadings(deviceId, data);
}

async function writeToReadings(deviceId, data) {
  const { data: device, error: deviceLookupError } = await supabase
    .from('devices')
    .select('id, plant_id, owner_id')
    .eq('device_id', deviceId)
    .maybeSingle();


  if (deviceLookupError) {
    console.error(`[READINGS] device lookup error (${deviceId}): ${deviceLookupError.message}`);
    return;
  }

  // Not claimed by a user yet; keep only raw telemetry.
  if (!device || !device.owner_id) return;

  const nowMs = Date.now();
  let recordedAt = new Date(nowMs).toISOString();
  let clockInvalid = false;

  if (data.timestamp) {
    const ts = Date.parse(data.timestamp);
    if (Number.isFinite(ts)) {
      if (Math.abs(nowMs - ts) > 10 * 60 * 1000) {
        clockInvalid = true;
      } else {
        recordedAt = new Date(ts).toISOString();
      }
    } else {
      clockInvalid = true;
    }
  }

  const { error } = await supabase.from('readings').upsert(
    {
      device_id: device.id,
      plant_id: device.plant_id ?? null,
      soil_moisture: data.soil?.percent ?? data.soil_moisture ?? null,
      soil_condition: data.soil?.condition ?? data.soil_condition ?? null,
      temperature: data.temp ?? null,
      humidity: data.hum ?? null,
      light_lux: data.light?.lux ?? null,
      light_percent: data.light?.percent ?? data.light?.['%'] ?? null,
      light_condition: data.light?.condition ?? null,
      battery_level: data.battery?.percent ?? data.battery?.level ?? null,
      battery_voltage: data.battery?.voltage ?? null,
      recorded_at: recordedAt,
      ingested_at: new Date().toISOString(),
      clock_invalid: clockInvalid
    },
    { onConflict: 'device_id,recorded_at', ignoreDuplicates: true }
  );

  if (error) {
    console.error(`[READINGS] upsert error (${deviceId}): ${error.message}`);
  } else {
    console.log(`[READINGS] upsert OK (${deviceId}, clock_invalid=${clockInvalid})`);
    const reading = {
      soil_moisture: data.soil?.percent ?? data.soil_moisture ?? null,
      temperature:   data.temp ?? null,
      humidity:      data.hum ?? null,
      light_lux:     data.light?.lux ?? null,
      battery_level: data.battery?.percent ?? data.battery?.level ?? null,
    };
    processAnalytics(deviceId, device.owner_id, device.plant_id ?? null, reading);

    // Motor de alertas: evaluar si la planta tiene especie vinculada
    if (device.plant_id) {
      const { data: plant } = await supabase
        .from('plants')
        .select('species_id, plant_species(soil_min_pct, soil_max_pct, light_min_lux, light_max_lux, ideal_temp_min, ideal_temp_max, ideal_humidity_min, ideal_humidity_max)')
        .eq('id', device.plant_id)
        .maybeSingle();

      const species = plant?.plant_species ?? null;
      await evaluateAlerts(deviceId, device.plant_id, device.owner_id, reading, species, supabase);
    }
  }
}

async function handleStatusData(deviceId, data) {
  const newIp = data.wifi_ip ?? null;
  const cachedIp = lastKnownIp.get(deviceId);

  if (newIp && cachedIp && newIp !== cachedIp) {
    await appendIpHistory(deviceId, cachedIp, data.wifi_ssid);
  }
  if (newIp) {
    lastKnownIp.set(deviceId, newIp);
  }

  const updateFields = {
    last_seen: new Date().toISOString(),
    device_state: 'linked'
  };

  if (data.wifi_status !== undefined) updateFields.wifi_status = data.wifi_status;
  if (data.wifi_ssid !== undefined) updateFields.wifi_ssid = data.wifi_ssid;
  if (newIp) updateFields.wifi_ip = newIp;
  if (data.sensor_health !== undefined) updateFields.sensor_health = data.sensor_health;
  if (data.device_type) updateFields.device_type = data.device_type;
  if (data.device_model) updateFields.device_model = data.device_model;
  if (data.wake_interval_ms) updateFields.sample_interval_ms = data.wake_interval_ms;

  const { error } = await supabase.from('devices').update(updateFields).eq('device_id', deviceId);
  if (error) {
    console.error(`[SUPABASE] status update error (${deviceId}): ${error.message}`);
  } else {
    console.log(`[SUPABASE] status OK (${deviceId})`);
  }
}

async function appendIpHistory(deviceId, oldIp, ssid) {
  const { data: device, error: fetchError } = await supabase
    .from('devices')
    .select('ip_history')
    .eq('device_id', deviceId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[SUPABASE] ip_history fetch error (${deviceId}): ${fetchError.message}`);
    return;
  }

  const history = Array.isArray(device?.ip_history) ? device.ip_history : [];
  history.push({ ip: oldIp, ssid: ssid ?? null, until: new Date().toISOString() });

  const { error } = await supabase
    .from('devices')
    .update({ ip_history: history })
    .eq('device_id', deviceId);

  if (error) {
    console.error(`[SUPABASE] ip_history update error (${deviceId}): ${error.message}`);
  }
}

function getLocalIpv4() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const net of entries) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

async function publishBridgeStatus() {
  const now = new Date().toISOString();
  const ip = getLocalIpv4();

  await ensureDeviceExists(BRIDGE_DEVICE_ID, {
    device_type: 'bridge',
    device_model: 'Raspberry Pi'
  });

  const update = {
    device_type: 'bridge',
    device_model: 'Raspberry Pi',
    device_state: 'linked',
    last_seen: now,
    sensor_health: 'ok',
    wifi_status: mqttClient.connected ? 'connected' : 'disconnected'
  };
  if (ip) update.wifi_ip = ip;

  const { error } = await supabase
    .from('devices')
    .update(update)
    .eq('device_id', BRIDGE_DEVICE_ID);

  if (error) {
    console.error(`[BRIDGE-STATUS] Update error (${BRIDGE_DEVICE_ID}): ${error.message}`);
  } else {
    console.log(`[BRIDGE-STATUS] OK (${BRIDGE_DEVICE_ID})`);
  }
}

setInterval(() => {
  publishBridgeStatus().catch((err) => {
    console.error('[BRIDGE-STATUS] Interval publish error:', err.message);
  });
}, BRIDGE_STATUS_INTERVAL_MS);

// Heartbeat: marca offline cualquier dispositivo sin STATUS en los últimos 3 minutos
const OFFLINE_TIMEOUT_MS = 3 * 60 * 1000;
setInterval(async () => {
  const cutoff = new Date(Date.now() - OFFLINE_TIMEOUT_MS).toISOString();
  const { error } = await supabase
    .from('devices')
    .update({ wifi_status: 'disconnected' })
    .lt('last_seen', cutoff)
    .neq('device_id', BRIDGE_DEVICE_ID)
    .eq('wifi_status', 'connected');
  if (error) console.error('[HEARTBEAT] Error:', error.message);
  else console.log('[HEARTBEAT] Check offline devices OK');
}, 60000);

process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Closing MQTT connection...');
  mqttClient.end();
  process.exit(0);
});

console.log('[BRIDGE] Waiting for MQTT messages...\n');
