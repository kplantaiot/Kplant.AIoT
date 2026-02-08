export default function BowlPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-titan-one)", color: "var(--primary)" }}>
        Plato
      </h2>
      <div className="rounded-[var(--radius)] p-8 text-center" style={{ background: "var(--card)" }}>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Proximamente: estado de tus dispositivos
        </p>
      </div>
    </div>
  )
}
