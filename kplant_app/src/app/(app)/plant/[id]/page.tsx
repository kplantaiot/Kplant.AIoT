import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { soilLabel, lightLabel } from "@/lib/types";
import { PlantCharts } from "./PlantCharts";
import { PlantActions } from "./PlantActions";
import { PlantRangeSelector } from "./PlantRangeSelector";

const RANGE_CONFIG: Record<string, { hours: number; limit: number }> = {
  "1h":  { hours: 1,   limit: 60  },
  "6h":  { hours: 6,   limit: 200 },
  "24h": { hours: 24,  limit: 288 },
  "7d":  { hours: 168, limit: 500 },
};

export default async function PlantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { id } = await params;
  const { range: rawRange } = await searchParams;
  const range = rawRange && RANGE_CONFIG[rawRange] ? rawRange : "6h";
  const { hours, limit } = RANGE_CONFIG[range];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: plant } = await supabase
    .from("plants")
    .select("*, devices(id, device_id, last_seen, sensor_health)")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!plant) notFound();

  const device = plant.devices?.[0] ?? null;

  const readings: any[] = [];
  if (device?.device_id) {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("sensor_readings")
      .select("soil_moisture, light_lux, temperature, humidity, created_at")
      .eq("device_id", device.device_id)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) readings.push(...data.reverse());
  }

  const latest = readings[readings.length - 1] ?? null;
  const { label: soilStatus } = soilLabel(latest?.soil_moisture ?? null);
  const lightStatus = lightLabel(latest?.light_lux ?? null);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      {/* Back */}
      <Link href="/today" className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--color-sage-text)" }}>
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--secondary))" }}>
          <Leaf className="w-6 h-6" style={{ color: "var(--color-forest-green)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-tight" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            {plant.name}
          </h1>
          {plant.species && <p className="text-sm italic mt-0.5" style={{ color: "var(--color-sage-text)" }}>{plant.species}</p>}
          {plant.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" style={{ color: "var(--color-sage-text)" }} />
              <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>{plant.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Current stats */}
        {latest && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-sage-text)" }}>AHORA</h2>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Suelo" value={latest.soil_moisture !== null ? `${Math.round(latest.soil_moisture)}%` : "—"} sub={soilStatus} />
              <Stat label="Luz" value={latest.light_lux !== null ? `${Math.round(latest.light_lux)} lux` : "—"} sub={lightStatus} />
              <Stat label="Temperatura" value={latest.temperature !== null ? `${(Math.round(latest.temperature * 10) / 10)}°C` : "—"} />
              <Stat label="Humedad aire" value={latest.humidity !== null ? `${Math.round(latest.humidity)}% HR` : "—"} />
            </div>
          </div>
        )}

        {/* Charts with range selector */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>HISTORIAL</span>
          <PlantRangeSelector current={range} />
        </div>

        {readings.length > 0 ? (
          <PlantCharts readings={readings} />
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border text-center" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-sm" style={{ color: "var(--color-sage-text)" }}>
              Sin lecturas en este período.
            </p>
          </div>
        )}

        {/* Device link */}
        {device && (
          <Link
            href={`/device/${device.id}`}
            className="bg-white rounded-3xl px-5 py-4 shadow-sm border flex items-center justify-between"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>
              Dispositivo: {device.device_id}
            </span>
            <ArrowLeft className="w-4 h-4 rotate-180" style={{ color: "var(--color-sage-text)" }} />
          </Link>
        )}

        {/* Edit / Delete */}
        <PlantActions plant={{ id: plant.id, name: plant.name, species: plant.species ?? null, location: plant.location ?? null }} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-2xl" style={{ background: "hsl(var(--muted))" }}>
      <p className="text-xs mb-1" style={{ color: "var(--color-sage-text)" }}>{label}</p>
      <p className="text-base font-semibold" style={{ color: "var(--color-charcoal-green)" }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "var(--color-moss-green)" }}>{sub}</p>}
    </div>
  );
}
