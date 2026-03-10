import Link from "next/link";
import { Leaf } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="max-w-sm mx-auto px-4 pt-20 flex flex-col items-center text-center gap-5">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center"
        style={{ background: "hsl(var(--muted))" }}
      >
        <Leaf className="w-8 h-8" style={{ color: "var(--color-moss-green)" }} />
      </div>
      <div>
        <p className="font-semibold text-lg" style={{ color: "var(--color-charcoal-green)" }}>
          No encontrado
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-sage-text)" }}>
          Esta página no existe o no tienes acceso.
        </p>
      </div>
      <Link
        href="/today"
        className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
        style={{ background: "var(--color-forest-green)" }}
      >
        Ir al inicio
      </Link>
    </div>
  );
}
