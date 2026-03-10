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

export function PlantCharts({ readings }: { readings: Reading[] }) {
  const labels = readings.map((r) => {
    const d = new Date(r.created_at);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const soilData = {
    labels,
    datasets: [{
      data: readings.map((r) => r.soil_moisture),
      borderColor: "#2D6A4F",
      backgroundColor: "rgba(45,106,79,0.12)",
      fill: true,
      tension: 0.4,
    }],
  };

  const lightData = {
    labels,
    datasets: [{
      data: readings.map((r) => r.light_lux),
      borderColor: "#52B788",
      backgroundColor: "rgba(82,183,136,0.12)",
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <>
      {/* Soil chart */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>HUMEDAD SUELO</h2>
          <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>últimas {readings.length} lecturas</span>
        </div>
        <div style={{ height: 140 }}>
          <Line
            data={soilData}
            options={{
              ...BASE_OPTIONS,
              scales: {
                ...BASE_OPTIONS.scales,
                y: { ...BASE_OPTIONS.scales.y, min: 0, max: 100, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v) => `${v}%` } },
              },
            }}
          />
        </div>
      </div>

      {/* Light chart */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>LUZ AMBIENTAL</h2>
          <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>lux</span>
        </div>
        <div style={{ height: 140 }}>
          <Line
            data={lightData}
            options={{
              ...BASE_OPTIONS,
              scales: {
                ...BASE_OPTIONS.scales,
                y: { ...BASE_OPTIONS.scales.y, min: 0, ticks: { ...BASE_OPTIONS.scales.y.ticks, callback: (v) => `${v}` } },
              },
            }}
          />
        </div>
      </div>
    </>
  );
}
