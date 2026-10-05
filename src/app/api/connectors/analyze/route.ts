import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJson } from "@/lib/ai/gemini";
import { updateConnectorProgress } from "@/lib/connectors";
import { awardXp } from "@/lib/xp";

interface AnalysisResult {
  connectors_used: { text: string; correct: boolean; natural: boolean }[];
  connectors_missed: { suggested: string; why: string }[];
  naturalness_score: number; // 0-100
  overall_feedback: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    connectors_used: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          correct: { type: "boolean" },
          natural: { type: "boolean" },
        },
        required: ["text", "correct", "natural"],
      },
    },
    connectors_missed: {
      type: "array",
      items: {
        type: "object",
        properties: {
          suggested: { type: "string" },
          why: { type: "string" },
        },
        required: ["suggested", "why"],
      },
    },
    naturalness_score: { type: "number" },
    overall_feedback: { type: "string" },
  },
  required: [
    "connectors_used",
    "connectors_missed",
    "naturalness_score",
    "overall_feedback",
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

  const { prompt_id, response_text } = (await request.json()) as {
    prompt_id: string;
    response_text: string;
  };

  if (!prompt_id || !response_text?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: prompt, error: promptError } = await supabase
    .from("connector_prompts")
    .select("prompt_text")
    .eq("id", prompt_id)
    .single();

  if (promptError || !prompt) {
    return NextResponse.json({ error: "prompt not found" }, { status: 404 });
  }

  const { data: connectorBank, error: bankError } = await supabase
    .from("expressions")
    .select("text")
    .eq("type", "connector");

  if (bankError) {
    return NextResponse.json({ error: bankError.message }, { status: 500 });
  }

  const bankList = (connectorBank ?? []).map((c) => c.text).join(", ");

  let aiResult: AnalysisResult;
  let usage: { model: string; inputTokens: number; outputTokens: number };

  try {
    const result = await generateJson<AnalysisResult>({
      systemInstruction: `You are an English speaking coach for a Spanish-speaking B2 learner preparing for customer-service jobs in British English. You analyse a short spoken/written answer and check the learner's use of CONNECTORS from this specific list only: ${bankList}. Do not invent connectors outside this list. For each connector actually used in the response, say whether it was grammatically correct and whether it sounded natural in that position. Then suggest up to 2 connectors from the list that would have fitted well but weren't used, explaining briefly why (in Spanish, since the learner is a Spanish speaker — but keep the connector itself in English). Give an overall naturalness score from 0 to 100 (be honest, don't inflate it) and a short overall_feedback paragraph IN SPANISH: what they did well, what to improve, encouraging but not falsely praising. Prioritise communication over perfect accuracy — don't nitpick minor grammar unrelated to connectors.`,
      userContent: `Question: "${prompt.prompt_text}"\n\nLearner's answer: "${response_text}"`,
      responseSchema: RESPONSE_SCHEMA,
    });
    aiResult = result.data;
    usage = result.usage;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  // Guarda el intento.
  const { data: attempt, error: attemptError } = await supabase
    .from("connector_challenge_attempts")
    .insert({
      user_id: user.id,
      prompt_id,
      response_text,
      connectors_used: aiResult.connectors_used,
      connectors_missed: aiResult.connectors_missed,
      naturalness_score: aiResult.naturalness_score,
      overall_feedback: aiResult.overall_feedback,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Actualiza el progreso de cada conector usado correcta y naturalmente:
  // esto es producción activa real, así que puede avanzar el estado más
  // allá de lo que llega el módulo de vocabulario (que solo llega a
  // 'recall').
  await updateConnectorProgress(supabase, user.id, aiResult.connectors_used);
  await awardXp(supabase, user.id, "connector_challenge", 15);

  // Control de costo — no bloquea la respuesta si falla.
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "connector_challenge_analysis",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
  } catch {
    // No crítico: el análisis ya se guardó, seguimos sin romper la request.
  }

  return NextResponse.json({ attempt, analysis: aiResult });
}
