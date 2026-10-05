import type { SupabaseClient } from "@supabase/supabase-js";

export const EXERCISE_INFO: Record<
  string,
  { title: string; description: string; card: "conversation" | "dictation" }
> = {
  listen_understand: {
    title: "Listen & Understand",
    description: "Listen to a short conversation and answer questions.",
    card: "conversation",
  },
  main_idea: {
    title: "Main Idea",
    description: "Listen and identify the main idea.",
    card: "conversation",
  },
  retell: {
    title: "Retell",
    description: "Listen and explain what you understood, in your own words.",
    card: "conversation",
  },
  basic_dictation: {
    title: "Basic Dictation",
    description: "Listen to a sentence and write exactly what you hear.",
    card: "dictation",
  },
  fill_gaps: {
    title: "Fill the Gaps",
    description: "Listen and fill in the missing word(s).",
    card: "dictation",
  },
  complete_sentence: {
    title: "Complete the Sentence",
    description: "Listen and complete what you hear.",
    card: "dictation",
  },
};

export interface SectionProgress {
  attempted: boolean;
  bestScore: number | null;
}

/**
 * Un intento guarda su score en distinta columna según el subtipo
 * (comprehension_score para multiple choice/retell, listening_accuracy
 * para los de dictation) — esta función normaliza eso a un solo número
 * por intento para poder calcular el mejor score de cada ejercicio.
 */
export async function getListeningProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<Record<string, SectionProgress>> {
  const { data: rows } = await supabase
    .from("user_listening_attempts")
    .select("exercise_subtype, comprehension_score, listening_accuracy")
    .eq("user_id", userId)
    .not("exercise_subtype", "is", null);

  const progress: Record<string, SectionProgress> = {};

  for (const subtype of Object.keys(EXERCISE_INFO)) {
    const attempts = (rows ?? []).filter((r) => r.exercise_subtype === subtype);
    if (attempts.length === 0) {
      progress[subtype] = { attempted: false, bestScore: null };
      continue;
    }
    const scores = attempts
      .map((a) => a.comprehension_score ?? a.listening_accuracy)
      .filter((s): s is number => s !== null && s !== undefined);
    progress[subtype] = {
      attempted: true,
      bestScore: scores.length > 0 ? Math.max(...scores) : null,
    };
  }

  return progress;
}
