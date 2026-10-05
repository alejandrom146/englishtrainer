import type { SupabaseClient } from "@supabase/supabase-js";
import { maxState } from "@/lib/srs";

interface ConnectorUsage {
  text: string;
  correct: boolean;
  natural: boolean;
}

/**
 * Cuando un usuario usa un conector correcta y naturalmente en producción
 * activa real (Connector Challenge o Conversación), esto puede avanzar su
 * estado de aprendizaje más allá de lo que llega el módulo de vocabulario
 * (que solo llega a 'recall'). Compartido entre ambos módulos para no
 * duplicar la lógica.
 */
export async function updateConnectorProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  connectorsUsed: ConnectorUsage[]
) {
  const wellUsed = connectorsUsed.filter((c) => c.correct && c.natural);

  for (const used of wellUsed) {
    const { data: expression } = await supabase
      .from("expressions")
      .select("id")
      .eq("type", "connector")
      .eq("text", used.text)
      .maybeSingle();

    if (!expression) continue;

    const { data: existing } = await supabase
      .from("user_expressions")
      .select("*")
      .eq("user_id", userId)
      .eq("expression_id", expression.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("user_expressions").insert({
        user_id: userId,
        expression_id: expression.id,
        state: "active_use",
        times_used_in_conversation: 1,
        last_used_at: new Date().toISOString(),
      });
    } else {
      const timesUsed = existing.times_used_in_conversation + 1;
      const nextState = maxState(
        existing.state,
        timesUsed >= 4 ? "spontaneous_use" : "active_use"
      );
      await supabase
        .from("user_expressions")
        .update({
          state: nextState,
          times_used_in_conversation: timesUsed,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }
}
