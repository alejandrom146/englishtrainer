import { createClient } from "@/lib/supabase/server";
import { getAllAchievementsWithStatus } from "@/lib/achievements";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function AchievementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const achievements = user ? await getAllAchievementsWithStatus(supabase, user.id) : [];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <>
      <PageHeader title="Achievements" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <p className="text-sm text-mist-400">
          {unlockedCount} / {achievements.length} desbloqueados
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-500"
            style={{
              width:
                achievements.length > 0
                  ? `${(unlockedCount / achievements.length) * 100}%`
                  : "0%",
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a) => (
            <Card
              key={a.id}
              className={`text-center ${a.unlocked ? "" : "opacity-40"}`}
            >
              <span className="text-3xl">{a.icon}</span>
              <p className="mt-2 text-sm text-mist-50">{a.title}</p>
              <p className="mt-1 text-xs text-mist-400">{a.description}</p>
              {a.unlocked && a.unlockedAt && (
                <p className="mt-2 text-xs text-teal-400">
                  {new Date(a.unlockedAt).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
