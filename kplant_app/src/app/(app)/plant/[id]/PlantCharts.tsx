"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type TooltipItem,
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

function MiniChart({
  title,
  unit,
  currentValue,
  data,
  labels,
  color,
  bgColor,
  yMin,
  yMax,
  tickCallback,
  tooltipCallback,
}: {
  title: string;
  unit?: string;
  currentValue: string | null;
  data: (number | null)[];
  labels: string[];
  color: string;
  bgColor: string;
  yMin?: number;
  yMax?: number;
  tickCallback?: (v: number | string) => string;
  tooltipCallback?: (item: TooltipItem<"line">) => string;
}) {
  const hasData = data.some((v) => v !== null);
  if (!hasData) return null;

  // Show x-axis ticks only at ~4 evenly spaced points
  const tickCount = 4;
  const step = Math.max(1, Math.floor(data.length / tickCount));
  const tickIndices = new Set(
    Array.from({ length: tickCount }, (_, i) => Math.min(i * step, data.length - 1))
  );

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
      {/* Header: title + current value */}
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--color-sage-text)" }}>
          {title}
        </h2>
        {currentValue && (
          <span className="text-xl font-semibold" style={{ color: "var(--color-charcoal-green)" }}>
            {currentValue}
          </span>
        )}
      </div>
      {unit && (
        <p className="text-xs mb-3" style={{ color: "var(--color-sage-text)" }}>{unit}</p>
      )}

      <div style={{ height: 130 }}>
        <Line
          data={{
            labels,
            datasets: [{
              data,
              borderColor: color,
              backgroundColor: bgColor,
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              spanGaps: true,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
            }],
          }}
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
                  title: (items) => formatTooltipTime(items[0].label),
                  label: tooltipCallback ?? ((item) => String(item.raw ?? "—")),
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
                grid: { color: "hsl(90 22% 88%)" },
                border: { display: false },
                ...(yMin !== undefined ? { min: yMin } : {}),
                ...(yMax !== undefined ? { max: yMax } : {}),
                ticks: {
                  color: "#3D7A42",
                  font: { size: 11 },
                  maxTicksLimit: 4,
                  ...(tickCallback ? { callback: tickCallback } : {}),
                },
              },
            },
            elements: { point: { radius: 0 } },
            interaction: { mode: "index", intersect: false },
          }}
        />
      </div>
    </div>
  );
}

export function PlantCharts({ readings }: { readings: Reading[] }) {
  const labels = readings.map((r) => formatTime(r.created_at));
  const latest = readings[readings.length - 1] ?? null;

  return (
    <>
      <MiniChart
        title="Humedad suelo"
        unit="Capacitancia del sustrato"
        currentValue={latest?.soil_moisture != null ? `${Math.round(latest.soil_moisture)}%` : null}
        data={readings.map((r) => r.soil_moisture)}
        labels={labels}
        color="#2B7830"
        bgColor="rgba(43,120,48,0.12)"
        yMin={0}
        yMax={100}
        tickCallback={(v) => `${v}%`}
        tooltipCallback={(item) => `${item.raw ?? "—"}% humedad`}
      />
      <MiniChart
        title="Temperatura"
        unit="Temperatura ambiente en °C"
        currentValue={latest?.temperature != null ? `${(Math.round(latest.temperature * 10) / 10)}°C` : null}
        data={readings.map((r) => r.temperature)}
        labels={labels}
        color="#C05621"
        bgColor="rgba(192,86,33,0.10)"
        tickCallback={(v) => `${v}°`}
        tooltipCallback={(item) => `${item.raw ?? "—"} °C`}
      />
      <MiniChart
        title="Humedad aire"
        unit="Humedad relativa del ambiente"
        currentValue={latest?.humidity != null ? `${Math.round(latest.humidity)}%` : null}
        data={readings.map((r) => r.humidity)}
        labels={labels}
        color="#3A86FF"
        bgColor="rgba(58,134,255,0.10)"
        yMin={0}
        yMax={100}
        tickCallback={(v) => `${v}%`}
        tooltipCallback={(item) => `${item.raw ?? "—"}% HR`}
      />
      <MiniChart
        title="Luz ambiental"
        unit="Iluminancia en lux"
        currentValue={latest?.light_lux != null ? `${Math.round(latest.light_lux)} lux` : null}
        data={readings.map((r) => r.light_lux)}
        labels={labels}
        color="#86C93A"
        bgColor="rgba(134,201,58,0.13)"
        yMin={0}
        tickCallback={(v) => `${v}`}
        tooltipCallback={(item) => `${item.raw ?? "—"} lux`}
      />
    </>
  );
}
