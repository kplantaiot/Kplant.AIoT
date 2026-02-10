/**
 * Kittypau Bridge v2.2 - MQTT to Supabase (Schema Unificado)
 * Escucha mensajes MQTT de los dispositivos y los almacena en Supabase
 *
 * v2.2: Registra cambios de IP en ip_history (JSONB) de devices
 * v2.1: sensor_readings usa device_id (TEXT) directamente como FK
 * v2.0: Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// ============ CONFIGURACIÓN ============
const USE_WILDCARD = true;
const DEVICES = ['KPCL0031', 'KPCL0033', 'KPCL0035', 'KPCL0036', 'KPCL0037', 'KPCL0038', 'KPCL0040', 'KPCL0041'];
const DEVICE_PREFIX = 'KPCL';

// ============ SUPABASE ============
// Usa SUPABASE_SERVICE_KEY (service_role) para bypass de RLS.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !supabaseKey) {
  console.error('[SUPABASE] Falta SUPABASE_URL o key en variables de entorno.');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

// Set de device_ids ya registrados (evita queries repetidos)
const knownDevices = new Set();

// Cache de ultima IP conocida por dispositivo (para detectar cambios)
const lastKnownIp = new Map();

// ============ MQTT ============
const mqttOptions = {
  host: process.env.MQTT_BROKER,
  port: parseInt(process.env.MQTT_PORT),
  protocol: 'mqtts',
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  rejectUnauthorized: false
};

console.log('=================================');
console.log('   Kittypau Bridge v2.2');
console.log('=================================');
console.log(`MQTT Broker: ${process.env.MQTT_BROKER}`);
console.log(`Supabase: ${process.env.SUPABASE_URL}`);
console.log(`Modo: ${USE_WILDCARD ? 'Wildcard (+/SENSORS, +/STATUS)' : 'Manual (' + DEVICES.join(', ') + ')'}`);
console.log('=================================\n');

const mqttClient = mqtt.connect(mqttOptions);

// ============ EVENTOS MQTT ============
mqttClient.on('connect', () => {
  console.log('[MQTT] Conectado a HiveMQ Cloud');

  if (USE_WILDCARD) {
    mqttClient.subscribe('+/SENSORS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/SENSORS (wildcard)');
    });
    mqttClient.subscribe('+/STATUS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/STATUS (wildcard)');
    });
  } else {
    DEVICES.forEach(device => {
      mqttClient.subscribe(`${device}/SENSORS`, (err) => {
        if (!err) console.log(`[MQTT] Suscrito a ${device}/SENSORS`);
      });
      mqttClient.subscribe(`${device}/STATUS`, (err) => {
        if (!err) console.log(`[MQTT] Suscrito a ${device}/STATUS`);
      });
    });
  }
});

mqttClient.on('message', async (topic, message) => {
  const timestamp = new Date().toLocaleTimeString();

  try {
    const [deviceId, type] = topic.split('/');

    if (USE_WILDCARD && DEVICE_PREFIX && !deviceId.startsWith(DEVICE_PREFIX)) {
      return;
    }

    const data = JSON.parse(message.toString());

    console.log(`\n[${timestamp}] ${topic}`);
    console.log(JSON.stringify(data, null, 2));

    // Auto-registrar dispositivo si es la primera vez que lo vemos
    await ensureDeviceExists(deviceId);

    if (type === 'SENSORS') {
      await handleSensorData(deviceId, data);
    } else if (type === 'STATUS') {
      await handleStatusData(deviceId, data);
    }
  } catch (err) {
    console.error(`[ERROR] Procesando mensaje: ${err.message}`);
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('offline', () => {
  console.log('[MQTT] Desconectado - intentando reconectar...');
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconectando...');
});

// ============ AUTO-REGISTRO ============

/**
 * Asegura que el dispositivo existe en la tabla devices.
 * Si no existe, lo crea con estado 'factory'.
 * Usa un Set en memoria para no repetir queries.
 */
async function ensureDeviceExists(deviceId) {
  if (knownDevices.has(deviceId)) return;

  const { data } = await supabase
    .from('devices')
    .select('device_id')
    .eq('device_id', deviceId)
    .single();

  if (data) {
    knownDevices.add(deviceId);
    return;
  }

  // No existe: auto-registrar
  const { error } = await supabase
    .from('devices')
    .insert({
      device_id: deviceId,
      device_state: 'factory',
      last_seen: new Date().toISOString()
    });

  if (error) {
    console.error(`[SUPABASE] Error auto-registrando ${deviceId}: ${error.message}`);
  } else {
    console.log(`[SUPABASE] + Dispositivo ${deviceId} auto-registrado (factory)`);
    knownDevices.add(deviceId);
  }
}

// ============ HANDLERS ============

async function handleSensorData(deviceId, data) {
  const { error } = await supabase
    .from('sensor_readings')
    .insert({
      device_id: deviceId,
      weight_grams: data.weight ?? null,
      temperature: data.temp ?? null,
      humidity: data.hum ?? null,
      light_lux: data.light?.lux ?? null,
      light_percent: data.light?.['%'] ?? null,
      light_condition: data.light?.condition ?? null,
      device_timestamp: data.timestamp ?? null
    });

  if (error) {
    console.error(`[SUPABASE] Error insertando sensor: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Sensor data guardado para ${deviceId}`);
  }
}

async function handleStatusData(deviceId, data) {
  const newIp = data.wifi_ip ?? null;
  const cachedIp = lastKnownIp.get(deviceId);

  // Detectar cambio de IP y registrar en ip_history
  if (newIp && cachedIp && newIp !== cachedIp) {
    await appendIpHistory(deviceId, cachedIp, data.wifi_ssid);
    console.log(`[IP-HISTORY] ${deviceId}: ${cachedIp} → ${newIp}`);
  }

  if (newIp) {
    lastKnownIp.set(deviceId, newIp);
  }

  // Actualiza campos IoT directamente por device_id (sin UUID)
  const { error } = await supabase
    .from('devices')
    .update({
      last_seen: new Date().toISOString(),
      wifi_status: data.wifi_status ?? null,
      wifi_ssid: data.wifi_ssid ?? null,
      wifi_ip: newIp,
      sensor_health: data.sensor_health ?? null,
      device_type: data.device_type ?? null
    })
    .eq('device_id', deviceId);

  if (error) {
    console.error(`[SUPABASE] Error actualizando device: ${error.message}`);
  } else {
    const mqttStatus = data[deviceId] || 'Unknown';
    console.log(`[SUPABASE] ✓ Status actualizado para ${deviceId} (${mqttStatus})`);
  }
}

async function appendIpHistory(deviceId, oldIp, ssid) {
  // Leer ip_history actual
  const { data: device } = await supabase
    .from('devices')
    .select('ip_history')
    .eq('device_id', deviceId)
    .single();

  const history = device?.ip_history ?? [];
  history.push({
    ip: oldIp,
    ssid: ssid ?? null,
    until: new Date().toISOString()
  });

  const { error } = await supabase
    .from('devices')
    .update({ ip_history: history })
    .eq('device_id', deviceId);

  if (error) {
    console.error(`[SUPABASE] Error guardando ip_history: ${error.message}`);
  }
}

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Cerrando conexiones...');
  mqttClient.end();
  process.exit(0);
});

console.log('[BRIDGE] Esperando mensajes MQTT...\n');
