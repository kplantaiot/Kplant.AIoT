"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Kplant]", error);
  }, [error]);

  return (
    <div className="max-w-sm mx-auto px-4 pt-20 flex flex-col items-center text-center gap-5">
      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center"
        style={{ background: "hsl(var(--danger) / 0.1)" }}
      >
        <AlertTriangle className="w-8 h-8" style={{ color: "hsl(var(--danger))" }} />
      </div>
      <div>
        <p className="font-semibold text-lg" style={{ color: "var(--color-charcoal-green)" }}>
          Algo salió mal
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-sage-text)" }}>
          Ocurrió un error inesperado. Intenta de nuevo.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
        style={{ background: "var(--color-forest-green)" }}
      >
        Reintentar
      </button>
    </div>
  );
}
