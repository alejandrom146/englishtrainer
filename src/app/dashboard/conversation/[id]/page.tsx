import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConversationPageClient } from "@/components/conversation/ConversationPageClient";

export default async function ConversationSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("topic, ended_at")
    .eq("id", params.id)
    .single();

  const { data: messages } = await supabase
    .from("conversation_messages")
    .select("id, role, content")
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true });

  const alreadyEnded = !!conversation?.ended_at;

  let feedback = null;
  if (alreadyEnded) {
    const { data: fb } = await supabase
      .from("conversation_feedback")
      .select("*")
      .eq("conversation_id", params.id)
      .maybeSingle();
    feedback = fb ?? null;
  }

  return (
    <>
      <PageHeader
        title={conversation?.topic ?? "Conversación"}
        backHref="/dashboard/conversation"
        backLabel="Conversaciones"
      />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <ConversationPageClient
          conversationId={params.id}
          initialMessages={messages ?? []}
          initiallyEnded={alreadyEnded}
          initialFeedback={feedback}
        />
      </main>
    </>
  );
}
