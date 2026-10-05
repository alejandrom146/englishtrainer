export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-ink-700 ${className}`} />;
}

/** Skeleton con la forma de una Card de ejercicio/tarjeta — evita el salto
 * de layout entre "Cargando…" y el contenido real. */
export function CardSkeleton() {
  return (
    <div className="mx-auto max-w-md rounded-card border border-ink-700 bg-ink-800 p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-3 h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <Skeleton className="mt-6 h-11 w-full" />
    </div>
  );
}
