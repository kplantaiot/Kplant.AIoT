import Link from "next/link";
import { Leaf, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PlantCard } from "../_components/PlantCard";
import { type PlantWithData } from "@/lib/types";

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch plants
  const { data: plants } = await supabase
    .from("plants")
    .select("*, devices(id, device_id, last_seen, wifi_status, sensor_health, device_model)")
    .eq("owner_id", user!.id)
    .order("created_at");

  // Fetch latest reading per device
  const plantsWithData: PlantWithData[] = await Promise.all(
    (plants ?? []).map(async (plant) => {
      const device = plant.devices?.[0] ?? null;
      let reading = null;

      if (device?.device_id) {
        const { data } = await supabase
          .from("sensor_readings")
          .select("*")
          .eq("device_id", device.device_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        reading = data;
      }

      return {
        ...plant,
        device: device ? { ...device, owner_id: user!.id, plant_id: plant.id, device_type: null, device_state: "active", wifi_ssid: null, wifi_ip: null } : null,
        reading,
      };
    })
  );

  const noPlants = plantsWithData.length === 0;

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            Mis plantas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-sage-text)" }}>
            {noPlants ? "Todavía no hay plantas" : `${plantsWithData.length} planta${plantsWithData.length > 1 ? "s" : ""} registrada${plantsWithData.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <Link
          href="/registro"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white"
          style={{ background: "var(--color-forest-green)" }}
        >
          <Plus className="w-4 h-4" />
          Nueva
        </Link>
      </div>

      {/* Empty state */}
      {noPlants && (
        <div className="flex flex-col items-center gap-4 mt-16 text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "hsl(var(--muted))" }}>
            <Leaf className="w-8 h-8" style={{ color: "var(--color-moss-green)" }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--color-charcoal-green)" }}>Registra tu primera planta</p>
            <p className="text-sm mt-1" style={{ color: "var(--color-sage-text)" }}>
              Conecta tu dispositivo Kplant y empieza a monitorear.
            </p>
          </div>
          <Link
            href="/registro"
            className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: "var(--color-forest-green)" }}
          >
            Empezar
          </Link>
        </div>
      )}

      {/* Plant cards */}
      <div className="flex flex-col gap-4">
        {plantsWithData.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </div>
  );
}
