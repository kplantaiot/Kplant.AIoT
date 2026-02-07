/**
 * Kittypau Bridge v2.0 - MQTT to Supabase (Schema Unificado)
 * Escucha mensajes MQTT de los dispositivos y los almacena en Supabase
 *
 * Cambios v2.0:
 *  - devices usa UUID como PK, device_code como UNIQUE TEXT
 *  - Mapeo de campos: weight→weight_grams, temp→temperature, hum→humidity
 *  - Cache en memoria device_code→UUID para evitar queries repetidos
 *  - Guarda device_timestamp del ESP8266
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
// El bridge es un proceso servidor confiable que necesita INSERT directo.
// Si no existe, fallback a SUPABASE_KEY (compatibilidad).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

// ============ CACHE ============
// Mapeo device_code → UUID para no consultar Supabase en cada mensaje
const deviceCache = new Map();

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
console.log('   Kittypau Bridge v2.0');
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

// ============ DEVICE LOOKUP ============

/**
 * Busca el UUID de un dispositivo por su device_code.
 * Si no existe, lo auto-registra con estado 'factory'.
 * Usa cache en memoria para evitar queries repetidos.
 */
async function getDeviceUUID(deviceCode) {
  // Revisar cache primero
  if (deviceCache.has(deviceCode)) {
    return deviceCache.get(deviceCode);
  }

  // Buscar en Supabase por device_code
  const { data, error } = await supabase
    .from('devices')
    .select('id')
    .eq('device_code', deviceCode)
    .single();

  if (data) {
    deviceCache.set(deviceCode, data.id);
    return data.id;
  }

  // No existe: auto-registrar con estado factory (sin owner, sin pet)
  if (error && error.code === 'PGRST116') {
    const { data: newDevice, error: insertError } = await supabase
      .from('devices')
      .insert({
        device_code: deviceCode,
        device_state: 'factory',
        last_seen: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`[SUPABASE] Error auto-registrando ${deviceCode}: ${insertError.message}`);
      return null;
    }

    console.log(`[SUPABASE] + Dispositivo ${deviceCode} auto-registrado (factory)`);
    deviceCache.set(deviceCode, newDevice.id);
    return newDevice.id;
  }

  console.error(`[SUPABASE] Error buscando ${deviceCode}: ${error.message}`);
  return null;
}

// ============ HANDLERS ============

async function handleSensorData(deviceCode, data) {
  const deviceId = await getDeviceUUID(deviceCode);
  if (!deviceId) return;

  const record = {
    device_id: deviceId,
    weight_grams: data.weight ?? null,
    temperature: data.temp ?? null,
    humidity: data.hum ?? null,
    light_lux: data.light?.lux ?? null,
    light_percent: data.light?.['%'] ?? null,
    light_condition: data.light?.condition ?? null,
    device_timestamp: data.timestamp ?? null
  };

  const { error } = await supabase
    .from('sensor_readings')
    .insert(record);

  if (error) {
    console.error(`[SUPABASE] Error insertando sensor: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Sensor data guardado para ${deviceCode}`);
  }
}

async function handleStatusData(deviceCode, data) {
  const deviceId = await getDeviceUUID(deviceCode);
  if (!deviceId) return;

  // El bridge actualiza campos IoT pero NO modifica device_state
  // (device_state es controlado por la app: factory→claimed→linked)
  // Usa UPDATE (no upsert) porque getDeviceUUID ya garantiza que el device existe
  const { error } = await supabase
    .from('devices')
    .update({
      last_seen: new Date().toISOString(),
      wifi_status: data.wifi_status ?? null,
      wifi_ssid: data.wifi_ssid ?? null,
      wifi_ip: data.wifi_ip ?? null,
      sensor_health: data.sensor_health ?? null
    })
    .eq('id', deviceId);

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
