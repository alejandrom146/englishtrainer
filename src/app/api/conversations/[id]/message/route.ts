import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai/gemini";
import { buildConversationSystemPrompt } from "@/lib/ai/conversation-prompts";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const { content } = (await request.json()) as { content: string };

  if (!content?.trim()) {
    return NextResponse.json({ error: "missing content" }, { status: 400 });
  }

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*, conversation_scenarios(*)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (convError || !conversation) {
    return NextResponse.json({ error: "conversation not found" }, { status: 404 });
  }

  if (conversation.ended_at) {
    return NextResponse.json({ error: "conversation already ended" }, { status: 400 });
  }

  // Guarda el mensaje del usuario.
  const { error: userMsgError } = await supabase
    .from("conversation_messages")
    .insert({ conversation_id: conversation.id, role: "user", content });

  if (userMsgError) {
    return NextResponse.json({ error: userMsgError.message }, { status: 500 });
  }

  // Trae el historial completo para dar contexto a la IA.
  const { data: messages, error: messagesError } = await supabase
    .from("conversation_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const history = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const systemInstruction = buildConversationSystemPrompt(
    conversation.conversation_scenarios,
    conversation.mode
  );

  let reply: { text: string; usage: { model: string; inputTokens: number; outputTokens: number } };
  try {
    reply = await generateText({ systemInstruction, history });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: reply.text,
    })
    .select()
    .single();

  if (assistantMsgError) {
    return NextResponse.json({ error: assistantMsgError.message }, { status: 500 });
  }

  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "conversation_message",
      model: reply.usage.model,
      input_tokens: reply.usage.inputTokens,
      output_tokens: reply.usage.outputTokens,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({ assistantMessage });
}
