import type { SupabaseClient } from "@supabase/supabase-js";

export const CATEGORY_INFO: Record<
  string,
  { label: string; explanation: string; practiceHref: string; practiceLabel: string }
> = {
  grammar: {
    label: "Grammar",
    explanation: "Errores de gramática detectados en tus conversaciones y en Describe the Image.",
    practiceHref: "/dashboard/describe-image",
    practiceLabel: "Practicar en Describe the Image",
  },
  pronunciation: {
    label: "Pronunciation",
    explanation: "Sonidos o palabras que te cuestan al hablar, detectados en el Pronunciation Lab.",
    practiceHref: "/dashboard/pronunciation",
    practiceLabel: "Ir al Pronunciation Lab",
  },
  fluency: {
    label: "Fluency",
    explanation: "Patrones relacionados con la fluidez al conversar.",
    practiceHref: "/dashboard/conversation",
    practiceLabel: "Practicar conversación",
  },
  vocabulary: {
    label: "Vocabulary",
    explanation: "Palabras que te faltó reconocer o usar correctamente.",
    practiceHref: "/dashboard/vocabulary",
    practiceLabel: "Repasar vocabulario",
  },
  connectors: {
    label: "Connectors",
    explanation: "Conectores que usas poco o incorrectamente.",
    practiceHref: "/dashboard/connectors",
    practiceLabel: "Ir al Connector Challenge",
  },
  listening: {
    label: "Listening",
    explanation: "Sonidos, contracciones o palabras que te cuestan al escuchar inglés hablado.",
    practiceHref: "/dashboard/listening",
    practiceLabel: "Practicar listening",
  },
};

export type Trend = "improving" | "stable" | "worsening";

export interface ErrorProfileItem {
  id: string;
  category: string;
  pattern: string;
  frequency: number;
  lastSeenAt: string;
  trend: Trend;
}

/**
 * La tabla guarda frecuencia acumulada y la fecha del último error, pero no
 * un historial completo — así que la "tendencia" es una estimación simple
 * a partir de esos dos datos, no una medición precisa:
 * - Si no se repite hace más de 14 días (y ya pasó más de una vez):
 *   probablemente mejoró → 'improving'.
 * - Si ocurrió 3+ veces y la última fue hace menos de 3 días: sigue
 *   siendo un problema activo → 'worsening' (llamamos la atención sobre
 *   esto, no es necesariamente que esté empeorando en sentido estricto).
 * - Cualquier otro caso: 'stable'.
 */
function computeTrend(frequency: number, lastSeenAt: string): Trend {
  const daysSinceLastSeen =
    (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);

  if (frequency > 1 && daysSinceLastSeen > 14) return "improving";
  if (frequency >= 3 && daysSinceLastSeen < 3) return "worsening";
  return "stable";
}

export async function getErrorProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<Record<string, ErrorProfileItem[]>> {
  const { data } = await supabase
    .from("error_profile")
    .select("*")
    .eq("user_id", userId)
    .order("frequency", { ascending: false });

  const grouped: Record<string, ErrorProfileItem[]> = {};

  for (const row of data ?? []) {
    const item: ErrorProfileItem = {
      id: row.id,
      category: row.category,
      pattern: row.pattern,
      frequency: row.frequency,
      lastSeenAt: row.last_seen_at,
      trend: computeTrend(row.frequency, row.last_seen_at),
    };
    grouped[row.category] = grouped[row.category] ?? [];
    grouped[row.category].push(item);
  }

  return grouped;
}

/**
 * Algunos patrones se guardan con un prefijo tipo "tipo:detalle" (ej.
 * "MISHEARD_CONTRACTION:I've", "contraction:I'll", "fill_gap:get") para
 * poder cruzarlos con target_patterns en otros módulos. Acá los volvemos
 * legibles para mostrarlos en pantalla.
 */
export function formatPattern(pattern: string): string {
  const [prefix, ...rest] = pattern.split(":");
  const detail = rest.join(":");
  if (!detail) return pattern;

  const PREFIX_LABEL: Record<string, string> = {
    contraction: "Contraction",
    reduction: "Reduction",
    vocabulary: "Word",
    fill_gap: "Missing word",
    underused: "Underused connector",
    OMITTED_WORD: "Missed word",
    WRONG_WORD: "Confused word",
    EXTRA_WORD: "Extra word",
    WRONG_TENSE: "Verb tense",
    WRONG_PLURAL: "Singular/plural",
    WRONG_PREPOSITION: "Preposition",
    WRONG_ARTICLE: "Article",
    MISHEARD_CONTRACTION: "Missed contraction",
    MISHEARD_SOUND: "Confused sound",
    SPELLING_ERROR: "Spelling (heard correctly)",
  };

  const label = PREFIX_LABEL[prefix];
  return label ? `${detail} — ${label}` : pattern;
}
