import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Máximo de palabras NUEVAS introducidas por día (independiente de cuántas
// repasos pendientes haya). Ver PROMPT MAESTRO sección 4: 5–8 palabras
// nuevas por sesión.
const MAX_NEW_WORDS_PER_DAY = 8;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) ¿Hay una revisión pendiente (due_at ya pasó)?
  const { data: due, error: dueError } = await supabase
    .from("user_vocabulary")
    .select("*, vocabulary(*)")
    .eq("user_id", user.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }

  if (due) {
    return NextResponse.json({ card: due, isNew: false });
  }

  // 2) No hay repasos pendientes: ¿se puede introducir una palabra nueva hoy?
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count: newToday, error: countError } = await supabase
    .from("user_vocabulary")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString());

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((newToday ?? 0) >= MAX_NEW_WORDS_PER_DAY) {
    return NextResponse.json({ card: null, isNew: false });
  }

  // Busca una palabra del catálogo que el usuario todavía no tenga.
  const { data: learnedIdsRows, error: learnedError } = await supabase
    .from("user_vocabulary")
    .select("vocabulary_id")
    .eq("user_id", user.id);

  if (learnedError) {
    return NextResponse.json({ error: learnedError.message }, { status: 500 });
  }

  const learnedIds = (learnedIdsRows ?? []).map((r) => r.vocabulary_id);

  let query = supabase
    .from("vocabulary")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1);

  if (learnedIds.length > 0) {
    query = query.not("id", "in", `(${learnedIds.join(",")})`);
  }

  const { data: candidates, error: candidateError } = await query;

  if (candidateError) {
    return NextResponse.json({ error: candidateError.message }, { status: 500 });
  }

  const candidate = candidates?.[0];

  if (!candidate) {
    // No quedan palabras nuevas en el catálogo.
    return NextResponse.json({ card: null, isNew: false });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_vocabulary")
    .insert({ user_id: user.id, vocabulary_id: candidate.id })
    .select("*, vocabulary(*)")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ card: inserted, isNew: true });
}
