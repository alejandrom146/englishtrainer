"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SkillBar } from "@/components/dashboard/SkillBar";
import type { DashboardSummary } from "@/lib/dashboardSummary";

const SKILL_LABEL: Record<string, string> = {
  vocabulary: "Vocabulary",
  connectors: "Connectors",
  pronunciation: "Pronunciation",
  fluency: "Fluency",
  grammar: "Grammar",
  customer_service: "Customer Service",
  listening: "Listening",
  writing: "Writing",
};

// Orden fijo para que las barras no salten de lugar entre visitas.
const SKILL_ORDER = [
  "fluency",
  "pronunciation",
  "vocabulary",
  "connectors",
  "grammar",
  "customer_service",
  "listening",
  "writing",
];

export function DashboardStats({
  initialSummary,
}: {
  /** Calculado en el servidor (ver dashboard/page.tsx) — evita el parpadeo
   * de "cargando" en la página más visitada de la app. */
  initialSummary?: DashboardSummary;
}) {
  const [summary, setSummary] = useState<DashboardSummary | null>(
    initialSummary ?? null
  );

  useEffect(() => {
    // Si ya vino del servidor, no hace falta pedirlo de nuevo al montar.
    if (initialSummary) return;
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => setSummary(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skillMap = new Map(
    (summary?.skills ?? []).map((s) => [s.skill, s.score])
  );
  const skillsToShow = SKILL_ORDER.filter((s) => skillMap.has(s));

  return (
    <>
      {summary && summary.newlyUnlockedAchievements.length > 0 && (
        <div className="flex flex-col gap-2">
          {summary.newlyUnlockedAchievements.map((a) => (
            <div
              key={a.code}
              className="flex items-center gap-3 rounded-card border border-amber-400 bg-ink-900 px-4 py-3"
            >
              <span className="text-2xl">{a.icon}</span>
              <div>
                <p className="text-sm text-mist-50">
                  Achievement unlocked: {a.title}
                </p>
                <p className="text-xs text-mist-400">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-amber-400">
        🔥 {summary ? summary.streak : "…"} day streak
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-mist-400">LEVEL {summary?.level ?? "…"}</p>
          <p className="text-xs text-mist-400">
            {summary ? `${summary.xpIntoLevel} / ${summary.xpPerLevel} XP` : ""}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-500"
            style={{
              width: summary
                ? `${(summary.xpIntoLevel / summary.xpPerLevel) * 100}%`
                : "0%",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-mist-400">
          {summary
            ? `${summary.activeDaysThisWeek} / 7 días activos (últimos 7 días)`
            : ""}
        </p>
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-mist-400">WEEKLY GOAL</p>
          <p className="text-xs text-mist-400">
            {summary
              ? `${summary.weeklyGoal.current_value} / ${summary.weeklyGoal.target_value} días`
              : ""}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              summary?.weeklyGoal.status === "completed" ? "bg-teal-400" : "bg-amber-400"
            }`}
            style={{
              width: summary
                ? `${Math.min(
                    100,
                    (summary.weeklyGoal.current_value / summary.weeklyGoal.target_value) * 100
                  )}%`
                : "0%",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-mist-400">
          {summary?.weeklyGoal.status === "completed"
            ? "🎉 Meta de la semana cumplida"
            : "Practica al menos algo, la mayoría de los días de la semana."}
        </p>
      </Card>

      <Card className="mt-6">
        <p className="text-xs text-mist-400">SKILLS</p>
        <div className="mt-4 flex flex-col gap-4">
          {summary && skillsToShow.length === 0 && (
            <p className="text-sm text-mist-400">
              Todavía no hay suficiente actividad para calcular tus
              habilidades — practica un poco y vuelve.
            </p>
          )}
          {skillsToShow.map((skill) => (
            <SkillBar
              key={skill}
              label={SKILL_LABEL[skill] ?? skill}
              value={Math.round(skillMap.get(skill) ?? 0)}
            />
          ))}
        </div>
      </Card>

      {summary && summary.listening.exercisesCompleted > 0 && (
        <Card className="mt-6">
          <p className="text-xs text-mist-400">LISTENING</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-mist-400">COMPREHENSION</p>
              <p className="text-2xl font-semibold text-teal-400">
                {summary.listening.comprehension !== null
                  ? Math.round(summary.listening.comprehension)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-mist-400">DICTATION</p>
              <p className="text-2xl font-semibold text-teal-400">
                {summary.listening.dictation !== null
                  ? Math.round(summary.listening.dictation)
                  : "—"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-mist-400">
            {summary.listening.exercisesCompleted} ejercicios completados
          </p>
        </Card>
      )}

      <Link
        href="/dashboard/achievements"
        className="mt-6 inline-block text-xs text-teal-400"
      >
        🏆 Ver mis achievements →
      </Link>
    </>
  );
}
