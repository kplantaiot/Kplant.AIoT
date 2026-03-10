"use client";

import { useEffect, useState } from "react";
import { Droplets, Thermometer, Wind, Sun, Battery, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { type PlantWithData, type SensorReading, soilLabel, lightLabel, plantSummary, isOnline, timeAgo } from "@/lib/types";

function SoilGauge({ pct }: { pct: number | null }) {
  const value = pct ?? 0;
  const { color } = soilLabel(pct);

  const barColor =
    color === "danger" ? "var(--color-earth-brown)" :
    color === "success" ? "var(--color-forest-green)" :
    "var(--color-moss-green)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium" style={{ color: "var(--color-sage-text)" }}>Suelo</span>
        <span className="text-sm font-semibold" style={{ color: "var(--color-charcoal-green)" }}>
          {pct !== null ? `${Math.round(pct)}%` : "—"}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(value, 100)}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function SensorChip({ icon: Icon, value, unit }: { icon: React.ElementType; value: string | number | null; unit?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--color-sage-text)" }} />
      <span className="text-xs font-medium whitespace-nowrap" style={{ color: "var(--color-charcoal-green)" }}>
        {value !== null && value !== undefined ? `${value}${unit ?? ""}` : "—"}
      </span>
    </div>
  );
}

export function PlantCard({ plant: initialPlant }: { plant: PlantWithData }) {
  const [reading, setReading] = useState<SensorReading | null>(initialPlant.reading);
  const device = initialPlant.device;

  useEffect(() => {
    if (!device?.device_id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`plant-${initialPlant.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
          filter: `device_id=eq.${device.device_id}`,
        },
        (payload) => setReading(payload.new as SensorReading)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [device?.device_id, initialPlant.id]);

  const online = isOnline(device?.last_seen ?? null);
  const { label: soilStatus, color: soilColor } = soilLabel(reading?.soil_moisture ?? null);
  const summary = plantSummary(reading);

  const statusBg =
    soilColor === "danger" ? "hsl(var(--danger) / 0.1)" :
    soilColor === "success" ? "hsl(var(--success) / 0.1)" :
    "hsl(145 35% 90%)";

  const statusTextColor =
    soilColor === "danger" ? "hsl(var(--danger))" :
    soilColor === "success" ? "hsl(var(--success))" :
    "var(--color-forest-green)";

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold leading-tight" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
              {initialPlant.name}
            </h2>
            {initialPlant.species && (
              <p className="text-xs mt-0.5 italic" style={{ color: "var(--color-sage-text)" }}>{initialPlant.species}</p>
            )}
          </div>

          {/* Status badge */}
          <span className="text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0" style={{ background: statusBg, color: statusTextColor }}>
            {soilStatus}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm mt-2" style={{ color: "var(--color-sage-text)" }}>{summary}</p>
      </div>

      {/* Soil gauge */}
      <div className="px-5 pb-4">
        <SoilGauge pct={reading?.soil_moisture ?? null} />
      </div>

      {/* Sensor chips */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        <SensorChip icon={Thermometer} value={reading?.temperature !== null && reading?.temperature !== undefined ? Math.round(reading.temperature * 10) / 10 : null} unit="°C" />
        <SensorChip icon={Wind} value={reading?.humidity !== null && reading?.humidity !== undefined ? Math.round(reading.humidity) : null} unit="% HR" />
        <SensorChip icon={Sun} value={reading?.light_lux !== null && reading?.light_lux !== undefined ? Math.round(reading.light_lux) : null} unit=" lux" />
        {reading?.battery_level !== null && reading?.battery_level !== undefined && (
          <SensorChip icon={Battery} value={Math.round(reading.battery_level)} unit="%" />
        )}
      </div>

      {/* Footer — device status */}
      <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.5)" }}>
        <div className="flex items-center gap-1.5">
          {online ? (
            <Wifi className="w-3.5 h-3.5" style={{ color: "hsl(var(--success))" }} />
          ) : (
            <WifiOff className="w-3.5 h-3.5" style={{ color: "var(--color-sage-text)" }} />
          )}
          <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
            {device?.device_id ?? "Sin dispositivo"}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
          {timeAgo(reading?.created_at ?? device?.last_seen ?? null)}
        </span>
      </div>
    </div>
  );
}
