"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const RANGES = [
  { key: "1h",  label: "1h" },
  { key: "6h",  label: "6h" },
  { key: "24h", label: "24h" },
  { key: "7d",  label: "7d" },
  { key: "30d", label: "30d" },
];

function RangeSelectorInner({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setRange(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: "hsl(var(--muted))" }}>
      {RANGES.map(({ key, label }) => {
        const active = current === key;
        return (
          <button
            key={key}
            onClick={() => setRange(key)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: active ? "white" : "transparent",
              color: active ? "var(--color-forest-green)" : "var(--color-sage-text)",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function PlantRangeSelector({ current }: { current: string }) {
  return (
    <Suspense fallback={null}>
      <RangeSelectorInner current={current} />
    </Suspense>
  );
}
