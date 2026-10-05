import type { SupabaseClient } from "@supabase/supabase-js";

function toDateKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD (UTC — suficiente para un MVP de un solo usuario)
}

/**
 * Un día "cuenta" si el usuario hizo cualquier práctica real: revisar
 * vocabulario, el Connector Challenge, un intento de pronunciación, o una
 * conversación. Se calculan los días consecutivos terminando hoy o ayer
 * (si hoy todavía no practicó, el streak no se corta hasta medianoche).
 */
export async function computeStreak(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<{ streak: number; activeDaysThisWeek: number }> {
  const since = new Date();
  since.setDate(since.getDate() - 60); // ventana suficiente para el streak actual

  const [vocab, connectors, pronunciation, conversations] = await Promise.all([
    supabase
      .from("user_vocabulary")
      .select("last_reviewed_at")
      .eq("user_id", userId)
      .gte("last_reviewed_at", since.toISOString()),
    supabase
      .from("connector_challenge_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString()),
    supabase
      .from("pronunciation_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString()),
    supabase
      .from("conversations")
      .select("started_at")
      .eq("user_id", userId)
      .gte("started_at", since.toISOString()),
  ]);

  const dateKeys = new Set<string>();
  for (const row of vocab.data ?? []) {
    if (row.last_reviewed_at) dateKeys.add(toDateKey(row.last_reviewed_at));
  }
  for (const row of connectors.data ?? []) {
    dateKeys.add(toDateKey(row.created_at));
  }
  for (const row of pronunciation.data ?? []) {
    dateKeys.add(toDateKey(row.created_at));
  }
  for (const row of conversations.data ?? []) {
    dateKeys.add(toDateKey(row.started_at));
  }

  // Streak: cuenta hacia atrás desde hoy mientras haya actividad cada día.
  let streak = 0;
  const cursor = new Date();
  // Si hoy no hay actividad todavía, no rompe el streak — empieza desde ayer.
  if (!dateKeys.has(toDateKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dateKeys.has(toDateKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Días activos en los últimos 7 días (para el "weekly goal" del dashboard).
  let activeDaysThisWeek = 0;
  const weekCursor = new Date();
  for (let i = 0; i < 7; i++) {
    if (dateKeys.has(toDateKey(weekCursor.toISOString()))) activeDaysThisWeek++;
    weekCursor.setDate(weekCursor.getDate() - 1);
  }

  return { streak, activeDaysThisWeek };
}
