import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScenarioList } from "@/components/conversation/ScenarioList";

export default async function ConversationPickerPage() {
  const supabase = createClient();

  const { data: scenarios } = await supabase
    .from("conversation_scenarios")
    .select("*")
    .order("category", { ascending: true })
    .order("level", { ascending: true, nullsFirst: true });

  return (
    <>
      <PageHeader title="Elige una conversación" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ScenarioList scenarios={scenarios ?? []} />
      </main>
    </>
  );
}
