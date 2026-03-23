"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { PlantPicker } from "@/app/(app)/_components/PlantPicker";

type Plant = { id: string; name: string; species: string | null; location: string | null };

export function PlantActions({ plant }: { plant: Plant }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(plant.name);
  const [species, setSpecies] = useState(plant.species ?? "");
  const [location, setLocation] = useState(plant.location ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  async function handleSave() {
    if (!name.trim()) { setError("El nombre es requerido."); return; }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/plants/${plant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, species, location }),
    });
    setLoading(false);
    if (!res.ok) { setError("No se pudo guardar."); return; }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/plants/${plant.id}`, { method: "DELETE" });
    router.push("/today");
  }

  if (deleting) {
    return (
      <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <p className="text-sm font-medium mb-4" style={{ color: "var(--color-charcoal-green)" }}>
          ¿Eliminar &quot;{plant.name}&quot;? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleting(false)}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium border"
            style={{ borderColor: "hsl(var(--border))", color: "var(--color-charcoal-green)" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "hsl(var(--danger))" }}
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-sage-text)" }}>EDITAR PLANTA</h2>
          <button onClick={() => setEditing(false)}>
            <X className="w-4 h-4" style={{ color: "var(--color-sage-text)" }} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {/* Nombre */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--color-sage-text)" }}>Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
            />
          </div>

          {/* Especie con picker */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" style={{ color: "var(--color-sage-text)" }}>Especie</label>
              <button
                type="button"
                onClick={() => setShowPicker(v => !v)}
                className="text-xs underline"
                style={{ color: "var(--color-forest-green)" }}
              >
                {showPicker ? "Ocultar catálogo" : "Elegir del catálogo"}
              </button>
            </div>
            <input
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Ej: Monstera deliciosa"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
            />
            {showPicker && (
              <div className="mt-1">
                <PlantPicker
                  selected={species}
                  onSelect={s => {
                    setSpecies(s.scientific_name);
                    setShowPicker(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Ubicación */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: "var(--color-sage-text)" }}>Ubicación</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "hsl(var(--danger))" }}>{error}</p>}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white mt-1 disabled:opacity-60"
            style={{ background: "var(--color-forest-green)" }}
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setEditing(true)}
        className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium border"
        style={{ borderColor: "hsl(var(--border))", color: "var(--color-charcoal-green)", background: "white" }}
      >
        <Pencil className="w-4 h-4" /> Editar
      </button>
      <button
        onClick={() => setDeleting(true)}
        className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border"
        style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--danger))", background: "white" }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
