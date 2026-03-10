"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Leaf } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
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
          <div className="bg-white rounded-3xl p-6 shadow-sm border text-center" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--secondary))" }}>
              <Leaf className="w-6 h-6" style={{ color: "var(--color-forest-green)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--color-charcoal-green)" }}>
              Revisa tu correo
            </h2>
            <p className="text-sm mb-1" style={{ color: "var(--color-sage-text)" }}>
              Enviamos un enlace de confirmación a:
            </p>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--color-charcoal-green)" }}>
              {email}
            </p>
            <p className="text-xs" style={{ color: "var(--color-sage-text)" }}>
              Una vez que confirmes tu correo, podrás iniciar sesión.
            </p>
          </div>
          <p className="text-center text-sm mt-4" style={{ color: "var(--color-sage-text)" }}>
            <Link href="/login" className="font-medium" style={{ color: "var(--color-forest-green)" }}>
              Ir a inicio de sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-sage-ivory)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--color-forest-green)" }}>
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            Kplant
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-sage-text)" }}>
            Crea tu cuenta y registra tu primera planta
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--color-charcoal-green)" }}>
            Nueva cuenta
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
              />
            </div>

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
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--color-sage-text)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--color-forest-green)" }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
