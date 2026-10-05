import Link from "next/link";

export function PageHeader({
  title,
  backHref = "/dashboard",
  backLabel = "Dashboard",
  maxWidth = "max-w-2xl",
  right,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  maxWidth?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 w-full border-b border-ink-800 bg-ink-950/90 backdrop-blur">
      <div className={`mx-auto flex items-center justify-between px-6 py-3 ${maxWidth}`}>
        <Link
          href={backHref}
          className="flex min-h-11 touch-manipulation items-center text-sm text-mist-400 active:text-mist-200"
        >
          ← {backLabel}
        </Link>
        <p className="text-sm font-medium text-mist-50">{title}</p>
        <div className="min-w-11">{right}</div>
      </div>
    </div>
  );
}
