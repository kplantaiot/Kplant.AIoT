"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unlink } from "lucide-react";

export function DeviceActions({ deviceId, hasPlant }: { deviceId: string; hasPlant: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!hasPlant) return null;

  async function handleUnlink() {
    setLoading(true);
    await fetch(`/api/devices/${deviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plant_id: null }),
    });
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
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
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "hsl(var(--danger))" }}
          >
            {loading ? "Desvinculando..." : "Desvincular"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium border bg-white"
      style={{ borderColor: "hsl(var(--border))", color: "var(--color-sage-text)" }}
    >
      <Unlink className="w-4 h-4" />
      Desvincular de planta
    </button>
  );
}
