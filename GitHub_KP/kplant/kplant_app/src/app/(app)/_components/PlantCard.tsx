"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Thermometer, Wind, Sun, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { type PlantWithData, type SensorReading, soilLabel, isOnline, timeAgo } from "@/lib/types";
import { getPlantImage } from "@/lib/plantImages";

// ── Botanical SVG illustrations (simplified silhouettes) ─────────────────────

function PlantIllustration({ species }: { species: string | null }) {
  const s = (species ?? "").toLowerCase();

  // Monstera / filodendro / alocasia — hoja fenestrada grande
  if (s.includes("monstera") || s.includes("philodendron") || s.includes("alocasia")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* stem */}
        <path d="M40 95 Q38 70 35 50" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* big leaf */}
        <path d="M35 50 Q10 20 30 5 Q55 0 60 30 Q65 55 35 50Z" fill="rgba(255,255,255,0.18)"/>
        {/* fenestrations */}
        <ellipse cx="38" cy="22" rx="5" ry="7" fill="rgba(255,255,255,0.12)" transform="rotate(-20 38 22)"/>
        <ellipse cx="50" cy="32" rx="4" ry="6" fill="rgba(255,255,255,0.12)" transform="rotate(-10 50 32)"/>
        {/* midrib */}
        <path d="M30 5 Q45 28 35 50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* veins */}
        <path d="M38 18 Q28 22 25 30" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M48 28 Q55 28 58 35" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    );
  }

  // Cactus / nopal / mammillaria
  if (s.includes("cactus") || s.includes("opuntia") || s.includes("mammillaria") || s.includes("schlumbergera")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* pot */}
        <path d="M28 88 Q27 95 52 95 Q57 95 52 88Z" fill="rgba(255,255,255,0.15)"/>
        {/* main column */}
        <rect x="32" y="30" width="16" height="58" rx="8" fill="rgba(255,255,255,0.18)"/>
        {/* left arm */}
        <path d="M32 55 Q18 50 18 38 Q18 30 26 30" stroke="rgba(255,255,255,0.25)" strokeWidth="9" strokeLinecap="round" fill="none"/>
        {/* right arm */}
        <path d="M48 48 Q62 43 62 32 Q62 24 54 24" stroke="rgba(255,255,255,0.25)" strokeWidth="8" strokeLinecap="round" fill="none"/>
        {/* ribs */}
        <line x1="40" y1="30" x2="40" y2="88" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
        <line x1="35" y1="30" x2="35" y2="88" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
        <line x1="45" y1="30" x2="45" y2="88" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      </svg>
    );
  }

  // Suculenta / echeveria / haworthia / aloe
  if (s.includes("echeveria") || s.includes("haworthia") || s.includes("aloe") || s.includes("crassula") || s.includes("senecio") || s.includes("kalanchoe")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* rosette layers */}
        <ellipse cx="40" cy="65" rx="28" ry="10" fill="rgba(255,255,255,0.12)"/>
        <ellipse cx="40" cy="60" rx="22" ry="9" fill="rgba(255,255,255,0.14)"/>
        <ellipse cx="40" cy="55" rx="16" ry="8" fill="rgba(255,255,255,0.16)"/>
        <ellipse cx="40" cy="50" rx="10" ry="7" fill="rgba(255,255,255,0.2)"/>
        <ellipse cx="40" cy="46" rx="5" ry="5" fill="rgba(255,255,255,0.25)"/>
        {/* outer petals */}
        <path d="M12 62 Q20 48 30 58" fill="rgba(255,255,255,0.12)"/>
        <path d="M68 62 Q60 48 50 58" fill="rgba(255,255,255,0.12)"/>
        <path d="M25 72 Q28 55 38 62" fill="rgba(255,255,255,0.1)"/>
        <path d="M55 72 Q52 55 42 62" fill="rgba(255,255,255,0.1)"/>
      </svg>
    );
  }

  // Pothos / trepadora / tradescantia / scindapsus / syngonium / chlorophytum / hedera
  if (s.includes("epipremnum") || s.includes("tradescantia") || s.includes("syngonium") || s.includes("chlorophytum") || s.includes("scindapsus") || s.includes("hedera")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* vines */}
        <path d="M40 90 Q30 70 20 60 Q10 50 15 35" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M40 90 Q50 65 60 55 Q70 45 62 28" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* leaves on vine 1 */}
        <path d="M20 60 Q8 48 12 38 Q22 36 24 50Z" fill="rgba(255,255,255,0.2)"/>
        <path d="M15 35 Q5 22 12 14 Q22 15 20 28Z" fill="rgba(255,255,255,0.18)"/>
        {/* leaves on vine 2 */}
        <path d="M60 55 Q72 43 68 33 Q58 32 56 46Z" fill="rgba(255,255,255,0.2)"/>
        <path d="M62 28 Q72 15 65 8 Q55 10 57 22Z" fill="rgba(255,255,255,0.18)"/>
        {/* center leaf */}
        <path d="M40 70 Q25 55 32 42 Q46 40 44 58Z" fill="rgba(255,255,255,0.15)"/>
      </svg>
    );
  }

  // Calathea / maranta / spathiphyllum / aglaonema / dieffenbachia / strelitzia / anthurium
  if (s.includes("calathea") || s.includes("maranta") || s.includes("spathiphyllum") || s.includes("aglaonema") || s.includes("dieffenbachia") || s.includes("strelitzia") || s.includes("anthurium")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* stems */}
        <path d="M40 92 Q36 72 28 55" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M40 92 Q44 70 55 50" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M40 92 Q40 68 40 45" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round"/>
        {/* patterned leaves */}
        <path d="M28 55 Q10 38 18 20 Q38 16 38 42 Q36 50 28 55Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M55 50 Q72 33 62 16 Q42 14 42 40 Q43 48 55 50Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M40 45 Q30 28 38 12 Q50 12 46 32 Q44 40 40 45Z" fill="rgba(255,255,255,0.2)"/>
        {/* midribs */}
        <path d="M18 20 Q30 36 28 55" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M62 16 Q52 34 55 50" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    );
  }

  // Ficus / dracaena / palmera / chamaedorea
  if (s.includes("ficus") || s.includes("dracaena") || s.includes("chamaedorea")) {
    return (
      <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* trunk */}
        <path d="M40 95 Q39 70 40 50" stroke="rgba(255,255,255,0.4)" strokeWidth="4" strokeLinecap="round"/>
        {/* canopy leaves */}
        <path d="M40 50 Q20 35 22 15 Q35 10 40 35Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M40 50 Q60 35 58 15 Q45 10 40 35Z" fill="rgba(255,255,255,0.18)"/>
        <path d="M40 55 Q15 48 10 28 Q25 18 38 45Z" fill="rgba(255,255,255,0.14)"/>
        <path d="M40 55 Q65 48 70 28 Q55 18 42 45Z" fill="rgba(255,255,255,0.14)"/>
        <path d="M40 45 Q35 20 38 5 Q45 5 42 28Z" fill="rgba(255,255,255,0.2)"/>
        {/* midribs */}
        <path d="M22 15 Q33 32 40 50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
        <path d="M58 15 Q47 32 40 50" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    );
  }

  // Default — hoja genérica bonita
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M40 92 Q36 72 32 58" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M40 92 Q44 70 50 55" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M32 58 Q8 40 16 12 Q40 8 40 50Z" fill="rgba(255,255,255,0.2)"/>
      <path d="M50 55 Q72 37 64 10 Q40 8 40 50Z" fill="rgba(255,255,255,0.2)"/>
      <path d="M16 12 Q30 30 32 58" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M64 10 Q50 30 50 55" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 12 Q22 36 30 42" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round"/>
      <path d="M64 10 Q58 34 50 40" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

