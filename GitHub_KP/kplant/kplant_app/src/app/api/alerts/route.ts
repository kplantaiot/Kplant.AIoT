import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/alerts — alertas activas (no resueltas) del usuario
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("system_events")
    .select("id, device_id, plant_id, event_type, severity, message, sensor_value, threshold, created_at, plants(name)")
    .eq("owner_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
