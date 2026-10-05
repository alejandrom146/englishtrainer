import type { SupabaseClient } from "@supabase/supabase-js";
import { awardXp } from "@/lib/xp";

export const CARD_SUBTYPES = {
  conversation: ["listen_understand", "main_idea", "retell"],
  dictation: ["basic_dictation", "fill_gaps", "complete_sentence"],
} as const;

const CARD_COMPLETION_BONUS = 20;

/**
 * Se llama DESPUÉS de guardar un intento. Si este era el primer intento
 * del usuario en `justCompletedSubtype` (isFirstAttempt=true) y los otros
 * 2 ejercicios de la misma card ya tenían al menos un intento, esto recién
 * ahora se completa el trío por primera vez → bonus de XP una sola vez.
 *
 * `isFirstAttempt` lo calcula quien llama (contando intentos ANTES de
 * insertar el actual) — es más confiable que tratar de reconstruirlo acá,
 * porque de lo contrario un replay del último ejercicio de una card ya
 * completa volvería a disparar el bonus.
 */
export async function checkCardCompletionBonus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  justCompletedSubtype: string,
  isFirstAttempt: boolean
) {
  if (!isFirstAttempt) return;

  const cardEntry = Object.entries(CARD_SUBTYPES).find(([, subtypes]) =>
    (subtypes as readonly string[]).includes(justCompletedSubtype)
  );
  if (!cardEntry) return;

  const [cardName, subtypes] = cardEntry;
  const otherSubtypes = (subtypes as readonly string[]).filter(
    (s) => s !== justCompletedSubtype
  );

  const { data: rows } = await supabase
    .from("user_listening_attempts")
    .select("exercise_subtype")
    .eq("user_id", userId)
    .in("exercise_subtype", otherSubtypes);

  const doneOthers = new Set((rows ?? []).map((r) => r.exercise_subtype));
  const allOthersDone = otherSubtypes.every((s) => doneOthers.has(s));

  if (allOthersDone) {
    await awardXp(
      supabase,
      userId,
      `listening_card_complete:${cardName}`,
      CARD_COMPLETION_BONUS
    );
  }
}
