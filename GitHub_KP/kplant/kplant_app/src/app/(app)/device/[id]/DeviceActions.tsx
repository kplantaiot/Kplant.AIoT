"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink, Timer } from "lucide-react";

const INTERVAL_OPTIONS = [
  { label: "1 minuto",   value: 60000 },
  { label: "5 minutos",  value: 300000 },
  { label: "15 minutos", value: 900000 },
  { label: "1 hora",     value: 3600000 },
  { label: "4 horas",    value: 14400000 },
  { label: "8 horas",    value: 28800000 },
  { label: "24 horas",   value: 86400000 },
];

export function DeviceActions({
  deviceId,
  hasPlant,
  currentIntervalMs,
}: {
  deviceId: string;
  hasPlant: boolean;
  currentIntervalMs: number | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [intervalLoading, setIntervalLoading] = useState(false);
  const [intervalSuccess, setIntervalSuccess] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<number>(
    currentIntervalMs ?? 900000
  );

  async function handleUnlink() {
    setUnlinkLoading(true);
    await fetch(`/api/devices/${deviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plant_id: null }),
    });
    setUnlinkLoading(false);
    setConfirming(false);
    router.refresh();
  }

  async function handleSetInterval() {
    setIntervalLoading(true);
    setIntervalSuccess(false);
    const res = await fetch(`/api/devices/${deviceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: "SET_INTERVAL", interval_ms: selectedInterval }),
    });
    setIntervalLoading(false);
    if (res.ok) {
      setIntervalSuccess(true);
      router.refresh();
      setTimeout(() => setIntervalSuccess(false), 3000);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Intervalo de muestreo */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-4 h-4" style={{ color: "var(--color-sage-text)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>INTERVALO DE MUESTREO</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedInterval(opt.value)}
              className="px-3 py-1.5 rounded-xl text-sm font-medium border transition"
              style={{
                background: selectedInterval === opt.value ? "var(--color-moss-green)" : "hsl(var(--muted))",
                color: selectedInterval === opt.value ? "white" : "var(--color-charcoal-green)",
                borderColor: selectedInterval === opt.value ? "var(--color-moss-green)" : "hsl(var(--border))",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSetInterval}
          disabled={intervalLoading || intervalSuccess}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition"
          style={{ background: intervalSuccess ? "hsl(var(--success))" : "var(--color-moss-green)" }}
        >
          {intervalLoading ? "Enviando..." : intervalSuccess ? "Intervalo actualizado" : "Aplicar intervalo"}
        </button>
      </div>

      {/* Desvincular planta */}
      {hasPlant && (
        confirming ? (
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--color-charcoal-green)" }}>
              ¿Desvincular este dispositivo de su planta? Podrás vincularlo de nuevo más tarde.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium border"
                style={{ borderColor: "hsl(var(--border))", color: "var(--color-charcoal-green)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinkLoading}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "hsl(var(--danger))" }}
              >
                {unlinkLoading ? "Desvinculando..." : "Desvincular"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium border bg-white"
            style={{ borderColor: "hsl(var(--border))", color: "var(--color-sage-text)" }}
          >
            <Unlink className="w-4 h-4" />
            Desvincular de planta
          </button>
        )
      )}
    </div>
  );
}
