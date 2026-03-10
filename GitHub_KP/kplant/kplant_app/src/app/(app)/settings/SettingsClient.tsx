"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function SettingsClient({ email, ownerName }: { email: string; ownerName: string }) {
  const router = useRouter();
  const [name, setName] = useState(ownerName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_name: name }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Profile card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-charcoal-green)" }}>Perfil</h2>

        {/* Email (read only) */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl" style={{ background: "hsl(var(--muted))" }}>
          <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-sage-text)" }} />
          <span className="text-sm" style={{ color: "var(--color-charcoal-green)" }}>{email}</span>
        </div>

        {/* Name */}
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--color-charcoal-green)" }}>
              <User className="w-3.5 h-3.5" /> Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
            style={{ background: saved ? "hsl(var(--success))" : "var(--color-forest-green)" }}
          >
            {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-charcoal-green)" }}>Cuenta</h2>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold border transition"
          style={{ borderColor: "hsl(var(--danger) / 0.3)", color: "hsl(var(--danger))" }}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
