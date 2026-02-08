import { createClient } from "@/lib/supabase/server"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-titan-one)", color: "var(--primary)" }}>
        Configuracion
      </h2>
      <div className="rounded-[var(--radius)] p-4 space-y-3" style={{ background: "var(--card)" }}>
        <div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Email</p>
          <p className="text-sm font-medium">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>ID</p>
          <p className="text-sm font-mono">{user?.id}</p>
        </div>
      </div>
    </div>
  )
}
