import { notFound } from "next/navigation";
import Link from "next/link";
import { Wifi, WifiOff, Battery, Cpu, ArrowLeft, Flower2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isOnline, timeAgo } from "@/lib/types";
import { DeviceActions } from "./DeviceActions";

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: device } = await supabase
    .from("devices")
    .select("*, plants(id, name)")
    .eq("id", id)
    .eq("owner_id", user!.id)
    .maybeSingle();

  if (!device) notFound();

  const { data: lastReading } = await supabase
    .from("sensor_readings")
    .select("battery_level, battery_voltage, created_at")
    .eq("device_id", device.device_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const online = isOnline(device.last_seen);

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      {/* Back */}
      <Link href="/today" className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--color-sage-text)" }}>
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
        {device.device_id}
      </h1>

      <div className="flex flex-col gap-4">
        {/* Status card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-sage-text)" }}>ESTADO</h2>
          <div className="flex flex-col gap-3">
            <Row
              label="Conexión"
              value={online ? "En línea" : "Sin conexión"}
              icon={online ? Wifi : WifiOff}
              valueColor={online ? "hsl(var(--success))" : "hsl(var(--danger))"}
            />
            <Row label="Última vez visto" value={timeAgo(device.last_seen)} />
            <Row label="Red WiFi" value={device.wifi_ssid ?? "—"} />
            <Row label="IP" value={device.wifi_ip ?? "—"} />
            <Row label="Sensor" value={device.sensor_health ?? "—"} />
          </div>
        </div>

        {/* Hardware card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-sage-text)" }}>HARDWARE</h2>
          <div className="flex flex-col gap-3">
            <Row label="Modelo" value={device.device_model ?? "ESP32-C3 SuperMini"} icon={Cpu} />
            <Row label="Tipo" value={device.device_type ?? "plant_monitor"} />
            <Row label="Estado" value={device.device_state ?? "—"} />
          </div>
        </div>

        {/* Battery card */}
        {lastReading && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-sage-text)" }}>BATERÍA</h2>
            <div className="flex flex-col gap-3">
              <Row label="Nivel" value={lastReading.battery_level !== null ? `${Math.round(lastReading.battery_level)}%` : "—"} icon={Battery} />
              <Row label="Voltaje" value={lastReading.battery_voltage !== null ? `${lastReading.battery_voltage.toFixed(2)}V` : "—"} />
              <Row label="Última lectura" value={timeAgo(lastReading.created_at)} />
            </div>
            {lastReading.battery_level !== null && (
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted))" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(lastReading.battery_level, 100)}%`,
                    background: lastReading.battery_level < 20 ? "hsl(var(--danger))" : "var(--color-moss-green)",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Plant link */}
        {device.plants && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-sage-text)" }}>PLANTA VINCULADA</h2>
            <Link
              href={`/plant/${device.plants.id}`}
              className="flex items-center gap-3 p-3 rounded-2xl transition"
              style={{ background: "hsl(var(--muted))" }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--secondary))" }}>
                <Flower2 className="w-4 h-4" style={{ color: "var(--color-forest-green)" }} />
              </div>
              <span className="font-medium text-sm" style={{ color: "var(--color-charcoal-green)" }}>
                {device.plants.name}
              </span>
            </Link>
          </div>
        )}

        <DeviceActions deviceId={device.id} hasPlant={!!device.plants} />
      </div>
    </div>
  );
}

function Row({ label, value, icon: Icon, valueColor }: {
  label: string; value: string; icon?: React.ElementType; valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--color-sage-text)" }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color: valueColor ?? "var(--color-charcoal-green)" }} />}
        <span className="text-sm font-medium" style={{ color: valueColor ?? "var(--color-charcoal-green)" }}>{value}</span>
      </div>
    </div>
  );
}
