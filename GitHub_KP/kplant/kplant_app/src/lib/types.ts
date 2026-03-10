export type Plant = {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  location: string | null;
  photo_url: string | null;
  plant_state: string;
  created_at: string;
};

export type Device = {
  id: string;
  device_id: string;
  device_type: string | null;
  device_state: string;
  device_model: string | null;
  owner_id: string | null;
  plant_id: string | null;
  wifi_status: string | null;
  wifi_ssid: string | null;
  wifi_ip: string | null;
  sensor_health: string | null;
  last_seen: string | null;
};

export type SensorReading = {
  id: number;
  device_id: string;
  soil_moisture: number | null;
  soil_condition: string | null;
  temperature: number | null;
  humidity: number | null;
  light_lux: number | null;
  light_percent: number | null;
  light_condition: string | null;
  battery_level: number | null;
  battery_voltage: number | null;
  device_timestamp: string | null;
  created_at: string;
};

export type PlantWithData = Plant & {
  device: Device | null;
  reading: SensorReading | null;
};

// --- Interpretación ---

export function soilLabel(pct: number | null): { label: string; color: string } {
  if (pct === null) return { label: "Sin datos", color: "muted" };
  if (pct < 30) return { label: "Necesita agua", color: "danger" };
  if (pct < 70) return { label: "En su punto", color: "success" };
  return { label: "Bien regada", color: "info" };
}

export function lightLabel(lux: number | null): string {
  if (lux === null) return "Sin datos";
  if (lux < 100) return "Muy oscuro";
  if (lux < 500) return "Poca luz";
  if (lux < 2000) return "Sombra parcial";
  if (lux < 5000) return "Buena luz";
  return "Pleno sol";
}

export function plantSummary(reading: SensorReading | null): string {
  if (!reading) return "Sin lecturas aún";
  if ((reading.soil_moisture ?? 50) < 30) return "Tu planta necesita agua";
  if ((reading.light_lux ?? 1000) < 200) return "Necesita más luz";
  if ((reading.temperature ?? 20) > 32) return "El ambiente está muy caliente";
  if ((reading.humidity ?? 50) < 25) return "El ambiente está muy seco";
  return "Tu planta está bien";
}

export function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 min
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "nunca";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}
