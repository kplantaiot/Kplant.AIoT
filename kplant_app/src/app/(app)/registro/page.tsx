"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Leaf, Flower2, Cpu, Check, ChevronRight, PenLine } from "lucide-react";
import { PlantPicker } from "../_components/PlantPicker";

type Step = 1 | 2 | 3;

const STEPS = [
  { num: 1, label: "Planta",      icon: Flower2 },
  { num: 2, label: "Dispositivo", icon: Cpu },
  { num: 3, label: "Listo",       icon: Check },
];

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingPlantId = searchParams.get("plant_id");

  const [step, setStep] = useState<Step>(existingPlantId ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — plant data
  const [plantName, setPlantName]   = useState("");
  const [species, setSpecies]       = useState("");       // scientific name
  const [location, setLocation]     = useState("");
  const [plantId, setPlantId]       = useState<string | null>(existingPlantId);
  const [customName, setCustomName] = useState(false);   // user typed own name

  // Step 2 — device
  const [deviceCode, setDeviceCode] = useState("");

  // Auto-redirect on step 3
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => router.push("/today"), 3000);
    return () => clearTimeout(t);
  }, [step, router]);

  // --- Step 1: create plant ---
  async function handleCreatePlant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!plantName.trim()) { setError("Ingresa un nombre para la planta."); return; }
    setLoading(true);

    const res = await fetch("/api/plants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: plantName, species, location }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? "Error al crear la planta."); setLoading(false); return; }

    setPlantId(data.id);
    setLoading(false);
    setStep(2);
  }

  // --- Step 2: link device ---
  async function handleLinkDevice(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!deviceCode.trim()) { setError("Ingresa el código del dispositivo."); return; }
    setLoading(true);

    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceCode.trim().toUpperCase(), plant_id: plantId }),
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error ?? "Error al vincular el dispositivo."); setLoading(false); return; }

    setLoading(false);
    setStep(3);
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--color-forest-green)" }}>
          <Leaf className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
          Kplant
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map(({ num, label, icon: Icon }, i) => {
          const done = step > num;
          const active = step === num;
          return (
            <div key={num} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: done ? "var(--color-moss-green)" : active ? "var(--color-forest-green)" : "hsl(var(--muted))",
                    color: done || active ? "white" : "var(--color-sage-text)",
                  }}
                >
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: active ? "var(--color-forest-green)" : "var(--color-sage-text)" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mb-4 rounded-full" style={{ background: step > num ? "var(--color-moss-green)" : "hsl(var(--border))" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Planta */}
      {step === 1 && (
        <form onSubmit={handleCreatePlant} className="flex flex-col gap-4">
          {/* Catalog picker */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
              ¿Qué tipo de planta es?
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-sage-text)" }}>
              Selecciona del catálogo para autocompletar sus datos de cuidado.
            </p>
            <PlantPicker
              selected={species}
              onSelect={s => {
                setSpecies(s.scientific_name);
                if (!customName) setPlantName(s.common_name);
              }}
            />
          </div>

          {/* Name + location */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
              Personaliza
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-sage-text)" }}>
              Ponle un nombre y dinos dónde está.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>
                  Nombre *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={plantName}
                    onChange={e => { setPlantName(e.target.value); setCustomName(true); }}
                    placeholder="Ej: Mi Monstera, Poto del baño…"
                    className="w-full rounded-xl border pl-4 pr-9 py-2.5 text-sm outline-none"
                    style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
                  />
                  <PenLine className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-sage-text)" }} />
                </div>
              </div>
              <Field label="Ubicación" value={location} onChange={setLocation} placeholder="Ej: Living, Balcón, Dormitorio" />
            </div>
          </div>

          {error && <ErrorMsg>{error}</ErrorMsg>}

          <SubmitBtn loading={loading}>
            Siguiente <ChevronRight className="w-4 h-4" />
          </SubmitBtn>
        </form>
      )}

      {/* Step 2 — Dispositivo */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border" style={{ borderColor: "hsl(var(--border))" }}>
          <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            Vincula tu dispositivo
          </h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-sage-text)" }}>
            Ingresa el código impreso en tu Kplant (ej: <strong>KPPL0001</strong>). El dispositivo debe estar encendido y conectado a WiFi.
          </p>

          <form onSubmit={handleLinkDevice} className="flex flex-col gap-4">
            <Field
              label="Código del dispositivo"
              value={deviceCode}
              onChange={(v) => setDeviceCode(v.toUpperCase())}
              placeholder="KPPL0001"
            />

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <SubmitBtn loading={loading}>
              Vincular <ChevronRight className="w-4 h-4" />
            </SubmitBtn>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-center underline"
              style={{ color: "var(--color-sage-text)" }}
            >
              Hacerlo más tarde
            </button>
          </form>
        </div>
      )}

      {/* Step 3 — Listo */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--success) / 0.15)" }}>
            <Check className="w-7 h-7" style={{ color: "hsl(var(--success))" }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-fraunces)", color: "var(--color-charcoal-green)" }}>
            ¡Todo listo!
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--color-sage-text)" }}>
            {plantName} está registrada. En unos momentos verás las primeras lecturas.
          </p>
          <button
            onClick={() => router.push("/today")}
            className="w-full rounded-2xl py-3 text-sm font-semibold text-white"
            style={{ background: "var(--color-forest-green)" }}
          >
            Ver mis plantas
          </button>
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--color-charcoal-green)" }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
        style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted))", color: "var(--color-charcoal-green)" }}
      />
    </div>
  );
}

function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "hsl(var(--danger) / 0.1)", color: "hsl(var(--danger))" }}>
      {children}
    </p>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-semibold text-white transition disabled:opacity-60"
      style={{ background: "var(--color-forest-green)" }}
    >
      {loading ? "Procesando..." : children}
    </button>
  );
}
