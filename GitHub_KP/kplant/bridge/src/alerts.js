/**
 * alerts.js — Motor de alertas KPlant
 * Evalúa lecturas de sensores contra umbrales de la especie vinculada a la planta.
 * Escribe en la tabla system_events cuando detecta condiciones fuera de rango.
 */

// Tiempo mínimo entre alertas del mismo tipo por dispositivo (evita spam)
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hora

// Cache en memoria: deviceId -> { eventType -> lastFiredAt }
const alertCooldowns = new Map();

/**
 * Evalúa una lectura de sensores contra los umbrales de la especie.
 * @param {string} deviceId
 * @param {string|null} plantId
 * @param {string|null} ownerId
 * @param {object} reading  { soil_moisture, temperature, humidity, light_lux, battery_level }
 * @param {object} species  umbrales de plant_species (puede ser null si no hay especie vinculada)
 * @param {object} supabase  cliente Supabase con service_role
 */
async function evaluateAlerts(deviceId, plantId, ownerId, reading, species, supabase) {
  if (!ownerId || !species) return;  // sin dueño o sin especie → no hay alertas

  const checks = buildChecks(reading, species);

  for (const check of checks) {
    if (!check.triggered) continue;
    if (isOnCooldown(deviceId, check.type)) continue;

    await fireAlert(deviceId, plantId, ownerId, check, supabase);
    setCooldown(deviceId, check.type);
  }
}

function buildChecks(reading, species) {
  const checks = [];
  const { soil_moisture, temperature, humidity, light_lux } = reading;

  // Suelo seco
  if (soil_moisture != null && species.soil_min_pct != null) {
    checks.push({
      type: 'soil_dry',
      triggered: soil_moisture < species.soil_min_pct,
      severity: soil_moisture < species.soil_min_pct * 0.6 ? 'critical' : 'warning',
      message: `Suelo muy seco: ${Math.round(soil_moisture)}% (mínimo ${species.soil_min_pct}%). Tu planta necesita agua.`,
      sensor_value: soil_moisture,
      threshold: species.soil_min_pct,
    });
  }

  // Suelo encharcado
  if (soil_moisture != null && species.soil_max_pct != null) {
    checks.push({
      type: 'soil_wet',
      triggered: soil_moisture > species.soil_max_pct,
      severity: 'warning',
      message: `Suelo demasiado húmedo: ${Math.round(soil_moisture)}% (máximo ${species.soil_max_pct}%). Riesgo de pudrición radicular.`,
      sensor_value: soil_moisture,
      threshold: species.soil_max_pct,
    });
  }

  // Temperatura alta
  if (temperature != null && species.ideal_temp_max != null) {
    checks.push({
      type: 'temp_high',
      triggered: temperature > species.ideal_temp_max + 3,
      severity: temperature > species.ideal_temp_max + 8 ? 'critical' : 'warning',
      message: `Temperatura alta: ${temperature.toFixed(1)}°C (máximo ideal ${species.ideal_temp_max}°C). Aleja de fuentes de calor.`,
      sensor_value: temperature,
      threshold: species.ideal_temp_max,
    });
  }

  // Temperatura baja
  if (temperature != null && species.ideal_temp_min != null) {
    checks.push({
      type: 'temp_low',
      triggered: temperature < species.ideal_temp_min - 2,
      severity: temperature < species.ideal_temp_min - 6 ? 'critical' : 'warning',
      message: `Temperatura baja: ${temperature.toFixed(1)}°C (mínimo ideal ${species.ideal_temp_min}°C). Protege del frío.`,
      sensor_value: temperature,
      threshold: species.ideal_temp_min,
    });
  }

  // Humedad ambiental baja
  if (humidity != null && species.ideal_humidity_min != null) {
    checks.push({
      type: 'humidity_low',
      triggered: humidity < species.ideal_humidity_min - 10,
      severity: 'info',
      message: `Humedad del aire baja: ${Math.round(humidity)}% (mínimo ideal ${species.ideal_humidity_min}%). Considera vaporizador o bandeja húmeda.`,
      sensor_value: humidity,
      threshold: species.ideal_humidity_min,
    });
  }

  // Luz insuficiente
  if (light_lux != null && species.light_min_lux != null) {
    checks.push({
      type: 'light_low',
      triggered: light_lux < species.light_min_lux * 0.5,
      severity: light_lux < species.light_min_lux * 0.2 ? 'critical' : 'warning',
      message: `Luz insuficiente: ${Math.round(light_lux)} lux (mínimo ${species.light_min_lux} lux). Acerca la planta a la ventana.`,
      sensor_value: light_lux,
      threshold: species.light_min_lux,
    });
  }

  return checks;
}

async function fireAlert(deviceId, plantId, ownerId, check, supabase) {
  const { error } = await supabase.from('system_events').insert({
    device_id: deviceId,
    plant_id: plantId ?? null,
    owner_id: ownerId,
    event_type: check.type,
    severity: check.severity,
    message: check.message,
    sensor_value: check.sensor_value,
    threshold: check.threshold,
    resolved: false,
  });

  if (error) {
    console.error(`[ALERTS] Insert error (${deviceId} ${check.type}): ${error.message}`);
  } else {
    console.log(`[ALERTS] ${check.severity.toUpperCase()} ${check.type} for ${deviceId}: ${check.message}`);
  }
}

function isOnCooldown(deviceId, eventType) {
  const key = `${deviceId}:${eventType}`;
  const last = alertCooldowns.get(key);
  if (!last) return false;
  return Date.now() - last < ALERT_COOLDOWN_MS;
}

function setCooldown(deviceId, eventType) {
  alertCooldowns.set(`${deviceId}:${eventType}`, Date.now());
}

module.exports = { evaluateAlerts };
