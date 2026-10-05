import type { SupabaseClient } from "@supabase/supabase-js";
import { computeStreak } from "@/lib/streak";

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
}

export interface AchievementStatus extends Achievement {
  unlocked: boolean;
  unlockedAt: string | null;
}

async function countRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  table: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extra?: (q: any) => any
): Promise<number> {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (extra) query = extra(query);
  const { count } = await query;
  return count ?? 0;
}

/**
 * Revisa todas las condiciones de achievements y desbloquea las que ya se
 * cumplen pero todavía no están otorgadas. Se llama desde
 * getDashboardSummary (cada vez que se abre el dashboard) en vez de desde
 * cada ruta de cada módulo — así no hay que tocar 10 archivos distintos
 * cada vez que se agrega un logro nuevo. El costo: un logro se "nota"
 * recién la próxima vez que el usuario entra al dashboard, no en el
 * instante exacto en que lo cumple — un trade-off razonable.
 *
 * IMPORTANTE (rendimiento): esto se ejecuta en CADA carga del dashboard,
 * así que todas las condiciones se chequean EN PARALELO (Promise.all), no
 * una por una — con 18 logros, hacerlo secuencial eran ~15 round-trips a
 * la base uno atrás del otro (varios segundos reales). También corta
 * de entrada si ya están todos desbloqueados (2 consultas nomás), y
 * reutiliza streak/XP si ya los calculó quien llama, en vez de
 * recalcularlos de nuevo acá.
 */
export async function checkAndUnlockAchievements(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  precomputed?: { streak?: number; totalXp?: number }
): Promise<Achievement[]> {
  const [{ data: allAchievements }, { data: unlockedRows }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);

  if (!allAchievements || allAchievements.length === 0) return [];

  const unlockedIds = new Set((unlockedRows ?? []).map((r) => r.achievement_id));
  const byCode = new Map(allAchievements.map((a) => [a.code, a]));

  // Ya están todos — no hace falta chequear ni una condición más.
  if (unlockedIds.size >= allAchievements.length) return [];

  const isLocked = (code: string) => {
    const a = byCode.get(code);
    return !!a && !unlockedIds.has(a.id);
  };

  // Cada chequeo es una función independiente que devuelve el/los código/s
  // que desbloquea, o null — todas corren juntas con Promise.all más abajo.
  const checks: Promise<string[]>[] = [];

  if (isLocked("first_steps")) {
    checks.push(
      (async () => {
        if (precomputed?.totalXp !== undefined) {
          return precomputed.totalXp > 0 ? ["first_steps"] : [];
        }
        const n = await countRows(supabase, "xp_events", userId);
        return n > 0 ? ["first_steps"] : [];
      })()
    );
  }

  if (isLocked("first_vocabulary") || isLocked("vocabulary_25")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "user_vocabulary", userId);
        const out: string[] = [];
        if (n >= 1 && isLocked("first_vocabulary")) out.push("first_vocabulary");
        if (n >= 25 && isLocked("vocabulary_25")) out.push("vocabulary_25");
        return out;
      })()
    );
  }

  if (isLocked("vocabulary_mastered_5")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "user_vocabulary", userId, (q) =>
          q.eq("state", "mastered")
        );
        return n >= 5 ? ["vocabulary_mastered_5"] : [];
      })()
    );
  }

  if (isLocked("first_connector")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "connector_challenge_attempts", userId);
        return n >= 1 ? ["first_connector"] : [];
      })()
    );
  }

  if (isLocked("connectors_active_10")) {
    checks.push(
      (async () => {
        const { data: expressionRows } = await supabase
          .from("user_expressions")
          .select("state, expressions!inner(type)")
          .eq("user_id", userId)
          .eq("expressions.type", "connector")
          .in("state", ["active_use", "spontaneous_use", "mastered"]);
        return (expressionRows ?? []).length >= 10 ? ["connectors_active_10"] : [];
      })()
    );
  }

  if (isLocked("first_pronunciation")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "pronunciation_attempts", userId);
        return n >= 1 ? ["first_pronunciation"] : [];
      })()
    );
  }

  if (isLocked("first_conversation") || isLocked("conversations_10")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "conversations", userId, (q) =>
          q.not("ended_at", "is", null)
        );
        const out: string[] = [];
        if (n >= 1 && isLocked("first_conversation")) out.push("first_conversation");
        if (n >= 10 && isLocked("conversations_10")) out.push("conversations_10");
        return out;
      })()
    );
  }

  if (isLocked("first_listening") || isLocked("listening_10")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "user_listening_attempts", userId);
        const out: string[] = [];
        if (n >= 1 && isLocked("first_listening")) out.push("first_listening");
        if (n >= 10 && isLocked("listening_10")) out.push("listening_10");
        return out;
      })()
    );
  }

  if (isLocked("perfect_dictation")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "user_listening_attempts", userId, (q) =>
          q.eq("mode", "dictation").eq("listening_accuracy", 100)
        );
        return n >= 1 ? ["perfect_dictation"] : [];
      })()
    );
  }

  if (isLocked("first_describe_image")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "user_describe_image_attempts", userId);
        return n >= 1 ? ["first_describe_image"] : [];
      })()
    );
  }

  if (isLocked("streak_7") || isLocked("streak_30")) {
    checks.push(
      (async () => {
        const streak = precomputed?.streak ?? (await computeStreak(supabase, userId)).streak;
        const out: string[] = [];
        if (streak >= 7 && isLocked("streak_7")) out.push("streak_7");
        if (streak >= 30 && isLocked("streak_30")) out.push("streak_30");
        return out;
      })()
    );
  }

  if (isLocked("level_5")) {
    checks.push(
      (async () => {
        let totalXp = precomputed?.totalXp;
        if (totalXp === undefined) {
          const { data: xpRows } = await supabase
            .from("xp_events")
            .select("amount")
            .eq("user_id", userId);
          totalXp = (xpRows ?? []).reduce((sum, r) => sum + r.amount, 0);
        }
        const level = Math.floor(totalXp / 200) + 1;
        return level >= 5 ? ["level_5"] : [];
      })()
    );
  }

  if (isLocked("weekly_goal_complete")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "goals", userId, (q) =>
          q.eq("type", "weekly").eq("status", "completed")
        );
        return n >= 1 ? ["weekly_goal_complete"] : [];
      })()
    );
  }

  if (isLocked("daily_challenge_complete")) {
    checks.push(
      (async () => {
        const n = await countRows(supabase, "daily_challenges", userId, (q) =>
          q.eq("status", "completed")
        );
        return n >= 1 ? ["daily_challenge_complete"] : [];
      })()
    );
  }

  const results = await Promise.all(checks);
  const toUnlock = results.flat();

  if (toUnlock.length === 0) return [];

  // Los inserts también van en paralelo — no hay dependencia entre ellos.
  const inserted = await Promise.all(
    toUnlock.map(async (code) => {
      const achievement = byCode.get(code);
      if (!achievement) return null;
      const { error } = await supabase.from("user_achievements").insert({
        user_id: userId,
        achievement_id: achievement.id,
      });
      return error ? null : achievement;
    })
  );

  return inserted.filter((a): a is Achievement => a !== null);
}

export async function getAllAchievementsWithStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<AchievementStatus[]> {
  const [{ data: all }, { data: unlocked }] = await Promise.all([
    supabase.from("achievements").select("*").order("code"),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId),
  ]);

  const unlockedMap = new Map(
    (unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at])
  );

  return (all ?? []).map((a) => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}
