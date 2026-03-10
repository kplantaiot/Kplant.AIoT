"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

type Reading = {
  soil_moisture: number | null;
  light_lux: number | null;
  temperature: number | null;
  humidity: number | null;
  created_at: string;
};

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: {
      grid: { color: "hsl(120 15% 90%)" },
      ticks: { color: "#5A7565", font: { size: 11 } },
    },
  },
  elements: { point: { radius: 0, hoverRadius: 4 } },
};

function MiniChart({
  title,
  subtitle,
  data,
  color,
  bgColor,
  yMin,
  yMax,
  tickCallback,
}: {
  title: string;
  subtitle?: string;
  data: (number | null)[];
  color: string;
  bgColor: string;
  yMin?: number;
  yMax?: number;
  tickCallback?: (v: number | string) => string;
}) {
  if (data.every((v) => v === null)) return null;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>{title}</h2>
        {subtitle && <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>{subtitle}</span>}
      </div>
      <div style={{ height: 120 }}>
        <Line
          data={{
            labels: data.map((_, i) => i),
            datasets: [{
              data,
              borderColor: color,
              backgroundColor: bgColor,
              fill: true,
              tension: 0.4,
            }],
          }}
          options={{
            ...BASE_OPTIONS,
            scales: {
              ...BASE_OPTIONS.scales,
              y: {
                ...BASE_OPTIONS.scales.y,
                ...(yMin !== undefined ? { min: yMin } : {}),
                ...(yMax !== undefined ? { max: yMax } : {}),
                ticks: {
                  ...BASE_OPTIONS.scales.y.ticks,
                  ...(tickCallback ? { callback: tickCallback } : {}),
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export function PlantCharts({ readings }: { readings: Reading[] }) {
  return (
    <>
      <MiniChart
        title="HUMEDAD SUELO"
        subtitle={`últimas ${readings.length} lecturas`}
        data={readings.map((r) => r.soil_moisture)}
        color="#2D6A4F"
        bgColor="rgba(45,106,79,0.12)"
        yMin={0}
        yMax={100}
        tickCallback={(v) => `${v}%`}
      />
      <MiniChart
        title="TEMPERATURA"
        subtitle="°C"
        data={readings.map((r) => r.temperature)}
        color="#C05621"
        bgColor="rgba(192,86,33,0.10)"
        tickCallback={(v) => `${v}°`}
      />
      <MiniChart
        title="HUMEDAD AIRE"
        subtitle="% HR"
        data={readings.map((r) => r.humidity)}
        color="#3A86FF"
        bgColor="rgba(58,134,255,0.10)"
        yMin={0}
        yMax={100}
        tickCallback={(v) => `${v}%`}
      />
      <MiniChart
        title="LUZ AMBIENTAL"
        subtitle="lux"
        data={readings.map((r) => r.light_lux)}
        color="#52B788"
        bgColor="rgba(82,183,136,0.12)"
        yMin={0}
      />
    </>
  );
}
