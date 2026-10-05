import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getErrorProfile, formatPattern, CATEGORY_INFO } from "@/lib/errorProfile";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

const TREND_BADGE: Record<string, { label: string; className: string }> = {
  improving: { label: "↓ mejorando", className: "text-teal-400" },
  worsening: { label: "↑ activo", className: "text-coral-400" },
  stable: { label: "→ estable", className: "text-mist-400" },
};

// Orden fijo para que las secciones no salten de lugar entre visitas.
const CATEGORY_ORDER = [
  "connectors",
  "pronunciation",
  "listening",
  "grammar",
  "vocabulary",
  "fluency",
];

export default async function ErrorProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const grouped = user ? await getErrorProfile(supabase, user.id) : {};
  const hasAnyData = Object.keys(grouped).length > 0;

  return (
    <>
      <PageHeader title="Error Profile" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm text-mist-400">
          Los patrones que se repiten en tus errores, agrupados por área —
          se arman solos a partir de lo que practicás en el resto de la
          app.
        </p>

        {!hasAnyData && (
          <Card className="mt-6 text-center">
            <p className="text-mist-50">
              Todavía no hay suficientes datos.
            </p>
            <p className="mt-1 text-sm text-mist-400">
              A medida que practiques Pronunciation Lab, Listening,
              Connector Challenge, Conversación y Describe the Image, vas a
              empezar a ver tus patrones acá.
            </p>
          </Card>
        )}

        <div className="mt-6 flex flex-col gap-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length > 0).map((category) => {
            const info = CATEGORY_INFO[category];
            const items = grouped[category];

            return (
              <Card key={category}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-mist-50">{info.label}</p>
                    <p className="mt-1 text-xs text-mist-400">{info.explanation}</p>
                  </div>
                  <Link
                    href={info.practiceHref}
                    className="shrink-0 text-xs text-teal-400"
                  >
                    {info.practiceLabel}
                  </Link>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {items.slice(0, 8).map((item) => {
                    const trend = TREND_BADGE[item.trend];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-card border border-ink-700 bg-ink-900 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm text-mist-200">
                          {formatPattern(item.pattern)}
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-xs">
                          <span className="text-mist-400">×{item.frequency}</span>
                          <span className={trend.className}>{trend.label}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {items.length > 8 && (
                  <p className="mt-2 text-xs text-mist-400">
                    +{items.length - 8} más
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
