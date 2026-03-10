"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/today");
    router.refresh();
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
            El bienestar de tus plantas, en tu bolsillo
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--color-charcoal-green)" }}>
            Inicia sesión
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
                style={{
                  borderColor: "hsl(var(--border))",
                  background: "hsl(var(--muted))",
                  color: "var(--color-charcoal-green)",
                  "--tw-ring-color": "hsl(var(--ring))",
                } as React.CSSProperties}
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
                autoComplete="current-password"
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2"
                style={{
                  borderColor: "hsl(var(--border))",
                  background: "hsl(var(--muted))",
                  color: "var(--color-charcoal-green)",
                } as React.CSSProperties}
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
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: "var(--color-sage-text)" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium" style={{ color: "var(--color-forest-green)" }}>
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
