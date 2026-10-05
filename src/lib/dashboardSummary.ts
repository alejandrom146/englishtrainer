import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshSkillScores, computeListeningDetail } from "@/lib/scoring";
import { computeStreak } from "@/lib/streak";
import { getOrCreateWeeklyGoal, type WeeklyGoal } from "@/lib/weeklyGoal";
import { checkAndUnlockAchievements, type Achievement } from "@/lib/achievements";

export interface DashboardSummary {
  skills: { skill: string; score: number }[];
  streak: number;
  activeDaysThisWeek: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpPerLevel: number;
  listening: {
    comprehension: number | null;
    dictation: number | null;
    exercisesCompleted: number;
  };
  weeklyGoal: WeeklyGoal;
  newlyUnlockedAchievements: Achievement[];
}

// Fórmula simple: cada nivel pide un poco más de XP que el anterior.
// No es la fórmula final del juego, solo algo razonable para mostrar
// progreso mientras no hay más usuarios para calibrarla.
function levelFromXp(totalXp: number) {
  const xpPerLevel = 200;
  const level = Math.floor(totalXp / xpPerLevel) + 1;
  const xpIntoLevel = totalXp % xpPerLevel;
  return { level, xpIntoLevel, xpPerLevel };
}

/**
 * Un solo lugar para calcular el resumen del dashboard — lo usa tanto la
 * ruta API (para refrescos desde el cliente) como el Server Component del
 * dashboard (para renderizar los datos ya calculados en el primer HTML,
 * sin esperar un fetch adicional desde el navegador).
 */
export async function getDashboardSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<DashboardSummary> {
  const [skills, streakInfo, xpRows, listeningDetail, weeklyGoal] = await Promise.all([
    refreshSkillScores(supabase, userId),
    computeStreak(supabase, userId),
    supabase.from("xp_events").select("amount").eq("user_id", userId),
    computeListeningDetail(supabase, userId),
    getOrCreateWeeklyGoal(supabase, userId),
  ]);

  const totalXp = (xpRows.data ?? []).reduce(
    (sum: number, r: { amount: number }) => sum + r.amount,
    0
  );
  const { level, xpIntoLevel, xpPerLevel } = levelFromXp(totalXp);

  // Corre después del resto (no en el mismo Promise.all): algunas
  // condiciones de achievements (ej. "cumplir una meta semanal") dependen
  // de que getOrCreateWeeklyGoal ya haya cerrado la semana anterior. Le
  // pasamos streak/XP ya calculados para que no los vuelva a consultar.
  const newlyUnlockedAchievements = await checkAndUnlockAchievements(supabase, userId, {
    streak: streakInfo.streak,
    totalXp,
  });

  return {
    skills,
    streak: streakInfo.streak,
    activeDaysThisWeek: streakInfo.activeDaysThisWeek,
    totalXp,
    level,
    xpIntoLevel,
    xpPerLevel,
    listening: listeningDetail,
    weeklyGoal,
    newlyUnlockedAchievements,
  };
}
