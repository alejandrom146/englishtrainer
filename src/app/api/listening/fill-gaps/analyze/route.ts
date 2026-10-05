import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp } from "@/lib/xp";
import { checkCardCompletionBonus } from "@/lib/listening/cardProgress";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

function normalize(word: string): string {
  return word.trim().toLowerCase().replace(/[.,!?;:"']/g, "");
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { exercise_id, answers, replays, speed_used } = (await request.json()) as {
    exercise_id: string;
    answers: string[]; // una respuesta por espacio en blanco
    replays?: number;
    speed_used?: number;
  };

  if (!exercise_id || !Array.isArray(answers)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from("listening_exercises")
    .select("*")
    .eq("id", exercise_id)
    .single();

  if (exerciseError || !exercise || !exercise.gap_answers) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  const correctAnswers: string[] = exercise.gap_answers;

  // Local, sin IA: tolera mayúsculas/minúsculas y puntuación, pero no
  // palabras distintas — igual criterio que el resto de Listening.
  const results = correctAnswers.map((correct, i) => {
    const given = answers[i] ?? "";
    return {
      given,
      correct,
      isCorrect: normalize(given) === normalize(correct),
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = (correctCount / correctAnswers.length) * 100;

  const { count: priorAttempts } = await supabase
    .from("user_listening_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("exercise_subtype", "fill_gaps");

  const { data: attempt, error: attemptError } = await supabase
    .from("user_listening_attempts")
    .insert({
      user_id: user.id,
      listening_exercise_id: exercise_id,
      mode: "dictation",
      exercise_subtype: "fill_gaps",
      listening_accuracy: score,
      word_accuracy: score,
      critical_errors: correctAnswers.length - correctCount,
      answers: { given: answers, results },
      replays: replays ?? 0,
      speed_used: speed_used ?? 1,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  await Promise.all(
    results
      .filter((r) => !r.isCorrect)
      .map((r) => upsertErrorProfile(supabase, user.id, "listening", `fill_gap:${r.correct}`))
  );

  await awardXp(supabase, user.id, "listening_fill_gaps", score === 100 ? 15 : 10);

  await checkCardCompletionBonus(
    supabase,
    user.id,
    "fill_gaps",
    (priorAttempts ?? 0) === 0
  );

  return NextResponse.json({ attempt, results, score, gapTemplate: exercise.gap_template });
}
