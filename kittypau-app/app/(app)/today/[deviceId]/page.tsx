import { createClient } from "@/lib/supabase/server"
import type { Device } from "@/lib/types"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DeviceCharts } from "./charts"

interface PageProps {
  params: Promise<{ deviceId: string }>
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const { deviceId } = await params
  const supabase = await createClient()

  // Info del dispositivo
  const { data: device } = await supabase
    .from("devices")
    .select("*")
    .eq("device_id", deviceId)
    .single()

  // Ultimas 200 lecturas (aprox 30 min a 10s/lectura)
  const { data: readings } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: true })
    .limit(200)

  if (!device) {
    return (
      <div className="space-y-4">
        <Link href="/today" className="inline-flex items-center gap-1 text-sm hover:opacity-70" style={{ color: "var(--primary)" }}>
          <ArrowLeft size={16} /> Volver
        </Link>
        <p>Dispositivo no encontrado</p>
      </div>
    )
  }

  const isOnline = device.last_seen &&
    (Date.now() - new Date(device.last_seen).getTime()) < 60000

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/today" className="p-2 rounded-full hover:opacity-70 transition-opacity" style={{ color: "var(--primary)" }}>
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-titan-one)", color: "var(--primary)" }}>
            {device.device_id}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {device.device_type || "Dispositivo"}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: isOnline ? "var(--success)" : "var(--danger)" }} />
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </span>
            {device.sensor_health && (
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{
                  background: device.sensor_health === "OK" ? "var(--success)" : "var(--warning)",
                  color: "white",
                }}
              >
                {device.sensor_health}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard label="WiFi" value={device.wifi_ssid || "—"} />
        <InfoCard label="IP" value={device.wifi_ip || "—"} />
        <InfoCard label="Estado" value={device.device_state} />
        <InfoCard label="Ultima lectura" value={device.last_seen ? new Date(device.last_seen).toLocaleTimeString("es-CL") : "—"} />
      </div>

      {/* Charts */}
      <DeviceCharts readings={readings || []} deviceId={deviceId} />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] p-3" style={{ background: "var(--card)" }}>
      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </div>
  )
}
