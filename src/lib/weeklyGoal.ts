import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_WEEKLY_TARGET = 5; // días activos por semana

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Lunes a domingo (UTC) de la semana que contiene `date` — mismo criterio
 * simple de "día" que ya usa el resto de la app (ver src/lib/streak.ts). */
function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = date.getUTCDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() + diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

/**
 * Cuenta días distintos con actividad real dentro de un rango — junta las
 * mismas fuentes que ya usa el streak, más los módulos que se agregaron
 * después (Listening, Describe the Image), para que "día activo" cuente
 * cualquier práctica real, no solo las 4 originales.
 */
async function countActiveDaysInRange(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  start: Date,
  end: Date
): Promise<number> {
  const startIso = start.toISOString();
  const endIso = new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString(); // exclusivo

  const [vocab, connectors, pronunciation, conversations, listening, describeImage] =
    await Promise.all([
      supabase
        .from("user_vocabulary")
        .select("last_reviewed_at")
        .eq("user_id", userId)
        .gte("last_reviewed_at", startIso)
        .lt("last_reviewed_at", endIso),
      supabase
        .from("connector_challenge_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      supabase
        .from("pronunciation_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      supabase
        .from("conversations")
        .select("started_at")
        .eq("user_id", userId)
        .gte("started_at", startIso)
        .lt("started_at", endIso),
      supabase
        .from("user_listening_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      supabase
        .from("user_describe_image_attempts")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
    ]);

  const dateKeys = new Set<string>();
  for (const row of vocab.data ?? []) {
    if (row.last_reviewed_at) dateKeys.add(toDateKey(row.last_reviewed_at));
  }
  for (const row of connectors.data ?? []) dateKeys.add(toDateKey(row.created_at));
  for (const row of pronunciation.data ?? []) dateKeys.add(toDateKey(row.created_at));
  for (const row of conversations.data ?? []) dateKeys.add(toDateKey(row.started_at));
  for (const row of listening.data ?? []) dateKeys.add(toDateKey(row.created_at));
  for (const row of describeImage.data ?? []) dateKeys.add(toDateKey(row.created_at));

  return dateKeys.size;
}

export interface WeeklyGoal {
  id: string;
  target_value: number;
  current_value: number;
  status: "active" | "completed" | "failed";
  period_start: string;
  period_end: string;
}

/**
 * Devuelve la meta semanal vigente, creándola si hace falta y
 * actualizando su progreso. De paso, cierra (completed/failed) cualquier
 * meta semanal anterior que haya quedado abierta.
 */
export async function getOrCreateWeeklyGoal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<WeeklyGoal> {
  const now = new Date();
  const { start, end } = getWeekBounds(now);
  const periodStart = toDateKey(start.toISOString());
  const periodEnd = toDateKey(end.toISOString());

  // Cierra metas semanales viejas que quedaron 'active' (de sesiones
  // anteriores en las que el usuario no volvió a abrir el dashboard).
  const { data: staleGoals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "weekly")
    .eq("status", "active")
    .lt("period_start", periodStart);

  for (const stale of staleGoals ?? []) {
    const staleEnd = new Date(stale.period_end + "T00:00:00.000Z");
    const staleStart = new Date(stale.period_start + "T00:00:00.000Z");
    const finalValue = await countActiveDaysInRange(supabase, userId, staleStart, staleEnd);
    await supabase
      .from("goals")
      .update({
        current_value: finalValue,
        status: finalValue >= stale.target_value ? "completed" : "failed",
      })
      .eq("id", stale.id);
  }

  let { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "weekly")
    .eq("period_start", periodStart)
    .maybeSingle();

  if (!goal) {
    const { data: inserted } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        type: "weekly",
        metric: "active_days",
        target_value: DEFAULT_WEEKLY_TARGET,
        current_value: 0,
        period_start: periodStart,
        period_end: periodEnd,
        status: "active",
      })
      .select()
      .single();
    goal = inserted;
  }

  const currentValue = await countActiveDaysInRange(supabase, userId, start, end);
  const status = currentValue >= goal.target_value ? "completed" : "active";

  if (currentValue !== goal.current_value || status !== goal.status) {
    await supabase
      .from("goals")
      .update({ current_value: currentValue, status })
      .eq("id", goal.id);
  }

  return { ...goal, current_value: currentValue, status };
}
