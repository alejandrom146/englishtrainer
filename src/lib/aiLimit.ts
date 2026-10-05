import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCostUsd } from "@/lib/aiUsage";

export interface AiLimitCheck {
  ok: boolean;
  message?: string;
}

/**
 * Se llama al PRINCIPIO de cada ruta que gasta IA (Connector Challenge,
 * Conversación, Pronunciation Lab, Listening — solo los 3 subtipos con
 * IA — y Describe the Image), antes de llamar a Gemini. Si el usuario
 * configuró un límite en Settings y ya lo alcanzó hoy o este mes, corta
 * acá — no se hace la llamada, no se gasta nada de más.
 *
 * Si el usuario no configuró ningún límite (`null` en ambas columnas,
 * el default), esto no bloquea nunca — el límite es opt-in.
 */
export async function checkAiLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<AiLimitCheck> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_daily_limit_usd, ai_monthly_limit_usd")
    .eq("id", userId)
    .maybeSingle();

  const dailyLimit = profile?.ai_daily_limit_usd ?? null;
  const monthlyLimit = profile?.ai_monthly_limit_usd ?? null;

  if (dailyLimit === null && monthlyLimit === null) {
    return { ok: true };
  }

  // ai_usage_events no tiene RLS de usuario — se lee con service role,
  // igual que en la pantalla de consumo (src/lib/aiUsage.ts).
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("ai_usage_events")
    .select("model, input_tokens, output_tokens, created_at")
    .eq("user_id", userId);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  );

  let todaySpend = 0;
  let monthSpend = 0;
  for (const row of rows ?? []) {
    const cost = estimateCostUsd(row.model, row.input_tokens ?? 0, row.output_tokens ?? 0);
    const createdAt = new Date(row.created_at);
    if (createdAt >= startOfMonth) monthSpend += cost;
    if (createdAt >= startOfDay) todaySpend += cost;
  }

  if (dailyLimit !== null && todaySpend >= dailyLimit) {
    return {
      ok: false,
      message: `Llegaste a tu límite diario de IA ($${dailyLimit.toFixed(2)}). Podés subirlo en Settings o esperar a mañana.`,
    };
  }
  if (monthlyLimit !== null && monthSpend >= monthlyLimit) {
    return {
      ok: false,
      message: `Llegaste a tu límite mensual de IA ($${monthlyLimit.toFixed(2)}). Podés subirlo en Settings.`,
    };
  }

  return { ok: true };
}
