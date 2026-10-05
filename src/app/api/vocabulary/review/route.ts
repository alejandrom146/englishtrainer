import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewCard, dueAtFromInterval, type ReviewQuality } from "@/lib/srs";
import { awardXp } from "@/lib/xp";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { user_vocabulary_id, quality } = body as {
    user_vocabulary_id: string;
    quality: ReviewQuality;
  };

  if (!user_vocabulary_id || !quality) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: current, error: fetchError } = await supabase
    .from("user_vocabulary")
    .select("*")
    .eq("id", user_vocabulary_id)
    .eq("user_id", user.id) // pertenencia, aunque RLS ya lo garantiza
    .single();

  if (fetchError || !current) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  const next = reviewCard(
    {
      ease_factor: current.ease_factor,
      interval_days: current.interval_days,
      repetitions: current.repetitions,
      state: current.state,
    },
    quality
  );

  const { data: updated, error: updateError } = await supabase
    .from("user_vocabulary")
    .update({
      ease_factor: next.ease_factor,
      interval_days: next.interval_days,
      repetitions: next.repetitions,
      state: next.state,
      due_at: dueAtFromInterval(next.interval_days),
      times_seen: current.times_seen + 1,
      times_correct: current.times_correct + (quality === "again" ? 0 : 1),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", user_vocabulary_id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Un poco de XP siempre por intentar; más si lo recordó bien.
  await awardXp(
    supabase,
    user.id,
    "vocabulary_review",
    quality === "again" ? 2 : 5
  );

  return NextResponse.json({ card: updated });
}
