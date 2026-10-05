import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshSkillScores } from "@/lib/scoring";
import {
  buildDailyPlan,
  totalMinutesForDate,
  BLOCK_INFO,
  type BlockType,
} from "@/lib/dailyChallenge";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function countToday(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  column: string,
  userId: string,
  extraFilter?: { column: string; value: string }
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte(column, startOfDay.toISOString());

  if (extraFilter) {
    query = query.eq(extraFilter.column, extraFilter.value);
  }

  const { count } = await query;

  return count ?? 0;
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const challengeDate = todayDateOnly();

  let { data: challenge } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_date", challengeDate)
    .maybeSingle();

  if (!challenge) {
    const scores = await refreshSkillScores(supabase, user.id);
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_minutes_goal")
      .eq("id", user.id)
      .maybeSingle();
    const totalMinutes = totalMinutesForDate(new Date(), profile?.daily_minutes_goal ?? 35);
    const { blocks, generatedReason } = buildDailyPlan(scores, totalMinutes);

    const { data: inserted, error: insertError } = await supabase
      .from("daily_challenges")
      .insert({
        user_id: user.id,
        challenge_date: challengeDate,
        planned_minutes: totalMinutes,
        blocks,
        status: "pending",
        generated_reason: generatedReason,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    challenge = inserted;
  }

  // Progreso real: cuenta actividad de HOY para cada tipo de bloque —
  // las 6 consultas son independientes, así que salen todas juntas en vez
  // de una atrás de la otra.
  const [
    vocabularyCount,
    connectorsCount,
    pronunciationCount,
    conversationCount,
    listeningConversationCount,
    listeningDictationCount,
  ] = await Promise.all([
    countToday(supabase, "user_vocabulary", "last_reviewed_at", user.id),
    countToday(supabase, "connector_challenge_attempts", "created_at", user.id),
    countToday(supabase, "pronunciation_attempts", "created_at", user.id),
    countToday(supabase, "conversations", "started_at", user.id),
    countToday(supabase, "user_listening_attempts", "created_at", user.id, {
      column: "mode",
      value: "conversation",
    }),
    countToday(supabase, "user_listening_attempts", "created_at", user.id, {
      column: "mode",
      value: "dictation",
    }),
  ]);

  const counts: Record<BlockType, number> = {
    vocabulary: vocabularyCount,
    connectors: connectorsCount,
    pronunciation: pronunciationCount,
    conversation: conversationCount,
    listening_conversation: listeningConversationCount,
    listening_dictation: listeningDictationCount,
  };

  const blocksWithStatus = (challenge.blocks as { type: BlockType; minutes: number }[]).map(
    (b) => ({
      ...b,
      label: BLOCK_INFO[b.type].label,
      href: BLOCK_INFO[b.type].href,
      done: counts[b.type] >= BLOCK_INFO[b.type].dailyTarget,
      progress: Math.min(1, counts[b.type] / BLOCK_INFO[b.type].dailyTarget),
    })
  );

  const allDone = blocksWithStatus.every((b) => b.done);
  const anyDone = blocksWithStatus.some((b) => b.done);
  const newStatus = allDone ? "completed" : anyDone ? "in_progress" : "pending";

  if (newStatus !== challenge.status) {
    await supabase
      .from("daily_challenges")
      .update({ status: newStatus })
      .eq("id", challenge.id);
    challenge.status = newStatus;
  }

  return NextResponse.json({
    challenge,
    blocks: blocksWithStatus,
  });
}
