import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registra un evento de XP. No falla la request si algo sale mal — ganar
 * XP nunca debería romper el flujo principal (guardar una revisión,
 * analizar una conversación, etc).
 */
export async function awardXp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  source: string,
  amount: number
) {
  try {
    await supabase.from("xp_events").insert({ user_id: userId, source, amount });
  } catch {
    // no crítico
  }
}
