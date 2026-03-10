export default function AppLoading() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-36 rounded-xl mb-2" style={{ background: "hsl(var(--muted))" }} />
          <div className="h-4 w-24 rounded-lg" style={{ background: "hsl(var(--muted))" }} />
        </div>
        <div className="h-10 w-24 rounded-2xl" style={{ background: "hsl(var(--muted))" }} />
      </div>

      {/* Card skeletons */}
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-3xl p-5 shadow-sm border mb-4"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl" style={{ background: "hsl(var(--muted))" }} />
            <div>
              <div className="h-5 w-32 rounded-lg mb-1.5" style={{ background: "hsl(var(--muted))" }} />
              <div className="h-3 w-20 rounded-lg" style={{ background: "hsl(var(--muted))" }} />
            </div>
          </div>
          <div className="h-3 w-full rounded-full mb-2" style={{ background: "hsl(var(--muted))" }} />
          <div className="h-3 w-3/4 rounded-full" style={{ background: "hsl(var(--muted))" }} />
        </div>
      ))}
    </div>
  );
}
