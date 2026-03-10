import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
