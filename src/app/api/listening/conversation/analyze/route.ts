import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJson } from "@/lib/ai/gemini";
import { buildListeningComprehensionPrompt } from "@/lib/ai/listening-prompts";
import { detectDifficulties } from "@/lib/listening/patterns";
import { awardXp } from "@/lib/xp";
import { checkCardCompletionBonus } from "@/lib/listening/cardProgress";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

interface ComprehensionResult {
  main_idea_score: number;
  details_score: number;
  overall_score: number;
  understood: string[];
  missed: string[];
  confused: string[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    main_idea_score: { type: "number" },
    details_score: { type: "number" },
    overall_score: { type: "number" },
    understood: { type: "array", items: { type: "string" } },
    missed: { type: "array", items: { type: "string" } },
    confused: { type: "array", items: { type: "string" } },
  },
  required: [
    "main_idea_score",
    "details_score",
    "overall_score",
    "understood",
    "missed",
    "confused",
  ],
};

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limitCheck = await checkAiLimit(supabase, user.id);
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.message }, { status: 429 });
  }

  const { exercise_id, response_text, replays, speed_used } =
    (await request.json()) as {
      exercise_id: string;
      response_text: string;
      replays: number;
      speed_used: number;
    };

  if (!exercise_id || !response_text?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from("listening_exercises")
    .select("*")
    .eq("id", exercise_id)
    .single();

  if (exerciseError || !exercise) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  let result: ComprehensionResult;
  let usage: { model: string; inputTokens: number; outputTokens: number };

  try {
    const aiResponse = await generateJson<ComprehensionResult>({
      systemInstruction: buildListeningComprehensionPrompt(
        exercise.transcript,
        exercise.key_information ?? {}
      ),
      userContent: `Learner's answer (may be in Spanish, English, or mixed): "${response_text}"`,
      responseSchema: RESPONSE_SCHEMA,
    });
    result = aiResponse.data;
    usage = aiResponse.usage;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  // Determinístico, sin IA: qué contracciones/reductions había en el
  // audio que probablemente dificultaron la comprensión.
  const detectedDifficulties = detectDifficulties(exercise.transcript);

  const { count: priorAttempts } = await supabase
    .from("user_listening_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("exercise_subtype", exercise.exercise_subtype ?? "retell");

  const { data: attempt, error: attemptError } = await supabase
    .from("user_listening_attempts")
    .insert({
      user_id: user.id,
      listening_exercise_id: exercise_id,
      mode: "conversation",
      exercise_subtype: exercise.exercise_subtype ?? "retell",
      user_response: response_text,
      comprehension_score: result.overall_score,
      main_idea_score: result.main_idea_score,
      details_score: result.details_score,
      matched_info: {
        understood: result.understood,
        missed: result.missed,
        confused: result.confused,
      },
      detected_difficulties: detectedDifficulties,
      replays: replays ?? 0,
      speed_used: speed_used ?? 1,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Si la comprensión fue floja, asumimos que las contracciones/reductions
  // presentes en el audio probablemente contribuyeron — es una suposición
  // razonable, no una certeza (no hay forma de saber EXACTAMENTE qué
  // palabra puntual no entendió a partir de una respuesta libre).
  if (result.overall_score < 70) {
    await Promise.all(
      detectedDifficulties.map((d) =>
        upsertErrorProfile(supabase, user.id, "listening", `${d.type}:${d.item}`)
      )
    );
  }

  await awardXp(supabase, user.id, "listening_conversation", 15);

  await checkCardCompletionBonus(
    supabase,
    user.id,
    exercise.exercise_subtype ?? "retell",
    (priorAttempts ?? 0) === 0
  );

  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "listening_comprehension_analysis",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({
    attempt,
    analysis: result,
    detectedDifficulties,
    exercise: {
      transcript: exercise.transcript,
      speakers: exercise.speakers,
    },
  });
}
