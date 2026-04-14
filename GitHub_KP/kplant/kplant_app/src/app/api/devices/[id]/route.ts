import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import mqtt from "mqtt";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Whitelist: only allow safe fields to be updated
  const allowed: Record<string, unknown> = {};
  if ("plant_id" in body) allowed.plant_id = body.plant_id ?? null;
  if ("device_state" in body) allowed.device_state = body.device_state;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No hay campos válidos para actualizar." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("devices")
    .update(allowed)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/devices/[id] — envía comandos al dispositivo vía MQTT
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verificar que el dispositivo pertenece al usuario
  const { data: device } = await supabase
    .from("devices")
    .select("device_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const body = await req.json();
  const { command, interval_ms } = body;

  if (command !== "SET_INTERVAL") {
    return NextResponse.json({ error: "Comando no soportado" }, { status: 400 });
  }

  const validIntervals = [60000, 300000, 900000, 3600000, 14400000, 28800000, 86400000];
  if (!validIntervals.includes(interval_ms)) {
    return NextResponse.json({ error: "Intervalo no válido" }, { status: 400 });
  }

  // Publicar comando MQTT
  const broker = process.env.MQTT_BROKER!;
  const topic = `${device.device_id}/cmd`;
  const payload = JSON.stringify({ command: "SET_INTERVAL", interval_ms });

  try {
    const client = await mqtt.connectAsync(`mqtts://${broker}:8883`, {
      username: process.env.MQTT_USER!,
      password: process.env.MQTT_PASS!,
      rejectUnauthorized: false,
      connectTimeout: 8000,
    });
    await client.publishAsync(topic, payload, { qos: 1 });
    await client.endAsync();
  } catch (err) {
    console.error("[MQTT] publish error:", err);
    return NextResponse.json({ error: "No se pudo enviar el comando al dispositivo" }, { status: 502 });
  }

  // Guardar intervalo en la base de datos
  await supabase
    .from("devices")
    .update({ sample_interval_ms: interval_ms })
    .eq("id", id)
    .eq("owner_id", user.id);

  return NextResponse.json({ ok: true });
}
