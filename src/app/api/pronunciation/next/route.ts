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

  // Prioridad: palabras que el usuario ya puede recordar (state = 'recall')
  // pero todavía no practicó pronunciación — es el siguiente paso lógico
  // según la secuencia NEW → ... → RECALL → PRONUNCIATION del prompt
  // maestro. Si no hay ninguna, cae a cualquier palabra ya vista.
  const { data: recallWords, error: recallError } = await supabase
    .from("user_vocabulary")
    .select("id, state, vocabulary(*)")
    .eq("user_id", user.id)
    .eq("state", "recall")
    .limit(1);

  if (recallError) {
    return NextResponse.json({ error: recallError.message }, { status: 500 });
  }

  if (recallWords && recallWords.length > 0) {
    return NextResponse.json({ card: recallWords[0] });
  }

  const { data: anyWords, error: anyError } = await supabase
    .from("user_vocabulary")
    .select("id, state, vocabulary(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (anyError) {
    return NextResponse.json({ error: anyError.message }, { status: 500 });
  }

  return NextResponse.json({ card: anyWords?.[0] ?? null });
}
