import { createClient } from "@/lib/supabase/server";
import { getAiUsageSummary } from "@/lib/aiUsage";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

const FEATURE_LABEL: Record<string, string> = {
  conversation_start: "Conversación — inicio",
  conversation_message: "Conversación — mensajes",
  conversation_feedback: "Conversación — reporte final",
  connector_challenge_analysis: "Connector Challenge",
  pronunciation_analysis: "Pronunciation Lab",
  listening_comprehension_analysis: "Listening — comprensión",
  describe_image_analysis: "Describe the Image",
};

function formatUsd(n: number): string {
  if (n < 0.01) return `< $0.01`;
  return `$${n.toFixed(2)}`;
}

export default async function AiUsagePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const summary = user ? await getAiUsageSummary(user.id) : null;
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("ai_daily_limit_usd, ai_monthly_limit_usd")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <PageHeader title="Consumo de IA" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm text-mist-400">
          Estimado a partir de los tokens que cada llamada registró —
          precios aproximados de Gemini, no una factura exacta. La
          reproducción de audio (escuchar ejercicios) nunca está incluida
          acá: es gratis, la hace tu navegador.
        </p>

        {!summary && (
          <Card className="mt-6 text-center">
            <p className="text-mist-50">No pudimos cargar tu consumo.</p>
          </Card>
        )}

        {summary && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <Card className="p-3 text-center sm:p-5">
                <p className="text-xs text-mist-400">HOY</p>
                <p className="mt-1 truncate text-lg font-semibold text-teal-400 sm:text-xl">
                  {formatUsd(summary.today.estimatedCostUsd)}
                </p>
                <p className="text-xs text-mist-400">{summary.today.calls} llamadas</p>
                {profile?.ai_daily_limit_usd != null && (
                  <p className="mt-1 text-xs text-mist-400">
                    de {formatUsd(profile.ai_daily_limit_usd)}
                  </p>
                )}
              </Card>
              <Card className="p-3 text-center sm:p-5">
                <p className="text-xs text-mist-400">ESTE MES</p>
                <p className="mt-1 truncate text-lg font-semibold text-teal-400 sm:text-xl">
                  {formatUsd(summary.thisMonth.estimatedCostUsd)}
                </p>
                <p className="text-xs text-mist-400">{summary.thisMonth.calls} llamadas</p>
                {profile?.ai_monthly_limit_usd != null && (
                  <p className="mt-1 text-xs text-mist-400">
                    de {formatUsd(profile.ai_monthly_limit_usd)}
                  </p>
                )}
              </Card>
              <Card className="p-3 text-center sm:p-5">
                <p className="text-xs text-mist-400">TOTAL</p>
                <p className="mt-1 truncate text-lg font-semibold text-amber-400 sm:text-xl">
                  {formatUsd(summary.allTime.estimatedCostUsd)}
                </p>
                <p className="text-xs text-mist-400">{summary.allTime.calls} llamadas</p>
              </Card>
            </div>

            <Card className="mt-6">
              <p className="text-xs text-mist-400">POR MÓDULO (histórico)</p>
              {summary.byFeature.length === 0 && (
                <p className="mt-3 text-sm text-mist-400">
                  Todavía no usaste ningún módulo con IA.
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2">
                {summary.byFeature.map((f) => (
                  <div
                    key={f.feature}
                    className="flex items-center justify-between gap-3 rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm text-mist-200">
                        {FEATURE_LABEL[f.feature] ?? f.feature}
                      </p>
                      <p className="text-xs text-mist-400">{f.calls} llamadas</p>
                    </div>
                    <p className="text-sm text-mist-50">{formatUsd(f.estimatedCostUsd)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <p className="mt-4 text-xs text-mist-400">
              Estos módulos usan IA: Connector Challenge, Conversación,
              Listening (solo Retell/Listen &amp; Understand/Main Idea),
              Pronunciation Lab y Describe the Image. Vocabulary, Dictation,
              Fill the Gaps y Complete the Sentence son 100% locales — no
              generan ningún costo.
            </p>
          </>
        )}
      </main>
    </>
  );
}
