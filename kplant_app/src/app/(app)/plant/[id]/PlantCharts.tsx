"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Reading = {
  soil_moisture: number | null;
  light_lux: number | null;
  temperature: number | null;
  humidity: number | null;
  created_at: string;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTooltipTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// Normalize a value to 0-100 range given min/max
function norm(v: number | null, min: number, max: number): number | null {
  if (v === null) return null;
  return Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
}

const SERIES = [
  {
    key: "soil_moisture" as keyof Reading,
    label: "Suelo",
    color: "#2B7830",
    bg: "rgba(43,120,48,0.08)",
    min: 0, max: 100,
    fmt: (v: number) => `${Math.round(v)}%`,
  },
  {
    key: "humidity" as keyof Reading,
    label: "Humedad aire",
    color: "#3A86FF",
    bg: "rgba(58,134,255,0.0)",
    min: 0, max: 100,
    fmt: (v: number) => `${Math.round(v)}% HR`,
  },
  {
    key: "temperature" as keyof Reading,
    label: "Temperatura",
    color: "#C05621",
    bg: "rgba(192,86,33,0.0)",
    min: 0, max: 50,
    fmt: (v: number) => `${(Math.round(v * 10) / 10)}°C`,
  },
  {
    key: "light_lux" as keyof Reading,
    label: "Luz",
    color: "#86C93A",
    bg: "rgba(134,201,58,0.0)",
    min: 0, max: 10000,
    fmt: (v: number) => `${Math.round(v)} lux`,
  },
] as const;

export function PlantCharts({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) return null;

  const labels = readings.map((r) => formatTime(r.created_at));
  const rawLabels = readings.map((r) => r.created_at);
  const latest = readings[readings.length - 1];

  const tickCount = 4;
  const step = Math.max(1, Math.floor(readings.length / tickCount));
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, i) => Math.min(i * step, readings.length - 1))
  );

  const datasets = SERIES.map((s) => ({
    label: s.label,
    data: readings.map((r) => norm(r[s.key] as number | null, s.min, s.max)),
    borderColor: s.color,
    backgroundColor: s.bg,
    borderWidth: 2,
    fill: s.key === "soil_moisture",
    tension: 0.4,
    spanGaps: true,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: s.color,
    pointHoverBorderColor: "#fff",
    pointHoverBorderWidth: 2,
    // Store raw for tooltip
    rawData: readings.map((r) => r[s.key] as number | null),
  }));

  // Current values row
  const currentValues = SERIES.map((s) => {
    const v = latest?.[s.key] as number | null;
    return { label: s.label, color: s.color, display: v !== null ? s.fmt(v) : "—" };
  });

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
      {/* Current values */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        {currentValues.map(({ label, color, display }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>{label}</span>
            <span className="text-xs font-semibold ml-auto" style={{ color: "var(--color-charcoal-green)" }}>{display}</span>
          </div>
        ))}
      </div>

      <div style={{ height: 200 }}>
        <Line
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(27,85,32,0.92)",
                titleColor: "#D4EC6B",
                bodyColor: "#fff",
                padding: 10,
                cornerRadius: 10,
                callbacks: {
                  title: (items) => formatTooltipTime(rawLabels[items[0].dataIndex]),
                  label: (item: TooltipItem<"line">) => {
                    const s = SERIES[item.datasetIndex];
                    const raw = (item.dataset as unknown as { rawData: (number | null)[] }).rawData[item.dataIndex];
                    return raw !== null ? `${s.label}: ${s.fmt(raw)}` : `${s.label}: —`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                  color: "#3D7A42",
                  font: { size: 10 },
                  maxRotation: 0,
                  autoSkip: false,
                  callback: function (_val, index) {
                    return tickIndices.has(index) ? labels[index] : "";
                  },
                },
              },
              y: {
                min: 0,
                max: 100,
                grid: { color: "hsl(90 22% 88%)" },
                border: { display: false },
                ticks: {
                  color: "#3D7A42",
                  font: { size: 10 },
                  maxTicksLimit: 5,
                  callback: (v) => `${v}%`,
                },
              },
            },
            elements: { point: { radius: 0 } },
            interaction: { mode: "index", intersect: false },
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full" style={{ background: s.color }} />
            <span className="text-[10px]" style={{ color: "var(--color-sage-text)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
