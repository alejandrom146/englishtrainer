import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp } from "@/lib/xp";
import { checkCardCompletionBonus } from "@/lib/listening/cardProgress";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  targets?: string[];
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
    answers: number[]; // índice elegido por pregunta, en el mismo orden que exercise.questions
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

  if (exerciseError || !exercise || !exercise.questions) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  const questions = exercise.questions as Question[];

  // Evaluación 100% local — no hay nada acá que necesite IA.
  const results = questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    correct_index: q.correct_index,
    selected: answers[i] ?? null,
    correct: answers[i] === q.correct_index,
    explanation: q.explanation ?? null,
  }));

  const correctCount = results.filter((r) => r.correct).length;
  const score = (correctCount / questions.length) * 100;

  const { count: priorAttempts } = await supabase
    .from("user_listening_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("exercise_subtype", exercise.exercise_subtype);

  const { data: attempt, error: attemptError } = await supabase
    .from("user_listening_attempts")
    .insert({
      user_id: user.id,
      listening_exercise_id: exercise_id,
      mode: exercise.type,
      exercise_subtype: exercise.exercise_subtype,
      comprehension_score: score,
      answers: { selected: answers, results },
      replays: replays ?? 0,
      speed_used: speed_used ?? 1,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Los targets de las preguntas falladas alimentan el Error Profile —
  // igual que el resto del módulo, sin necesidad de IA para esto.
  const failedTargets = results.flatMap((r, i) =>
    r.correct ? [] : questions[i].targets ?? []
  );
  await Promise.all(
    failedTargets.map((target) =>
      upsertErrorProfile(supabase, user.id, "listening", `vocabulary:${target}`)
    )
  );

  await awardXp(
    supabase,
    user.id,
    `listening_${exercise.exercise_subtype}`,
    score === 100 ? 15 : 10
  );

  await checkCardCompletionBonus(
    supabase,
    user.id,
    exercise.exercise_subtype,
    (priorAttempts ?? 0) === 0
  );

  return NextResponse.json({ attempt, results, score });
}
