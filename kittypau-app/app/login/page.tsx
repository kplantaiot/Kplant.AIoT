"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
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
            Monitoreo inteligente para tu mascota
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full h-11 px-4 rounded-[var(--radius)] border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
              placeholder="********"
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
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          No tienes cuenta?{" "}
          <Link href="/register" className="font-medium underline" style={{ color: "var(--primary)" }}>
            Registrate
          </Link>
        </p>
      </div>
    </div>
  )
}