// ── Avatar: real photo or SVG fallback ───────────────────────────────────────

function PlantAvatar({ species, needsWater, online, hasDevice }: { species: string | null; needsWater: boolean; online: boolean; hasDevice: boolean }) {
  const photo = getPlantImage(species);
  const offline = !hasDevice || !online;
  return (
    <div
      className="absolute bottom-0 right-4 translate-y-1/2 pointer-events-none"
      style={{ width: 90, height: 90 }}
    >
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          border: "3px solid rgba(255,255,255,0.25)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
          background: offline ? "white" : needsWater ? "#5C1010" : "#0D3B1A",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={species ?? "planta"}
            className="w-full h-full object-cover"
            style={{ opacity: offline ? 0.5 : 1 }}
          />
        ) : (
          <div className="w-full h-full p-2" style={{ opacity: offline ? 0.5 : 1 }}>
            <PlantIllustration species={species} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const headerBg = needsWater
    ? "linear-gradient(135deg, #8B1A1A 0%, #c0392b 100%)"
    : "linear-gradient(135deg, #0D3B1A 0%, #2B7830 100%)";

  return (
    <div
      className="rounded-3xl overflow-visible shadow-sm"
      style={{ background: "white", border: "1px solid hsl(var(--border))" }}
    >
      {/* ── Green header ── */}
      <Link
        href={`/plant/${initialPlant.id}`}
        className="block rounded-t-3xl relative overflow-visible"
        style={{ background: headerBg }}
      >
        <div className="px-5 pt-5 pb-6">
          {/* Top row: name + status icon */}
          <div className="flex items-start gap-3">
            {/* Text — leaves space for illustration */}
            <div className="min-w-0 flex-1 pr-20">
              <h2
                className="text-xl font-semibold leading-tight text-white truncate"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {initialPlant.name}
              </h2>
              {initialPlant.species && (
                <p className="text-xs mt-0.5 italic truncate" style={{ color: "rgba(255,255,255,0.6)" }}>
                  {initialPlant.species}
                </p>
              )}
            </div>
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {needsWater
                ? <AlertTriangle className="w-5 h-5" style={{ color: "#FFD580" }} />
                : <CheckCircle2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} />
              }
            </div>
          </div>

          {/* Soil moisture */}
          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
              Humedad suelo
            </p>
            <p className="text-4xl font-bold text-white leading-none mt-0.5">
              {soilPct !== null ? `${soilPct}%` : "—"}
            </p>
            <p className="text-xs mt-1 font-medium" style={{ color: needsWater ? "#FFD580" : "rgba(255,255,255,0.65)" }}>
              {soilStatus}
            </p>
            {/* Soil bar */}
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(soilPct ?? 0, 100)}%`,
                  background: needsWater ? "#FFD580" : "rgba(255,255,255,0.8)",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Plant photo / illustration — overflows bottom edge ── */}
        <PlantAvatar species={initialPlant.species ?? null} needsWater={needsWater} online={online} hasDevice={!!device} />
      </Link>

      {/* ── Sensor chips — extra top padding for the overflowing illustration ── */}
      <div className="px-5 pt-14 pb-3 flex flex-wrap gap-2">
        <SensorChip icon={Thermometer} value={reading?.temperature != null ? `${(Math.round(reading.temperature * 10) / 10)}°C` : "—"} />
        <SensorChip icon={Wind}        value={reading?.humidity    != null ? `${Math.round(reading.humidity)}% HR` : "—"} />
        <SensorChip icon={Sun}         value={reading?.light_lux   != null ? `${Math.round(reading.light_lux)} lux` : "—"} />
      </div>

      {/* ── Device footer ── */}
      <Link
        href={device ? `/device/${device.id}` : `/registro?plant_id=${initialPlant.id}`}
        className="px-5 py-3 border-t flex items-center justify-between rounded-b-3xl"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.4)" }}
      >
        <div className="flex items-center gap-1.5">
          {!device && (
            <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
              Sin dispositivo · vincular
            </span>
          )}
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
