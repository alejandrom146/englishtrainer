import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, overall_level, target_variant, daily_minutes_goal, ai_daily_limit_usd, ai_monthly_limit_usd"
    )
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <>
      <PageHeader title="Settings" />
      <main className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-8">
        <SettingsForm
          email={user?.email ?? ""}
          initialProfile={{
            display_name: profile?.display_name ?? null,
            overall_level: profile?.overall_level ?? "B2",
            target_variant: profile?.target_variant ?? "british",
            daily_minutes_goal: profile?.daily_minutes_goal ?? 35,
            ai_daily_limit_usd: profile?.ai_daily_limit_usd ?? null,
            ai_monthly_limit_usd: profile?.ai_monthly_limit_usd ?? null,
          }}
        />
      </main>
    </>
  );
}
