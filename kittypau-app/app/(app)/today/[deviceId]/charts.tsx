"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import type { SensorReading } from "@/lib/types"

interface ChartsProps {
  readings: SensorReading[]
  deviceId: string
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function DeviceCharts({ readings, deviceId }: ChartsProps) {
  if (readings.length === 0) {
    return (
      <div className="rounded-[var(--radius)] p-8 text-center" style={{ background: "var(--card)" }}>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          No hay lecturas para {deviceId}
        </p>
      </div>
    )
  }

  // Preparar datos para los graficos
  const chartData = readings.map((r) => ({
    time: formatTime(r.recorded_at),
    fullTime: formatDateTime(r.recorded_at),
    temperature: r.temperature,
    humidity: r.humidity,
    light_percent: r.light_percent,
    weight: r.weight_grams,
  }))

  // Filtrar datos que tengan al menos un valor de ambiente
  const envData = chartData.filter(
    (d) => d.temperature != null || d.humidity != null || d.light_percent != null
  )

  // Filtrar datos con peso
  const weightData = chartData.filter((d) => d.weight != null)

  return (
    <div className="space-y-6">
      {/* Grafico Temperatura / Humedad / Luz */}
      <div className="rounded-[var(--radius)] p-4 space-y-3" style={{ background: "var(--card)" }}>
        <h3 className="font-semibold text-sm">Temperatura, Humedad y Luz</h3>
        {envData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={envData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.fullTime) return payload[0].payload.fullTime
                    return ""
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temp (°C)"
                  stroke="#e45a66"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  name="Humedad (%)"
                  stroke="#ea7890"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="light_percent"
                  name="Luz (%)"
                  stroke="#f5b4a2"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
            Sin datos de ambiente disponibles
          </p>
        )}
      </div>

      {/* Grafico Peso */}
      <div className="rounded-[var(--radius)] p-4 space-y-3" style={{ background: "var(--card)" }}>
        <h3 className="font-semibold text-sm">Peso (gramos)</h3>
        {weightData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  domain={["dataMin - 10", "dataMax + 10"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.fullTime) return payload[0].payload.fullTime
                    return ""
                  }}
                  formatter={(value: number) => [`${value}g`, "Peso"]}
                />
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dea09e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f5c4cc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="weight"
                  name="Peso (g)"
                  stroke="#dea09e"
                  strokeWidth={2}
                  fill="url(#weightGradient)"
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs py-8 text-center" style={{ color: "var(--muted-foreground)" }}>
            Sin datos de peso disponibles (sensor ERR_HX711)
          </p>
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
        Mostrando ultimas {readings.length} lecturas
      </p>
    </div>
  )
}
