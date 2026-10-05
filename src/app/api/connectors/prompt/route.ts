import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: prompts, error } = await supabase
    .from("connector_prompts")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!prompts || prompts.length === 0) {
    return NextResponse.json({ prompt: null });
  }

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  return NextResponse.json({ prompt });
}
