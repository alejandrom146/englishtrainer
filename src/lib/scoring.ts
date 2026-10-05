import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningState } from "@/lib/srs";

// Convierte el estado de aprendizaje de una palabra/expresión en un puntaje
// 0-100. No es una medición precisa — es una forma consistente de resumir
// "qué tan lejos llegó" cada ítem, tal como pide la sección 13 del prompt
// maestro (mejor una estimación honesta que una falsa precisión).
const STATE_WEIGHT: Record<LearningState, number> = {
  new: 0,
  recognition: 15,
  understanding: 35,
  pronunciation: 55,
  recall: 55,
  active_use: 75,
  spontaneous_use: 90,
  mastered: 100,
};

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export interface SkillScoreResult {
  skill: string;
  score: number;
}

/**
 * Calcula los skill_scores disponibles a partir de datos reales. Si un
 * skill no tiene suficiente actividad todavía, simplemente no se incluye
 * en el resultado — no se inventa un número (ver sección 13: "no inventar
 * precisión falsa").
 */
export async function computeSkillScores(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<SkillScoreResult[]> {
  const results: SkillScoreResult[] = [];

  // Las 6 consultas son independientes entre sí (tablas distintas, sin
  // relación de datos) — antes se esperaban una por una (6 round-trips
  // seguidos); ahora salen todas juntas y se espera una sola vez.
  const [
    { data: vocabRows },
    { data: connectorRows },
    { data: pronunciationRows },
    { data: feedbackRows },
    { data: listeningRows },
    { data: describeImageRows },
  ] = await Promise.all([
    supabase.from("user_vocabulary").select("state").eq("user_id", userId),
    supabase
      .from("user_expressions")
      .select("state, expressions!inner(type)")
      .eq("user_id", userId)
      .eq("expressions.type", "connector"),
    supabase
      .from("pronunciation_attempts")
      .select("score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("conversation_feedback")
      .select(
        "fluency_score, grammar_notes, conversations!inner(user_id, scenario_id, conversation_scenarios(category))"
      )
      .eq("conversations.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("user_listening_attempts")
      .select("mode, comprehension_score, listening_accuracy")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_describe_image_attempts")
      .select("content_score, coherence_score, naturalness_score, connectors_score")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // --- Vocabulary: promedio ponderado del estado de todas las palabras.
  if (vocabRows && vocabRows.length > 0) {
    const avg = average(
      vocabRows.map((r) => STATE_WEIGHT[r.state as LearningState] ?? 0)
    );
    if (avg !== null) results.push({ skill: "vocabulary", score: avg });
  }

  // --- Connectors: igual que vocabulary, pero solo para expressions de
  // tipo 'connector'.
  if (connectorRows && connectorRows.length > 0) {
    const avg = average(
      connectorRows.map((r) => STATE_WEIGHT[r.state as LearningState] ?? 0)
    );
    if (avg !== null) results.push({ skill: "connectors", score: avg });
  }

  // --- Pronunciation: promedio de los últimos 10 intentos.
  if (pronunciationRows && pronunciationRows.length > 0) {
    const avg = average(
      pronunciationRows
        .map((r) => r.score)
        .filter((s): s is number => s !== null)
    );
    if (avg !== null) results.push({ skill: "pronunciation", score: avg });
  }

  // --- Fluency y Customer Service: de los últimos conversation_feedback.
  if (feedbackRows && feedbackRows.length > 0) {
    const fluencyAvg = average(
      feedbackRows
        .map((r) => r.fluency_score)
        .filter((s): s is number => s !== null)
    );
    if (fluencyAvg !== null) results.push({ skill: "fluency", score: fluencyAvg });

    // Grammar: cuantas menos notas importantes, mejor. Heurística simple,
    // no una medición gramatical real.
    const grammarPenalty = average(
      feedbackRows.map((r) =>
        Array.isArray(r.grammar_notes) ? r.grammar_notes.length : 0
      )
    );
    if (grammarPenalty !== null) {
      const grammarScore = Math.max(0, 100 - grammarPenalty * 12);
      results.push({ skill: "grammar", score: grammarScore });
    }

    // Customer service: mismo fluency_score, pero solo de conversaciones
    // dentro de esa categoría de escenario.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csRows = feedbackRows.filter((r: any) => {
      const scenario = r.conversations?.conversation_scenarios;
      const category = Array.isArray(scenario)
        ? scenario[0]?.category
        : scenario?.category;
      return category === "customer_service";
    });
    if (csRows.length > 0) {
      const csAvg = average(
        csRows
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => r.fluency_score)
          .filter((s: number | null): s is number => s !== null)
      );
      if (csAvg !== null) results.push({ skill: "customer_service", score: csAvg });
    }
  }

  // --- Listening: promedio de comprensión (conversation) y precisión
  // (dictation) de los últimos intentos. Si solo hay uno de los dos, se usa
  // solo ese — no se completa el otro con un valor inventado.
  if (listeningRows && listeningRows.length > 0) {
    const comprehensionAvg = average(
      listeningRows
        .filter((r) => r.mode === "conversation")
        .map((r) => r.comprehension_score)
        .filter((s): s is number => s !== null)
    );
    const dictationAvg = average(
      listeningRows
        .filter((r) => r.mode === "dictation")
        .map((r) => r.listening_accuracy)
        .filter((s): s is number => s !== null)
    );
    const parts = [comprehensionAvg, dictationAvg].filter(
      (s): s is number => s !== null
    );
    if (parts.length > 0) {
      results.push({ skill: "listening", score: average(parts) as number });
    }
  }

  // --- Writing (Describe the Image): promedio de content/coherence/
  // naturalness/connectors de los últimos intentos, cada uno normalizado a
  // 0-100 (en la tabla están guardados ya ponderados a su propio máximo).
  // No toca los skills "grammar"/"vocabulary"/"connectors" existentes
  // (esos siguen viniendo solo de las conversaciones) para no mezclar dos
  // fuentes con escalas distintas en el mismo número.
  if (describeImageRows && describeImageRows.length > 0) {
    const normalized = describeImageRows.flatMap((r) => {
      const parts: number[] = [];
      if (r.content_score !== null) parts.push((r.content_score / 25) * 100);
      if (r.coherence_score !== null) parts.push((r.coherence_score / 15) * 100);
      if (r.naturalness_score !== null) parts.push((r.naturalness_score / 10) * 100);
      if (r.connectors_score !== null) parts.push((r.connectors_score / 10) * 100);
      return parts;
    });
    const writingAvg = average(normalized);
    if (writingAvg !== null) results.push({ skill: "writing", score: writingAvg });
  }

  return results;
}

/**
 * Desglose específico para el dashboard (sección 25 del prompt maestro):
 * Comprehension y Dictation como números separados, no solo el promedio
 * combinado que usa `computeSkillScores` para el skill genérico.
 */
export async function computeListeningDetail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<{
  comprehension: number | null;
  dictation: number | null;
  exercisesCompleted: number;
}> {
  const { data: rows } = await supabase
    .from("user_listening_attempts")
    .select("mode, comprehension_score, listening_accuracy")
    .eq("user_id", userId);

  const all = rows ?? [];
  const comprehension = average(
    all
      .filter((r) => r.mode === "conversation")
      .map((r) => r.comprehension_score)
      .filter((s): s is number => s !== null)
  );
  const dictation = average(
    all
      .filter((r) => r.mode === "dictation")
      .map((r) => r.listening_accuracy)
      .filter((s): s is number => s !== null)
  );

  return { comprehension, dictation, exercisesCompleted: all.length };
}

/**
 * Calcula y guarda los skill_scores en la base (upsert). Se llama cada vez
 * que se pide el resumen del dashboard — es barato (sin IA de por medio) y
 * mantiene la tabla al día.
 */
export async function refreshSkillScores(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<SkillScoreResult[]> {
  const scores = await computeSkillScores(supabase, userId);

  if (scores.length > 0) {
    // Un solo upsert con todas las filas — antes eran hasta 8 round-trips
    // secuenciales (uno por skill), ahora es uno solo.
    await supabase.from("skill_scores").upsert(
      scores.map((s) => ({
        user_id: userId,
        skill: s.skill,
        score: s.score,
        confidence: "estimated",
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,skill" }
    );
  }

  return scores;
}
