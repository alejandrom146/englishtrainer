import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compareDictation } from "@/lib/listening/dictationDiff";
import { awardXp } from "@/lib/xp";
import { checkCardCompletionBonus } from "@/lib/listening/cardProgress";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { exercise_id, completion_text, replays, speed_used } =
    (await request.json()) as {
      exercise_id: string;
      completion_text: string;
      replays?: number;
      speed_used?: number;
    };

  if (!exercise_id || !completion_text?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from("listening_exercises")
    .select("*")
    .eq("id", exercise_id)
    .single();

  if (exerciseError || !exercise || !exercise.prompt_prefix) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  // Solo se evalúa la parte que el usuario realmente tenía que escuchar y
  // completar — el prefijo ya se lo dimos, no tiene sentido puntuarlo.
  const remainder = exercise.transcript.slice(exercise.prompt_prefix.length).trim();

  // Mismo motor determinístico que Basic Dictation — sin IA.
  const result = compareDictation(remainder, completion_text);

  const { count: priorAttempts } = await supabase
    .from("user_listening_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("exercise_subtype", "complete_sentence");

  const { data: attempt, error: attemptError } = await supabase
    .from("user_listening_attempts")
    .insert({
      user_id: user.id,
      listening_exercise_id: exercise_id,
      mode: "dictation",
      exercise_subtype: "complete_sentence",
      listening_accuracy: result.listeningAccuracy,
      word_accuracy: result.wordAccuracy,
      critical_errors: result.criticalErrors,
      minor_errors: result.minorErrors,
      word_diff: result.wordDiff,
      answers: { completion: completion_text },
      replays: replays ?? 0,
      speed_used: speed_used ?? 1,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  await Promise.all(
    result.wordDiff
      .filter((item) => item.status === "error" && item.type)
      .map((item) =>
        upsertErrorProfile(supabase, user.id, "listening", `${item.type}:${item.word}`)
      )
  );

  await awardXp(supabase, user.id, "listening_complete_sentence", 12);

  await checkCardCompletionBonus(
    supabase,
    user.id,
    "complete_sentence",
    (priorAttempts ?? 0) === 0
  );

  return NextResponse.json({ attempt, result, remainder });
}
