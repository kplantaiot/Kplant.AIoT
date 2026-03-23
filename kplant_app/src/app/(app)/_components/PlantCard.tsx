"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Thermometer, Wind, Sun, Wifi, WifiOff, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { type PlantWithData, type SensorReading, soilLabel, isOnline, timeAgo } from "@/lib/types";

export function PlantCard({ plant: initialPlant }: { plant: PlantWithData }) {
  const [reading, setReading] = useState<SensorReading | null>(initialPlant.reading);
  const device = initialPlant.device;

  useEffect(() => {
    if (!device?.device_id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`plant-${initialPlant.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "sensor_readings",
        filter: `device_id=eq.${device.device_id}`,
      }, (payload) => setReading(payload.new as SensorReading))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [device?.device_id, initialPlant.id]);

  const online  = isOnline(device?.last_seen ?? null);
  const soil    = reading?.soil_moisture ?? null;
  const { label: soilStatus, color: soilColor } = soilLabel(soil);

  const needsWater = soilColor === "danger";
  const soilPct    = soil !== null ? Math.round(soil) : null;

  // Soil bar color
  const barColor =
    needsWater                   ? "#c0392b" :
    soilColor === "success"      ? "var(--color-forest-green)" :
                                   "var(--color-moss-green)";

  // Card header gradient — shifts red when soil is critical
  const headerBg = needsWater
    ? "linear-gradient(135deg, #8B1A1A 0%, #c0392b 100%)"
    : "linear-gradient(135deg, var(--color-charcoal-green) 0%, var(--color-forest-green) 100%)";

  return (
    <div className="rounded-3xl overflow-hidden shadow-sm" style={{ background: "white", border: "1px solid hsl(var(--border))" }}>

      {/* ── Green header ── */}
      <Link href={`/plant/${initialPlant.id}`} className="block" style={{ background: headerBg }}>
        <div className="px-5 pt-5 pb-4">
          {/* Top row: name + status icon */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-xl font-semibold leading-tight text-white truncate"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {initialPlant.name}
              </h2>
              {initialPlant.species && (
                <p className="text-xs mt-0.5 italic truncate" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {initialPlant.species}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {needsWater
                ? <AlertTriangle className="w-5 h-5" style={{ color: "#FFD580" }} />
                : <CheckCircle2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
              }
            </div>
          </div>

          {/* Soil moisture — big number */}
          <div className="mt-4 flex items-end gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
                Humedad suelo
              </p>
              <p className="text-4xl font-bold text-white leading-none mt-0.5">
                {soilPct !== null ? `${soilPct}%` : "—"}
              </p>
              <p className="text-xs mt-1 font-medium" style={{ color: needsWater ? "#FFD580" : "rgba(255,255,255,0.7)" }}>
                {soilStatus}
              </p>
            </div>

            {/* Soil bar vertical */}
            <div className="flex-1 flex flex-col justify-end h-12">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(soilPct ?? 0, 100)}%`, background: barColor === "var(--color-forest-green)" ? "rgba(255,255,255,0.85)" : barColor === "var(--color-moss-green)" ? "rgba(255,255,255,0.7)" : "#FFD580" }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* ── Sensor chips ── */}
      <div className="px-5 py-3 flex flex-wrap gap-2">
        <SensorChip icon={Thermometer} value={reading?.temperature != null ? `${(Math.round(reading.temperature * 10) / 10)}°C` : "—"} />
        <SensorChip icon={Wind}        value={reading?.humidity    != null ? `${Math.round(reading.humidity)}% HR` : "—"} />
        <SensorChip icon={Sun}         value={reading?.light_lux   != null ? `${Math.round(reading.light_lux)} lux` : "—"} />
      </div>

      {/* ── Device footer ── */}
      <Link
        href={device ? `/device/${device.id}` : `/registro?plant_id=${initialPlant.id}`}
        className="px-5 py-3 border-t flex items-center justify-between"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}
      >
        <div className="flex items-center gap-1.5">
          {online
            ? <Wifi    className="w-3.5 h-3.5" style={{ color: "hsl(var(--success))" }} />
            : <WifiOff className="w-3.5 h-3.5" style={{ color: "var(--color-sage-text)" }} />
          }
          <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
            {device?.device_id ?? "Sin dispositivo · vincular"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
            {timeAgo(reading?.created_at ?? device?.last_seen ?? null)}
          </span>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--color-sage-text)" }} />
        </div>
      </Link>
    </div>
  );
}

function SensorChip({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-sage-text)" }} />
      <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--color-charcoal-green)" }}>
        {value}
      </span>
    </div>
  );
}
