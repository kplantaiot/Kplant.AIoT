"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Leaf } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL fragment automatically
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError("No se pudo actualizar la contraseña. El enlace puede haber expirado."); return; }
    router.push("/today");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-sage-ivory)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--color-forest-green)" }}>
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            Kplant
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--color-charcoal-green)" }}>
            Nueva contraseña
          </h2>

          {!ready ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--color-sage-text)" }}>
              Verificando enlace...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {[
                { label: "Nueva contraseña", value: password, setter: setPassword, complete: "new-password" },
                { label: "Confirmar contraseña", value: confirm, setter: setConfirm, complete: "new-password" },
              ].map(({ label, value, setter, complete }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>{label}</label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    required
                    autoComplete={complete}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
                  />
                </div>
              ))}

              {error && (
                <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "hsl(var(--danger) / 0.1)", color: "hsl(var(--danger))" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ background: "var(--color-forest-green)" }}
              >
                {loading ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
