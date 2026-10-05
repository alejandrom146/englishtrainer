import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJson } from "@/lib/ai/gemini";
import { buildFeedbackSystemPrompt } from "@/lib/ai/conversation-prompts";
import { updateConnectorProgress } from "@/lib/connectors";
import { awardXp } from "@/lib/xp";

interface FeedbackResult {
  fluency_score: number;
  grammar_notes: { error: string; correction: string; explanation: string }[];
  vocabulary_notes: { used: string[]; missed: string[] };
  connectors_used: { text: string; correct: boolean; natural: boolean }[];
  connectors_missed: { suggested: string; why: string }[];
  strengths: string;
  improvements: string;
  next_recommendation: string;
}

const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    fluency_score: { type: "number" },
    grammar_notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          error: { type: "string" },
          correction: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["error", "correction", "explanation"],
      },
    },
    vocabulary_notes: {
      type: "object",
      properties: {
        used: { type: "array", items: { type: "string" } },
        missed: { type: "array", items: { type: "string" } },
      },
      required: ["used", "missed"],
    },
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
    strengths: { type: "string" },
    improvements: { type: "string" },
    next_recommendation: { type: "string" },
  },
  required: [
    "fluency_score",
    "grammar_notes",
    "vocabulary_notes",
    "connectors_used",
    "connectors_missed",
    "strengths",
    "improvements",
    "next_recommendation",
  ],
};

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const { error: endError } = await supabase
    .from("conversations")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", conversation.id);

  if (endError) {
    return NextResponse.json({ error: endError.message }, { status: 500 });
  }

  // Si la conversación fue muy corta (solo el saludo inicial), no vale la
  // pena gastar una llamada de IA para analizarla.
  const userTurns = messages.filter((m) => m.role === "user");
  if (userTurns.length === 0) {
    return NextResponse.json({ feedback: null });
  }

  // El límite se chequea acá, no antes: si la conversación fue muy corta,
  // termina arriba sin gastar nada — no tiene sentido bloquearla por el
  // límite si de todos modos no iba a llamar a la IA.
  const limitCheck = await checkAiLimit(supabase, user.id);
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.message }, { status: 429 });
  }

  const { data: connectorBank } = await supabase
    .from("expressions")
    .select("text")
    .eq("type", "connector");

  const bankList = (connectorBank ?? []).map((c) => c.text).join(", ");

  const transcript = messages
    .map((m) => `${m.role === "assistant" ? "AI" : "Learner"}: ${m.content}`)
    .join("\n");

  let result: FeedbackResult;
  let usage: { model: string; inputTokens: number; outputTokens: number };

  try {
    const aiResponse = await generateJson<FeedbackResult>({
      systemInstruction: buildFeedbackSystemPrompt(bankList),
      userContent: transcript,
      responseSchema: FEEDBACK_SCHEMA,
    });
    result = aiResponse.data;
    usage = aiResponse.usage;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  // conversation_feedback solo tiene policy de SELECT para el usuario (la
  // migración 0002 la trata como contenido generado por el sistema, no por
  // el usuario) — así que este insert puntual usa el cliente de service
  // role. La pertenencia de la conversación ya se validó arriba.
  const admin = createAdminClient();
  const { data: feedback, error: feedbackError } = await admin
    .from("conversation_feedback")
    .insert({
      conversation_id: conversation.id,
      fluency_score: result.fluency_score,
      grammar_notes: result.grammar_notes,
      vocabulary_notes: result.vocabulary_notes,
      connectors_used: result.connectors_used,
      connectors_missed: result.connectors_missed,
      strengths: result.strengths,
      improvements: result.improvements,
      next_recommendation: result.next_recommendation,
    })
    .select()
    .single();

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 500 });
  }

  await updateConnectorProgress(supabase, user.id, result.connectors_used);
  await awardXp(supabase, user.id, "conversation", 25);

  try {
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "conversation_feedback",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({ feedback });
}
