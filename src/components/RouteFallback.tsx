export default function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando página"
      className="flex h-screen items-center justify-center bg-background"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
