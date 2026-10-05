import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registra (o incrementa la frecuencia de) un patrón de error en
 * error_profile. Este mismo select-then-upsert estaba duplicado en 6
 * rutas distintas (pronunciation, listening ×4, describe-image) — se
 * centraliza acá para no repetirlo, y de paso queda un solo lugar para
 * optimizar si hace falta más adelante.
 */
export async function upsertErrorProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  category: string,
  pattern: string
) {
  const { data: existing } = await supabase
    .from("error_profile")
    .select("*")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("pattern", pattern)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("error_profile")
      .update({
        frequency: existing.frequency + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("error_profile").insert({
      user_id: userId,
      category,
      pattern,
      frequency: 1,
    });
  }
}
