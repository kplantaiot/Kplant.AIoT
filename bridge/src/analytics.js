// analytics.js - KPlant Analytics Processor
// Escribe en la DB separada Kplant_Analytics (killtbpeuinqvyxpbtbt.supabase.co)
// Dos funciones principales:
//   1. updateDailySummary → upsert incremental de min/max/avg por día
//   2. detectWatering    → detecta riego cuando soil sube ≥15% en ≤30 min

const { createClient } = require('@supabase/supabase-js');

if (!process.env.ANALYTICS_SUPABASE_URL || !process.env.ANALYTICS_SUPABASE_KEY) {
  console.warn('[ANALYTICS] ANALYTICS_SUPABASE_URL o ANALYTICS_SUPABASE_KEY no configurados — analytics desactivado');
}

const analyticsClient = (process.env.ANALYTICS_SUPABASE_URL && process.env.ANALYTICS_SUPABASE_KEY)
  ? createClient(process.env.ANALYTICS_SUPABASE_URL, process.env.ANALYTICS_SUPABASE_KEY)
  : null;

// Memoria en proceso: última lectura de suelo por dispositivo
// { deviceId -> { soil: number, ts: Date } }
const lastSoil = new Map();

// ── Helpers ──────────────────────────────────────────────────

function todayDate() {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

function incAvg(oldAvg, oldCount, newVal) {
  if (newVal === null || newVal === undefined) return oldAvg;
  if (oldAvg === null || oldAvg === undefined) return newVal;
  return (oldAvg * oldCount + newVal) / (oldCount + 1);
}

function safeMin(a, b) {
  if (a === null || a === undefined) return b;
  if (b === null || b === undefined) return a;
  return Math.min(a, b);
}

function safeMax(a, b) {
  if (a === null || a === undefined) return b;
  if (b === null || b === undefined) return a;
  return Math.max(a, b);
}

// ── 1. Resumen diario ─────────────────────────────────────────

async function updateDailySummary(deviceId, ownerId, plantId, r) {
  if (!analyticsClient) return;

  const today = todayDate();

  const { data: existing, error: fetchErr } = await analyticsClient
    .from('plant_daily_summary')
    .select('*')
    .eq('device_id', deviceId)
    .eq('summary_date', today)
    .maybeSingle();

  if (fetchErr) {
    console.error(`[ANALYTICS] daily_summary fetch error (${deviceId}): ${fetchErr.message}`);
    return;
  }

  if (!existing) {
    // Primera lectura del día → INSERT
    const { error } = await analyticsClient.from('plant_daily_summary').insert({
      owner_id:      ownerId,
      plant_id:      plantId ?? null,
      device_id:     deviceId,
      summary_date:  today,
      temp_min:      r.temperature,
      temp_max:      r.temperature,
      temp_avg:      r.temperature,
      humidity_min:  r.humidity,
      humidity_max:  r.humidity,
      humidity_avg:  r.humidity,
      soil_min:      r.soil_moisture,
      soil_max:      r.soil_moisture,
      soil_avg:      r.soil_moisture,
      lux_min:       r.light_lux,
      lux_max:       r.light_lux,
      lux_avg:       r.light_lux,
      battery_avg:   r.battery_level,
      battery_min:   r.battery_level,
      readings_count: 1,
      processed_at:  new Date().toISOString(),
    });
    if (error) console.error(`[ANALYTICS] daily_summary insert error (${deviceId}): ${error.message}`);
    else console.log(`[ANALYTICS] daily_summary nuevo día (${deviceId})`);
    return;
  }

  // Lectura siguiente → UPDATE incremental
  const n = existing.readings_count;

  const { error } = await analyticsClient
    .from('plant_daily_summary')
    .update({
      temp_min:      safeMin(existing.temp_min, r.temperature),
      temp_max:      safeMax(existing.temp_max, r.temperature),
      temp_avg:      incAvg(existing.temp_avg, n, r.temperature),
      humidity_min:  safeMin(existing.humidity_min, r.humidity),
      humidity_max:  safeMax(existing.humidity_max, r.humidity),
      humidity_avg:  incAvg(existing.humidity_avg, n, r.humidity),
      soil_min:      safeMin(existing.soil_min, r.soil_moisture),
      soil_max:      safeMax(existing.soil_max, r.soil_moisture),
      soil_avg:      incAvg(existing.soil_avg, n, r.soil_moisture),
      lux_min:       safeMin(existing.lux_min, r.light_lux),
      lux_max:       safeMax(existing.lux_max, r.light_lux),
      lux_avg:       incAvg(existing.lux_avg, n, r.light_lux),
      battery_avg:   incAvg(existing.battery_avg, n, r.battery_level),
      battery_min:   safeMin(existing.battery_min, r.battery_level),
      readings_count: n + 1,
      processed_at:  new Date().toISOString(),
    })
    .eq('device_id', deviceId)
    .eq('summary_date', today);

  if (error) console.error(`[ANALYTICS] daily_summary update error (${deviceId}): ${error.message}`);
}

// ── 2. Detección de riego ─────────────────────────────────────

async function detectWatering(deviceId, ownerId, plantId, r) {
  if (!analyticsClient) return;

  const currentSoil = r.soil_moisture;
  if (currentSoil === null || currentSoil === undefined) return;

  const prev = lastSoil.get(deviceId);
  lastSoil.set(deviceId, { soil: currentSoil, ts: new Date() });

  if (!prev) return;

  const delta = currentSoil - prev.soil;
  const minSinceLastReading = (Date.now() - prev.ts.getTime()) / 60000;

  // Umbral: suelo sube ≥15% en ≤30 minutos
  if (delta < 15 || minSinceLastReading > 30) return;

  const intensity = delta < 20 ? 'light' : delta <= 40 ? 'normal' : 'heavy';

  console.log(`[ANALYTICS] Riego detectado (${deviceId}): +${delta}% suelo → ${intensity}`);

  const { error: insertErr } = await analyticsClient.from('watering_events').insert({
    owner_id:             ownerId,
    plant_id:             plantId ?? null,
    device_id:            deviceId,
    detected_at:          new Date().toISOString(),
    soil_before:          prev.soil,
    soil_after:           currentSoil,
    soil_delta:           delta,
    intensity,
    temp_at_watering:     r.temperature ?? null,
    humidity_at_watering: r.humidity ?? null,
  });

  if (insertErr) {
    console.error(`[ANALYTICS] watering_events insert error (${deviceId}): ${insertErr.message}`);
    return;
  }

  // Incrementar watering_count en el resumen de hoy
  const today = todayDate();
  const { data: summary } = await analyticsClient
    .from('plant_daily_summary')
    .select('watering_count')
    .eq('device_id', deviceId)
    .eq('summary_date', today)
    .maybeSingle();

  if (summary) {
    await analyticsClient
      .from('plant_daily_summary')
      .update({ watering_count: (summary.watering_count ?? 0) + 1 })
      .eq('device_id', deviceId)
      .eq('summary_date', today);
  }
}

// ── API pública ───────────────────────────────────────────────

async function processAnalytics(deviceId, ownerId, plantId, reading) {
  if (!analyticsClient) return;
  try {
    await Promise.all([
      updateDailySummary(deviceId, ownerId, plantId, reading),
      detectWatering(deviceId, ownerId, plantId, reading),
    ]);
  } catch (err) {
    console.error(`[ANALYTICS] processAnalytics error (${deviceId}): ${err.message}`);
  }
}

module.exports = { processAnalytics };
