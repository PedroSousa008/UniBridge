/** Shared skeleton shown instantly while a route segment loads. */
export function RouteLoading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}
