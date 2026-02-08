import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LogOut } from "lucide-react"

async function signOut() {
  "use server"
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 h-20 flex items-center justify-between px-4 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <Link href="/today" className="flex items-center gap-3">
          <Image src="/logo.jpg" alt="Kittypau" width={80} height={80} className="rounded-lg" />
          <span className="text-3xl font-bold" style={{ color: "var(--primary)", fontFamily: "var(--font-titan-one)" }}>
            Kittypau
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs hidden sm:block" style={{ color: "var(--muted-foreground)" }}>
            {user.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="p-2 rounded-full hover:opacity-70 transition-opacity"
              title="Cerrar sesion"
            >
              <LogOut size={18} style={{ color: "var(--muted-foreground)" }} />
            </button>
          </form>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around border-t z-50"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <NavItem href="/today" label="Hoy" />
        <NavItem href="/pet" label="Mascota" />
        <NavItem href="/bowl" label="Plato" />
        <NavItem href="/settings" label="Config" />
      </nav>
    </div>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 text-xs font-medium px-3 py-1 rounded-lg transition-colors hover:opacity-70"
      style={{ color: "var(--muted-foreground)" }}
    >
      {label}
    </Link>
  )
}
