import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const VARIANTS = ["british", "american"];

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    display_name,
    overall_level,
    target_variant,
    daily_minutes_goal,
    onboarding_completed,
    ai_daily_limit_usd,
    ai_monthly_limit_usd,
  } = body as {
    display_name?: string;
    overall_level?: string;
    target_variant?: string;
    daily_minutes_goal?: number;
    onboarding_completed?: boolean;
    ai_daily_limit_usd?: number | null;
    ai_monthly_limit_usd?: number | null;
  };

  if (overall_level && !LEVELS.includes(overall_level)) {
    return NextResponse.json({ error: "invalid level" }, { status: 400 });
  }
  if (target_variant && !VARIANTS.includes(target_variant)) {
    return NextResponse.json({ error: "invalid variant" }, { status: 400 });
  }
  if (
    daily_minutes_goal !== undefined &&
    (typeof daily_minutes_goal !== "number" ||
      daily_minutes_goal < 10 ||
      daily_minutes_goal > 120)
  ) {
    return NextResponse.json(
      { error: "daily_minutes_goal debe estar entre 10 y 120" },
      { status: 400 }
    );
  }
  if (
    ai_daily_limit_usd !== undefined &&
    ai_daily_limit_usd !== null &&
    (typeof ai_daily_limit_usd !== "number" || ai_daily_limit_usd < 0)
  ) {
    return NextResponse.json({ error: "ai_daily_limit_usd inválido" }, { status: 400 });
  }
  if (
    ai_monthly_limit_usd !== undefined &&
    ai_monthly_limit_usd !== null &&
    (typeof ai_monthly_limit_usd !== "number" || ai_monthly_limit_usd < 0)
  ) {
    return NextResponse.json({ error: "ai_monthly_limit_usd inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (display_name !== undefined) updates.display_name = display_name.slice(0, 100);
  if (overall_level !== undefined) updates.overall_level = overall_level;
  if (target_variant !== undefined) updates.target_variant = target_variant;
  if (daily_minutes_goal !== undefined) updates.daily_minutes_goal = daily_minutes_goal;
  if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
  if (ai_daily_limit_usd !== undefined) updates.ai_daily_limit_usd = ai_daily_limit_usd;
  if (ai_monthly_limit_usd !== undefined) updates.ai_monthly_limit_usd = ai_monthly_limit_usd;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
