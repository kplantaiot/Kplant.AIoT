/**
 * Kittypau Bridge - MQTT to Supabase
 * Escucha mensajes MQTT de los dispositivos y los almacena en Supabase
 */

require('dotenv').config();
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// ============ CONFIGURACIÓN ============
// Usar wildcard '+' para detectar automáticamente cualquier dispositivo
// O listar dispositivos específicos: ['KPCL0035', 'KPCL0036', 'KPCL0037']
const USE_WILDCARD = true;  // true = detectar automático, false = lista manual
const DEVICES = ['KPCL0035', 'KPCL0036', 'KPCL0037'];  // Solo si USE_WILDCARD = false
const DEVICE_PREFIX = 'KPCL';  // Prefijo para filtrar dispositivos (opcional)

// ============ SUPABASE ============
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
console.log('   Kittypau Bridge v1.0');
console.log('=================================');
console.log(`MQTT Broker: ${process.env.MQTT_BROKER}`);
console.log(`Supabase: ${process.env.SUPABASE_URL}`);
console.log(`Dispositivos: ${DEVICES.join(', ')}`);
console.log('=================================\n');

const mqttClient = mqtt.connect(mqttOptions);

// ============ EVENTOS MQTT ============
mqttClient.on('connect', () => {
  console.log('[MQTT] Conectado a HiveMQ Cloud');

  if (USE_WILDCARD) {
    // Suscripción wildcard: detecta cualquier dispositivo automáticamente
    mqttClient.subscribe('+/SENSORS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/SENSORS (wildcard)');
    });
    mqttClient.subscribe('+/STATUS', (err) => {
      if (!err) console.log('[MQTT] Suscrito a +/STATUS (wildcard)');
    });
  } else {
    // Suscripción manual: solo dispositivos listados
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

    // Filtrar por prefijo si estamos en modo wildcard
    if (USE_WILDCARD && DEVICE_PREFIX && !deviceId.startsWith(DEVICE_PREFIX)) {
      return;
    }

    const data = JSON.parse(message.toString());

    console.log(`\n[${timestamp}] ${topic}`);
    console.log(JSON.stringify(data, null, 2));

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

// ============ HANDLERS ============
async function ensureDeviceExists(deviceId) {
  const { error } = await supabase
    .from('devices')
    .upsert({ id: deviceId, last_seen: new Date().toISOString() }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    console.error(`[SUPABASE] Error registrando dispositivo ${deviceId}: ${error.message}`);
    return false;
  }
  return true;
}

async function handleSensorData(deviceId, data) {
  // Auto-registrar dispositivo si no existe (evita FK error)
  const exists = await ensureDeviceExists(deviceId);
  if (!exists) return;

  const record = {
    device_id: deviceId,
    weight: data.weight,
    temp: data.temp,
    hum: data.hum,
    light_lux: data.light?.lux ?? null,
    light_percent: data.light?.['%'] ?? null,
    light_condition: data.light?.condition ?? null
  };

  const { error } = await supabase
    .from('sensor_readings')
    .insert(record);

  if (error) {
    console.error(`[SUPABASE] Error insertando sensor: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Sensor data guardado para ${deviceId}`);
  }
}

async function handleStatusData(deviceId, data) {
  // Extraer el status del dispositivo (la key es dinámica: KPCL0036, KPCL0037, etc.)
  const deviceStatus = data[deviceId] || 'Unknown';

  const record = {
    id: deviceId,
    last_seen: new Date().toISOString(),
    wifi_status: data.wifi_status,
    wifi_ssid: data.wifi_ssid,
    wifi_ip: data.wifi_ip,
    status: deviceStatus,
    sensor_health: data.sensor_health
  };

  const { error } = await supabase
    .from('devices')
    .upsert(record, { onConflict: 'id' });

  if (error) {
    console.error(`[SUPABASE] Error actualizando device: ${error.message}`);
  } else {
    console.log(`[SUPABASE] ✓ Status actualizado para ${deviceId} (${deviceStatus})`);
  }
}

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGINT', () => {
  console.log('\n[BRIDGE] Cerrando conexiones...');
  mqttClient.end();
  process.exit(0);
});

console.log('[BRIDGE] Esperando mensajes MQTT...\n');
