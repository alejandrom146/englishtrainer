import type { SkillScoreResult } from "@/lib/scoring";

export type BlockType =
  | "vocabulary"
  | "connectors"
  | "pronunciation"
  | "conversation"
  | "listening_conversation"
  | "listening_dictation";

export interface DailyBlock {
  type: BlockType;
  minutes: number;
}

export const BLOCK_INFO: Record<
  BlockType,
  { label: string; href: string; skill: string; dailyTarget: number }
> = {
  vocabulary: {
    label: "Vocabulary",
    href: "/dashboard/vocabulary",
    skill: "vocabulary",
    dailyTarget: 3, // al menos 3 revisiones cuenta como "hecho hoy"
  },
  connectors: {
    label: "Connector Challenge",
    href: "/dashboard/connectors",
    skill: "connectors",
    dailyTarget: 1,
  },
  pronunciation: {
    label: "Pronunciation Lab",
    href: "/dashboard/pronunciation",
    skill: "pronunciation",
    dailyTarget: 1,
  },
  conversation: {
    label: "AI Conversation",
    href: "/dashboard/conversation",
    skill: "fluency",
    dailyTarget: 1,
  },
  listening_conversation: {
    label: "Listening Conversation",
    href: "/dashboard/listening?subtype=listen_understand",
    skill: "listening",
    dailyTarget: 1,
  },
  listening_dictation: {
    label: "Dictation",
    href: "/dashboard/listening?subtype=basic_dictation",
    skill: "listening",
    dailyTarget: 1,
  },
};

const MIN_BLOCK_MINUTES = 3;

/**
 * Varía el tiempo total de la sesión entre 30 y 45 minutos según el día del
 * mes — no aleatorio (para que recargar la página no cambie el plan del
 * día), pero tampoco siempre igual, tal como pide la sección 2 del prompt
 * maestro.
 */
/**
 * Varía el tiempo total de la sesión alrededor de la meta diaria del
 * usuario (Settings) según el día del mes — no aleatorio (para que
 * recargar la página no cambie el plan del día), pero tampoco siempre
 * igual, tal como pide la sección 2 del prompt maestro. Si el usuario no
 * configuró nada, usa 35 minutos como centro por default.
 */
export function totalMinutesForDate(date: Date, baseMinutes = 35): number {
  const options = [baseMinutes - 5, baseMinutes, baseMinutes + 5, baseMinutes + 10];
  const clamped = options.map((m) => Math.max(15, m));
  return clamped[date.getDate() % clamped.length];
}

/**
 * Reparte los minutos del día entre los 4 módulos según qué tan débil está
 * cada habilidad. Un skill sin datos todavía recibe una prioridad media
 * (para animar a probarlo), no la más alta ni la más baja.
 */
export function buildDailyPlan(
  scores: SkillScoreResult[],
  totalMinutes: number
): { blocks: DailyBlock[]; generatedReason: string } {
  const scoreMap = new Map(scores.map((s) => [s.skill, s.score]));

  const weights = (Object.keys(BLOCK_INFO) as BlockType[]).map((type) => {
    const skillScore = scoreMap.get(BLOCK_INFO[type].skill);
    const weight = skillScore === undefined ? 55 : Math.max(15, 100 - skillScore);
    return { type, weight, skillScore };
  });

  const sumWeights = weights.reduce((a, b) => a + b.weight, 0);

  const raw = weights.map((w) => ({
    type: w.type,
    minutes: Math.max(
      MIN_BLOCK_MINUTES,
      Math.round((w.weight / sumWeights) * totalMinutes)
    ),
  }));

  // Ajusta el redondeo para que la suma total sea exacta.
  let diff = totalMinutes - raw.reduce((a, b) => a + b.minutes, 0);
  let i = 0;
  while (diff !== 0 && raw.length > 0) {
    const idx = i % raw.length;
    if (diff > 0) {
      raw[idx].minutes += 1;
      diff -= 1;
    } else if (raw[idx].minutes > MIN_BLOCK_MINUTES) {
      raw[idx].minutes -= 1;
      diff += 1;
    }
    i++;
    if (i > 100) break; // salvaguarda
  }

  // Explicación legible: cuál fue el skill más débil que se priorizó.
  const weakest = weights
    .filter((w) => w.skillScore !== undefined)
    .sort((a, b) => (a.skillScore ?? 0) - (b.skillScore ?? 0))[0];

  let generatedReason: string;
  if (weakest) {
    generatedReason = `Tu punto más débil hoy es ${BLOCK_INFO[weakest.type].label} (${Math.round(
      weakest.skillScore ?? 0
    )}/100) — le dimos más minutos que al resto.`;
  } else {
    generatedReason =
      "Todavía no hay suficiente actividad para saber qué priorizar — hoy repartimos el tiempo parejo entre los módulos.";
  }

  return { blocks: raw, generatedReason };
}
