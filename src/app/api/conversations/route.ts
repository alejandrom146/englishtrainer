import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai/gemini";
import { buildConversationSystemPrompt } from "@/lib/ai/conversation-prompts";

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

  const { scenario_id, mode } = (await request.json()) as {
    scenario_id: string;
    mode: "practice" | "mock_interview";
  };

  const { data: scenario, error: scenarioError } = await supabase
    .from("conversation_scenarios")
    .select("*")
    .eq("id", scenario_id)
    .single();

  if (scenarioError || !scenario) {
    return NextResponse.json({ error: "scenario not found" }, { status: 404 });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      scenario_id,
      mode: mode ?? "practice",
      topic: scenario.title,
    })
    .select()
    .single();

  if (convError) {
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  const systemInstruction = buildConversationSystemPrompt(
    scenario,
    mode ?? "practice"
  );

  let opening: { text: string; usage: { model: string; inputTokens: number; outputTokens: number } };
  try {
    opening = await generateText({
      systemInstruction,
      history: [
        {
          role: "user",
          parts: [{ text: "(Start the conversation naturally.)" }],
        },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  const { data: firstMessage, error: msgError } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: opening.text,
    })
    .select()
    .single();

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "conversation_start",
      model: opening.usage.model,
      input_tokens: opening.usage.inputTokens,
      output_tokens: opening.usage.outputTokens,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({ conversation, firstMessage });
}
