import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { isOnline, soilLabel, lightLabel } from "@/lib/types";
import { Wifi, WifiOff, Battery, Leaf, Clock } from "lucide-react";

export default async function AdminPage() {
  // Verificar que el usuario es admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) notFound();

  // Service client: sin RLS, ve todos los registros
  const service = createServiceClient();

  // Todos los dispositivos con su planta y owner
  const { data: devices } = await service
    .from("devices")
    .select("*, plants(name, species)")
    .order("last_seen", { ascending: false, nullsFirst: false });

  // Todos los owners (profiles)
  const { data: profiles } = await service
    .from("profiles")
    .select("id, email, user_name");

  type Profile = { id: string; email: string; user_name: string };
  const profileMap = new Map<string, Profile>((profiles ?? []).map((p: Profile) => [p.id, p]));

  // Última lectura por dispositivo
  const allDeviceIds = (devices ?? []).map((d: { device_id: string }) => d.device_id);
  const latestReadings = new Map<string, Record<string, unknown>>();

  await Promise.all(
    allDeviceIds.map(async (deviceId: string) => {
      const { data } = await service
        .from("sensor_readings")
        .select("soil_moisture, light_lux, temperature, humidity, battery_level, created_at")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) latestReadings.set(deviceId, data);
    })
  );

  const totalDevices  = devices?.length ?? 0;
  const onlineDevices = (devices ?? []).filter((d: { last_seen: string | null }) => d.last_seen && isOnline(d.last_seen)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--color-forest-green)" }}>
            ADMIN
          </span>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            Panel de dispositivos
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-sage-text)" }}>
          {totalDevices} dispositivos · {onlineDevices} en línea
        </p>
      </div>

      {/* Tabla / cards */}
      <div className="flex flex-col gap-3">
        {(devices ?? []).map((device: Record<string, any>) => {
          const owner   = device.owner_id ? profileMap.get(device.owner_id) : null;
          const reading = latestReadings.get(device.device_id);
          const online  = device.last_seen ? isOnline(device.last_seen) : false;
          const plant   = device.plants?.[0] ?? null;
          const { label: soilStatus } = soilLabel((reading?.soil_moisture as number) ?? null);

          return (
            <div
              key={device.device_id}
              className="bg-white rounded-3xl p-5 shadow-sm border"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {/* Fila superior */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {/* Estado online */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                    style={{ background: online ? "hsl(var(--success))" : "hsl(var(--muted-foreground))" }}
                  />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--color-charcoal-green)" }}>
                      {device.device_id}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-sage-text)" }}>
                      {device.device_model ?? "ESP32-C3"} · {device.device_state}
                    </p>
                  </div>
                </div>

                {/* Owner */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium" style={{ color: "var(--color-charcoal-green)" }}>
                    {owner?.user_name ?? owner?.email ?? "Sin owner"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-sage-text)" }}>
                    {owner?.email ?? device.owner_id ? "reclamado" : "sin reclamar"}
                  </p>
                </div>
              </div>

              {/* Planta asociada */}
              {plant && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Leaf className="w-3 h-3" style={{ color: "var(--color-moss-green)" }} />
                  <span className="text-xs" style={{ color: "var(--color-sage-text)" }}>
                    {plant.name}{plant.species ? ` · ${plant.species}` : ""}
                  </span>
                </div>
              )}

              {/* Lecturas */}
              {reading ? (
                <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
                  <ReadingStat label="Suelo" value={reading.soil_moisture !== null ? `${Math.round(reading.soil_moisture as number)}%` : "—"} sub={soilStatus} />
                  <ReadingStat label="Temp" value={reading.temperature !== null ? `${(Math.round((reading.temperature as number) * 10) / 10)}°C` : "—"} />
                  <ReadingStat label="Humedad" value={reading.humidity !== null ? `${Math.round(reading.humidity as number)}%` : "—"} />
                  <ReadingStat label="Luz" value={reading.light_lux !== null ? `${Math.round(reading.light_lux as number)} lux` : "—"} />
                </div>
              ) : (
                <p className="text-xs mb-3" style={{ color: "var(--color-sage-text)" }}>Sin lecturas</p>
              )}

              {/* Pie: WiFi, batería, última vez */}
              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--color-sage-text)" }}>
                <span className="flex items-center gap-1">
                  {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {device.wifi_ssid ?? "—"}
                </span>
                {reading?.battery_level !== null && reading?.battery_level !== undefined && (
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    {reading.battery_level as number}%
                  </span>
                )}
                {device.last_seen && (
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(device.last_seen).toLocaleString("es-CL", {
                      day: "2-digit", month: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadingStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-2 rounded-xl" style={{ background: "hsl(var(--muted))" }}>
      <p className="text-[10px]" style={{ color: "var(--color-sage-text)" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: "var(--color-charcoal-green)" }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--color-moss-green)" }}>{sub}</p>}
    </div>
  );
}
