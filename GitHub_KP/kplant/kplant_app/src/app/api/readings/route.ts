import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id"); // TEXT id (KPPL0001)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  if (!deviceId) {
    return NextResponse.json({ error: "device_id requerido" }, { status: 400 });
  }

  // Verify the device belongs to this user
  const { data: device } = await supabase
    .from("devices")
    .select("id")
    .eq("device_id", deviceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!device) return NextResponse.json({ error: "Dispositivo no encontrado." }, { status: 404 });

  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
