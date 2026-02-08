/**
 * Kittypau Bridge v2.1 - MQTT to Supabase (Schema Unificado)
 * Escucha mensajes MQTT de los dispositivos y los almacena en Supabase
 *
 * v2.1: sensor_readings usa device_code directamente como FK
 *       Sin cache UUID, sin lookups — escribe KPCL0039 directo
 * v2.0: Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// ============ CONFIGURACIÓN ============
const USE_WILDCARD = true;
const DEVICES = ['KPCL0035', 'KPCL0036', 'KPCL0037'];
const DEVICE_PREFIX = 'KPCL';

// ============ SUPABASE ============
// Usa SUPABASE_SERVICE_KEY (service_role) para bypass de RLS.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

// Set de device_codes ya registrados (evita queries repetidos)
const knownDevices = new Set();

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
console.log('   Kittypau Bridge v2.1');
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
    const [deviceCode, type] = topic.split('/');

    if (USE_WILDCARD && DEVICE_PREFIX && !deviceCode.startsWith(DEVICE_PREFIX)) {
      return;
    }

    const data = JSON.parse(message.toString());

    console.log(`\n[${timestamp}] ${topic}`);
    console.log(JSON.stringify(data, null, 2));

    // Auto-registrar dispositivo si es la primera vez que lo vemos
    await ensureDeviceExists(deviceCode);

    if (type === 'SENSORS') {
      await handleSensorData(deviceCode, data);
    } else if (type === 'STATUS') {
      await handleStatusData(deviceCode, data);
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
async function ensureDeviceExists(deviceCode) {
  if (knownDevices.has(deviceCode)) return;

  const { data } = await supabase
    .from('devices')
    .select('device_code')
    .eq('device_code', deviceCode)
    .single();

  if (data) {
    knownDevices.add(deviceCode);
    return;
  }

  // No existe: auto-registrar
  const { error } = await supabase
    .from('devices')
    .insert({
      device_code: deviceCode,
      device_state: 'factory',
      last_seen: new Date().toISOString()
    });

  if (error) {
    console.error(`[SUPABASE] Error auto-registrando ${deviceCode}: ${error.message}`);
  } else {
    console.log(`[SUPABASE] + Dispositivo ${deviceCode} auto-registrado (factory)`);
    knownDevices.add(deviceCode);
  }
}

// ============ HANDLERS ============

async function handleSensorData(deviceCode, data) {
  const { error } = await supabase
    .from('sensor_readings')
    .insert({
      device_code: deviceCode,
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
    console.log(`[SUPABASE] ✓ Sensor data guardado para ${deviceCode}`);
  }
}

async function handleStatusData(deviceCode, data) {
  // Actualiza campos IoT directamente por device_code (sin UUID)
  const { error } = await supabase
    .from('devices')
    .update({
      last_seen: new Date().toISOString(),
      wifi_status: data.wifi_status ?? null,
      wifi_ssid: data.wifi_ssid ?? null,
      wifi_ip: data.wifi_ip ?? null,
      sensor_health: data.sensor_health ?? null
    })
    .eq('device_code', deviceCode);

  if (error) {
    console.error(`[SUPABASE] Error actualizando device: ${error.message}`);
  } else {
    const mqttStatus = data[deviceCode] || 'Unknown';
    console.log(`[SUPABASE] ✓ Status actualizado para ${deviceCode} (${mqttStatus})`);
  }
}

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Cerrando conexiones...');
  mqttClient.end();
  process.exit(0);
});

console.log('[BRIDGE] Esperando mensajes MQTT...\n');
