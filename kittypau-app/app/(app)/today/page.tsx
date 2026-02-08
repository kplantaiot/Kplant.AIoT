import { createClient } from "@/lib/supabase/server"
import type { SensorReading, Device } from "@/lib/types"
import Link from "next/link"

export default async function TodayPage() {
  const supabase = await createClient()

  // Obtener dispositivos
  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .order("device_id")

  // Obtener ultima lectura por dispositivo (via vista latest_readings)
  const { data: latestReadings } = await supabase
    .from("latest_readings")
    .select("*")

  // Crear mapa de lecturas por device_id
  const readingsMap = new Map<string, SensorReading>()
  latestReadings?.forEach((r: SensorReading) => {
    readingsMap.set(r.device_id, r)
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-titan-one)", color: "var(--primary)" }}>
          Hoy
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Estado actual de tus dispositivos
        </p>
      </div>

      {/* Dispositivos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {devices?.map((device: Device) => {
          const reading = readingsMap.get(device.device_id)
          return (
            <DeviceCard key={device.device_id} device={device} reading={reading} />
          )
        })}
      </div>

      {(!devices || devices.length === 0) && (
        <div
          className="text-center py-12 rounded-[var(--radius)]"
          style={{ background: "var(--card)" }}
        >
          <p className="text-lg font-medium">No hay dispositivos</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
            Los dispositivos apareceran aqui cuando el bridge los registre
          </p>
        </div>
      )}
    </div>
  )
}

function DeviceCard({ device, reading }: { device: Device; reading?: SensorReading }) {
  const isOnline = device.last_seen &&
    (Date.now() - new Date(device.last_seen).getTime()) < 60000

  const sensorOk = device.sensor_health === "OK"

  return (
    <div
      className="rounded-[var(--radius)] p-4 space-y-3 shadow-sm"
      style={{ background: "var(--card)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/today/${device.device_id}`} className="font-semibold text-sm underline hover:opacity-70 transition-opacity" style={{ color: "var(--primary)" }}>{device.device_id}</Link>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {device.device_type || "Dispositivo"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: isOnline ? "var(--success)" : "var(--danger)" }}
          />
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Sensor Health */}
      {device.sensor_health && (
        <div
          className="text-xs px-2 py-1 rounded-md inline-block"
          style={{
            background: sensorOk ? "var(--success)" : "var(--warning)",
            color: "white",
            opacity: 0.9,
          }}
        >
          {device.sensor_health}
        </div>
      )}

      {/* Readings */}
      {reading ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Peso" value={reading.weight_grams != null ? `${reading.weight_grams}g` : "—"} />
          <Stat label="Temp" value={reading.temperature != null ? `${reading.temperature}°C` : "—"} />
          <Stat label="Humedad" value={reading.humidity != null ? `${reading.humidity}%` : "—"} />
          <Stat label="Luz" value={reading.light_condition || "—"} />
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Sin lecturas aun
        </p>
      )}

      {/* Last seen */}
      {device.last_seen && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Ultima lectura: {new Date(device.last_seen).toLocaleString("es-CL")}
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-md p-2"
      style={{ background: "var(--muted)" }}
    >
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
