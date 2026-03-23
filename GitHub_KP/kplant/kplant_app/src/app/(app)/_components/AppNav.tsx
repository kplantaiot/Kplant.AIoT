"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Leaf, Home, Plus, Settings, LogOut, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

const NAV_ITEMS = [
  { href: "/today",    label: "Inicio",  icon: Home },
  { href: "/registro", label: "Nueva",   icon: Plus },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function AppNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center justify-between px-8 py-4 border-b" style={{ background: "#0D3B1A", borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/today" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--color-forest-green)" }}>
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg" style={{ fontFamily: "var(--font-fraunces)", color: "white" }}>
            Kplant
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: pathname.startsWith(href) ? "rgba(255,255,255,0.12)" : "transparent",
                color: pathname.startsWith(href) ? "white" : "rgba(255,255,255,0.55)",
              }}
            >
              {label}
            </Link>
          ))}
          {admin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: pathname.startsWith("/admin") ? "rgba(255,255,255,0.12)" : "transparent",
                color: pathname.startsWith("/admin") ? "white" : "rgba(255,255,255,0.55)",
              }}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors min-w-0"
                style={{ color: active ? "var(--color-forest-green)" : "var(--color-sage-text)" }}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          {admin && (
            <Link
              href="/admin"
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors min-w-0"
              style={{ color: pathname.startsWith("/admin") ? "var(--color-forest-green)" : "var(--color-sage-text)" }}
            >
              <Shield className="w-5 h-5" strokeWidth={pathname.startsWith("/admin") ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
