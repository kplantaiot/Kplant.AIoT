"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, AlertTriangle, Info, AlertCircle } from "lucide-react";
import Link from "next/link";

type Alert = {
  id: number;
  device_id: string;
  plant_id: string | null;
  event_type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  sensor_value: number | null;
  threshold: number | null;
  created_at: string;
  plants: { name: string } | null;
};

const SEVERITY_CONFIG = {
  critical: { icon: AlertCircle, color: "hsl(var(--danger))",  bg: "#FFF0F0", label: "Crítico"  },
  warning:  { icon: AlertTriangle, color: "#C05621",            bg: "#FFF8F0", label: "Atención" },
  info:     { icon: Info,         color: "var(--color-sage-text)", bg: "hsl(var(--muted))", label: "Info" },
};

function timeAgoShort(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/alerts");
    if (res.ok) {
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  async function handleDismiss(id: number) {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
  }

  async function handleDismissAll() {
    const ids = alerts.map(a => a.id);
    setAlerts([]);
    await Promise.all(ids.map(id => fetch(`/api/alerts/${id}`, { method: "PATCH" })));
  }

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const hasAlerts = alerts.length > 0;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchAlerts(); }}
        className="relative p-2 rounded-xl transition"
        style={{ color: hasAlerts ? (criticalCount > 0 ? "hsl(var(--danger))" : "#C05621") : "var(--color-sage-text)" }}
      >
        <Bell className="w-5 h-5" />
        {hasAlerts && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: criticalCount > 0 ? "hsl(var(--danger))" : "#C05621" }}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm shadow-2xl flex flex-col"
            style={{ background: "hsl(var(--background))" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--color-charcoal-green)", fontFamily: "var(--font-fraunces)" }}>
                  Alertas
                </h2>
                {hasAlerts && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-sage-text)" }}>
                    {alerts.length} {alerts.length === 1 ? "activa" : "activas"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasAlerts && (
                  <button
                    onClick={handleDismissAll}
                    className="text-xs px-3 py-1.5 rounded-xl border"
                    style={{ borderColor: "hsl(var(--border))", color: "var(--color-sage-text)" }}
                  >
                    Limpiar todo
                  </button>
                )}
                <button onClick={() => setOpen(false)}>
                  <X className="w-5 h-5" style={{ color: "var(--color-sage-text)" }} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {loading && alerts.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--color-sage-text)" }}>
                  Cargando…
                </p>
              )}
              {!loading && alerts.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Bell className="w-10 h-10" style={{ color: "var(--color-sage-text)", opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: "var(--color-sage-text)" }}>
                    Todo está bien — sin alertas activas.
                  </p>
                </div>
              )}
              {alerts.map(alert => {
                const cfg = SEVERITY_CONFIG[alert.severity];
                const Icon = cfg.icon;
                return (
                  <div
                    key={alert.id}
                    className="rounded-2xl p-4 border"
                    style={{ background: cfg.bg, borderColor: cfg.color, borderWidth: "1.5px" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                        <div className="min-w-0">
                          {alert.plants?.name && (
                            <Link
                              href={alert.plant_id ? `/plant/${alert.plant_id}` : "#"}
                              className="text-xs font-semibold block mb-0.5 hover:underline"
                              style={{ color: cfg.color }}
                              onClick={() => setOpen(false)}
                            >
                              {alert.plants.name}
                            </Link>
                          )}
                          <p className="text-xs leading-relaxed" style={{ color: "var(--color-charcoal-green)" }}>
                            {alert.message}
                          </p>
                          <p className="text-[10px] mt-1.5" style={{ color: "var(--color-sage-text)" }}>
                            {timeAgoShort(alert.created_at)} · {cfg.label}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="flex-shrink-0 p-1 rounded-lg"
                        style={{ color: "var(--color-sage-text)" }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
