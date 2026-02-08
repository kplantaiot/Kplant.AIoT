"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden")
      return
    }

    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.user && !data.session) {
      // Email confirmation is enabled - user created but not authenticated
      setError("Revisa tu email para confirmar la cuenta, o desactiva la confirmacion en Supabase Dashboard → Authentication → Providers → Email")
      setLoading(false)
    } else {
      router.push("/today")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <Image src="/logo.jpg" alt="Kittypau" width={160} height={160} className="mx-auto" />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Crea tu cuenta
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-[var(--radius)] border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Contrasena
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-[var(--radius)] border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
              placeholder="Minimo 8 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirmar contrasena
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-[var(--radius)] border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
              placeholder="Repite la contrasena"
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-[var(--radius)] text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium underline" style={{ color: "var(--primary)" }}>
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
