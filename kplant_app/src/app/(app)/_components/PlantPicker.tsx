"use client";

import { useState, useEffect } from "react";
import { Search, Droplets, Sun } from "lucide-react";

type Species = {
  id: string;
  common_name: string;
  scientific_name: string;
  category: string;
  subcategory: string | null;
  light_need: string | null;
  water_frequency: string | null;
};

type Props = {
  onSelect: (s: Species) => void;
  selected: string | null; // scientific_name of currently selected
};

const SUBCATS: { key: string; label: string }[] = [
  { key: "all",       label: "Todas"     },
  { key: "tropical",  label: "Tropical"  },
  { key: "trepadora", label: "Trepadora" },
  { key: "palmera",   label: "Palmera"   },
  { key: "pequena",   label: "Pequeña"   },
  { key: "suculenta", label: "Suculenta" },
  { key: "cactus",    label: "Cactus"    },
];

const LIGHT_LABEL: Record<string, string> = {
  sol_directo:    "Sol directo",
  luz_indirecta:  "Luz indirecta",
  media_luz:      "Media luz",
  sombra:         "Sombra",
};

const WATER_LABEL: Record<string, string> = {
  diario:     "Diario",
  cada_2_dias:"Cada 2 días",
  semanal:    "Semanal",
  quincenal:  "Quincenal",
};

export function PlantPicker({ onSelect, selected }: Props) {
  const [species, setSpecies]   = useState<Species[]>([]);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/species")
      .then(r => r.json())
      .then(d => { setSpecies(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const visible = species.filter(s => {
    const matchCat = filter === "all" || s.subcategory === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || s.common_name.toLowerCase().includes(q) || s.scientific_name.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: "var(--color-sage-text)" }}>
        Cargando catálogo…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--color-sage-text)" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar planta…"
          className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none"
          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
        />
      </div>

      {/* Subcategory tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SUBCATS.map(sc => (
          <button
            key={sc.key}
            type="button"
            onClick={() => setFilter(sc.key)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: filter === sc.key ? "var(--color-forest-green)" : "hsl(var(--muted))",
              color: filter === sc.key ? "white" : "var(--color-sage-text)",
            }}
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5">
        {visible.length === 0 && (
          <p className="col-span-2 text-sm text-center py-6" style={{ color: "var(--color-sage-text)" }}>
            Sin resultados
          </p>
        )}
        {visible.map(s => {
          const isSelected = s.scientific_name === selected;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="text-left rounded-2xl p-3 border transition-all"
              style={{
                background: isSelected ? "hsl(var(--secondary))" : "white",
                borderColor: isSelected ? "var(--color-forest-green)" : "hsl(var(--border))",
                borderWidth: isSelected ? "2px" : "1px",
              }}
            >
              {/* Letter avatar */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 text-sm font-bold"
                style={{
                  background: isSelected ? "var(--color-forest-green)" : "hsl(var(--muted))",
                  color: isSelected ? "white" : "var(--color-charcoal-green)",
                }}
              >
                {s.common_name.charAt(0)}
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: "var(--color-charcoal-green)" }}>
                {s.common_name}
              </p>
              <p className="text-[10px] italic mt-0.5 leading-tight" style={{ color: "var(--color-sage-text)" }}>
                {s.scientific_name}
              </p>
              {/* Light + water hints */}
              <div className="flex gap-2 mt-2">
                {s.light_need && (
                  <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--color-sage-text)" }}>
                    <Sun className="w-2.5 h-2.5" />
                    {LIGHT_LABEL[s.light_need] ?? s.light_need}
                  </span>
                )}
                {s.water_frequency && (
                  <span className="flex items-center gap-0.5 text-[9px]" style={{ color: "var(--color-sage-text)" }}>
                    <Droplets className="w-2.5 h-2.5" />
                    {WATER_LABEL[s.water_frequency] ?? s.water_frequency}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
