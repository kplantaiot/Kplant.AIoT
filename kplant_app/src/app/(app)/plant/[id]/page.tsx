import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Droplets, Thermometer, Wind, Sun } from "lucide-react";
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
  "30d": { hours: 720, limit: 500 },
};

function calcStats(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  if (v.length === 0) return null;
  return { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length };
}

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

  const soilPct = latest?.soil_moisture != null ? Math.round(latest.soil_moisture) : null;
  const needsWater = soilPct !== null && soilPct < 30;

  const stats = readings.length > 1 ? {
    soil: calcStats(readings.map(r => r.soil_moisture)),
    temp: calcStats(readings.map(r => r.temperature)),
    hum:  calcStats(readings.map(r => r.humidity)),
    lux:  calcStats(readings.map(r => r.light_lux)),
  } : null;

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* ── GREEN HERO HEADER ── */}
      <div
        className="px-5 pt-6 pb-8 relative"
        style={{ background: needsWater
          ? "linear-gradient(160deg, #5C1010 0%, #8B1A1A 100%)"
          : "linear-gradient(160deg, #0D3B1A 0%, #1B5520 60%, #2B7830 100%)" }}
      >
        {/* Back */}
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-sm mb-5"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Mis plantas
        </Link>

        {/* Plant name */}
        <h1
          className="text-3xl font-semibold text-white leading-tight"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          {plant.name}
        </h1>
        {plant.species && (
          <p className="text-sm italic mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            {plant.species}
          </p>
        )}
        {plant.location && (
          <div className="flex items-center gap-1 mt-2">
            <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.45)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{plant.location}</span>
          </div>
        )}

        {/* ── Big current readings ── */}
        {latest && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <BigStat
              icon={Droplets}
              label="Humedad suelo"
              value={soilPct !== null ? `${soilPct}%` : "—"}
              sub={soilStatus}
              accent={needsWater ? "#FFD580" : "#86C93A"}
            />
            <BigStat
              icon={Sun}
              label="Luz"
              value={latest.light_lux != null ? `${Math.round(latest.light_lux)} lux` : "—"}
              sub={lightStatus}
              accent="#86C93A"
            />
            <BigStat
              icon={Thermometer}
              label="Temperatura"
              value={latest.temperature != null ? `${(Math.round(latest.temperature * 10) / 10)}°C` : "—"}
              accent="#FFA680"
            />
            <BigStat
              icon={Wind}
              label="Humedad aire"
              value={latest.humidity != null ? `${Math.round(latest.humidity)}% HR` : "—"}
              accent="#80C8FF"
            />
          </div>
        )}

        {/* Soil bar */}
        {soilPct !== null && (
          <div className="mt-5">
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span>SUELO</span>
              <span>{soilPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(soilPct, 100)}%`,
                  background: needsWater ? "#FFD580" : "#86C93A",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── WHITE CONTENT AREA ── */}
      <div className="px-4 -mt-3 flex flex-col gap-4">
        {/* Rounded top white panel */}
        <div className="h-3 bg-transparent" />

        {/* Charts */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: "var(--color-sage-text)" }}>
            Historial
          </span>
          <PlantRangeSelector current={range} />
        </div>

        {readings.length > 0 ? (
          <PlantCharts readings={readings} />
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border text-center" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-sm" style={{ color: "var(--color-sage-text)" }}>Sin lecturas en este período.</p>
          </div>
        )}

        {/* Period stats */}
        {stats && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-xs font-semibold tracking-wider uppercase mb-4" style={{ color: "var(--color-sage-text)" }}>
              Estadísticas · {range.toUpperCase()}
            </h2>
            <div className="flex flex-col gap-2">
              <PeriodStat label="Suelo"       s={stats.soil} fmt={v => `${Math.round(v)}%`}                                              color="#2B7830" />
              <PeriodStat label="Temperatura" s={stats.temp} fmt={v => `${(Math.round(v * 10) / 10)}°C`}                                  color="#C05621" />
              <PeriodStat label="Humedad"     s={stats.hum}  fmt={v => `${Math.round(v)}%`}                                              color="#3A86FF" />
              <PeriodStat label="Luz"         s={stats.lux}  fmt={v => v >= 1000 ? `${(v/1000).toFixed(1)}k lux` : `${Math.round(v)} lux`} color="#86C93A" />
            </div>
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

function BigStat({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.1)" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-[10px] mt-1 font-medium" style={{ color: accent }}>{sub}</p>}
    </div>
  );
}

function PeriodStat({
  label, s, fmt, color,
}: {
  label: string;
  s: { min: number; max: number; avg: number } | null;
  fmt: (v: number) => string;
  color: string;
}) {
  if (!s) return null;
  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs w-20 flex-shrink-0" style={{ color: "var(--color-sage-text)" }}>{label}</span>
      <div className="flex-1 grid grid-cols-3 gap-1 text-xs text-center">
        <div>
          <div className="font-semibold" style={{ color: "var(--color-charcoal-green)" }}>{fmt(s.min)}</div>
          <div style={{ color: "var(--color-sage-text)", fontSize: "0.65rem" }}>mín</div>
        </div>
        <div>
          <div className="font-semibold" style={{ color: "var(--color-charcoal-green)" }}>{fmt(s.avg)}</div>
          <div style={{ color: "var(--color-sage-text)", fontSize: "0.65rem" }}>prom</div>
        </div>
        <div>
          <div className="font-semibold" style={{ color: "var(--color-charcoal-green)" }}>{fmt(s.max)}</div>
          <div style={{ color: "var(--color-sage-text)", fontSize: "0.65rem" }}>máx</div>
        </div>
      </div>
    </div>
  );
}
