import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { device_id, plant_id } = body;

  if (!device_id?.trim()) {
    return NextResponse.json({ error: "El código del dispositivo es requerido." }, { status: 400 });
  }

  const code = device_id.trim().toUpperCase();

  if (!code.startsWith("KPPL")) {
    return NextResponse.json({ error: "Código inválido. Debe empezar con KPPL." }, { status: 400 });
  }

  // Check if device exists (registered by bridge) and is unclaimed
  const { data: existing } = await supabase
    .from("devices")
    .select("id, owner_id")
    .eq("device_id", code)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({
      error: "Dispositivo no encontrado. Asegúrate de que esté encendido y conectado a WiFi."
    }, { status: 404 });
  }

  if (existing.owner_id && existing.owner_id !== user.id) {
    return NextResponse.json({ error: "Este dispositivo ya pertenece a otra cuenta." }, { status: 409 });
  }

  // Claim the device — uses service client to bypass RLS on unowned devices
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from("devices")
    .update({ owner_id: user.id, plant_id: plant_id ?? null, device_state: "linked" })
    .eq("device_id", code)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 200 });
}
