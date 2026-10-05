import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("exercise_id");

  let exercise;

  if (requestedId) {
    const { data, error } = await supabase
      .from("describe_image_exercises")
      .select("id, title, image_path, topic, cefr_level")
      .eq("id", requestedId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "exercise not found" }, { status: 404 });
    }
    exercise = data;
  } else {
    // Sin pedido específico: prioriza imágenes con menos intentos del
    // usuario, para dar variedad antes de repetir.
    const { data: candidates, error: candidatesError } = await supabase
      .from("describe_image_exercises")
      .select("id, title, image_path, topic, cefr_level");

    if (candidatesError) {
      return NextResponse.json({ error: candidatesError.message }, { status: 500 });
    }
    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ exercise: null });
    }

    const { data: attemptRows } = await supabase
      .from("user_describe_image_attempts")
      .select("exercise_id")
      .eq("user_id", user.id);

    const counts = new Map<string, number>();
    for (const row of attemptRows ?? []) {
      counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
    }

    const scored = candidates.map((c) => ({
      exercise: c,
      score: -(counts.get(c.id) ?? 0) + Math.random(),
    }));
    scored.sort((a, b) => b.score - a.score);
    exercise = scored[0].exercise;
  }

  const { data: history } = await supabase
    .from("user_describe_image_attempts")
    .select("attempt_number, overall_score, response_text")
    .eq("user_id", user.id)
    .eq("exercise_id", exercise.id)
    .order("attempt_number", { ascending: true });

  return NextResponse.json({ exercise, history: history ?? [] });
}
