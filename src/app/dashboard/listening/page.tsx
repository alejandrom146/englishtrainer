import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getListeningProgress, EXERCISE_INFO } from "@/lib/listening/sectionProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListeningExercisePlayer } from "@/components/listening/ListeningExercisePlayer";

const CARDS: { key: "conversation" | "dictation"; title: string; description: string; subtypes: string[] }[] = [
  {
    key: "conversation",
    title: "Conversation Listening",
    description:
      "Escucha una conversación entre dos personas y practica tu comprensión de distintas formas.",
    subtypes: ["listen_understand", "main_idea", "retell"],
  },
  {
    key: "dictation",
    title: "Write what you hear (Dictation)",
    description: "Escucha con atención y escribe exactamente lo que escuchaste.",
    subtypes: ["basic_dictation", "fill_gaps", "complete_sentence"],
  },
];

export default async function ListeningPage({
  searchParams,
}: {
  searchParams: { subtype?: string };
}) {
  const subtype = searchParams.subtype;

  if (subtype) {
    const title = EXERCISE_INFO[subtype]?.title ?? "Listening";
    return (
      <>
        <PageHeader title={title} backHref="/dashboard/listening" backLabel="Ejercicios" />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <ListeningExercisePlayer subtype={subtype} />
        </main>
      </>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const progress = user ? await getListeningProgress(supabase, user.id) : {};

  return (
    <>
      <PageHeader title="🎧 Listening" />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-6">
          {CARDS.map((card) => {
            const completedCount = card.subtypes.filter(
              (s) => progress[s]?.attempted
            ).length;
            const allDone = completedCount === card.subtypes.length;
            // Promedio de los mejores scores, solo entre los ya intentados.
            const scores = card.subtypes
              .map((s) => progress[s]?.bestScore)
              .filter((s): s is number => s !== null && s !== undefined);
            const avgScore =
              scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : null;

            return (
              <Card key={card.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-mist-50">{card.title}</p>
                    <p className="mt-1 text-sm text-mist-400">{card.description}</p>
                  </div>
                  {allDone ? (
                    <span className="shrink-0 text-xs text-teal-400">
                      ✓ Completed{avgScore !== null ? ` · ${avgScore}%` : ""}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-mist-400">
                      {completedCount}/{card.subtypes.length}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {card.subtypes.map((subtypeKey, i) => {
                    const info = EXERCISE_INFO[subtypeKey];
                    const p = progress[subtypeKey];
                    return (
                      <div
                        key={subtypeKey}
                        className="flex items-center justify-between gap-3 rounded-card border border-ink-700 bg-ink-900 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-mist-50">
                            [{i + 1}] {info.title}
                            {p?.attempted && (
                              <span className="ml-2 text-xs text-teal-400">
                                ✓{p.bestScore !== null ? ` ${Math.round(p.bestScore)}%` : ""}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-mist-400">
                            {info.description}
                          </p>
                        </div>
                        <Link href={`/dashboard/listening?subtype=${subtypeKey}`} className="shrink-0">
                          <Button variant={p?.attempted ? "ghost" : "primary"}>
                            {p?.attempted ? "Repetir" : "Empezar"}
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
