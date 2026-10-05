import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subtype = searchParams.get("subtype");
  const mode = searchParams.get("mode") === "dictation" ? "dictation" : "conversation";

  const { data: profile } = await supabase
    .from("profiles")
    .select("overall_level")
    .eq("id", user.id)
    .maybeSingle();

  const userLevelIdx = LEVEL_ORDER.indexOf(profile?.overall_level ?? "B2");

  let query = supabase.from("listening_exercises").select("*");
  // Si viene un subtipo específico (ej. "retell"), filtra por ese subtipo
  // exacto — es lo que usan las 6 cards de ejercicios. Sin subtipo, cae al
  // comportamiento genérico anterior por `mode` (queda por compatibilidad).
  query = subtype ? query.eq("exercise_subtype", subtype) : query.eq("type", mode);

  const { data: candidates, error: candidatesError } = await query;

  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ exercise: null });
  }

  // Prioriza un rango de nivel cercano al del usuario; si no hay nada ahí,
  // usa todo el banco disponible.
  const nearLevel = candidates.filter((c) => {
    const idx = LEVEL_ORDER.indexOf(c.cefr_level ?? "");
    return idx === -1 || Math.abs(idx - userLevelIdx) <= 1;
  });
  const pool = nearLevel.length > 0 ? nearLevel : candidates;

  // Cuántas veces ya se intentó cada ejercicio (para no repetir de más).
  let attemptQuery = supabase
    .from("user_listening_attempts")
    .select("listening_exercise_id")
    .eq("user_id", user.id);
  attemptQuery = subtype
    ? attemptQuery.eq("exercise_subtype", subtype)
    : attemptQuery.eq("mode", mode);
  const { data: attemptRows } = await attemptQuery;

  const attemptCounts = new Map<string, number>();
  for (const row of attemptRows ?? []) {
    attemptCounts.set(
      row.listening_exercise_id,
      (attemptCounts.get(row.listening_exercise_id) ?? 0) + 1
    );
  }

  // Patrones que más le cuestan al usuario en listening (sección 17:
  // dificultad adaptativa) — boostea ejercicios que los contienen, sin
  // convertir todo en repetición del mismo patrón (sección 17 también pide
  // mantener variedad, por eso se combina con un poco de aleatoriedad).
  const { data: errorPatterns } = await supabase
    .from("error_profile")
    .select("pattern, frequency")
    .eq("user_id", user.id)
    .eq("category", "listening")
    .order("frequency", { ascending: false })
    .limit(5);

  const topPatterns = new Set((errorPatterns ?? []).map((e) => e.pattern));

  const scored = pool.map((c) => {
    const patterns: string[] = c.target_patterns ?? [];
    const overlap = patterns.filter((p) => topPatterns.has(p)).length;
    const attempts = attemptCounts.get(c.id) ?? 0;
    const score = overlap * 10 - attempts * 3 + Math.random(); // el random rompe empates y da variedad
    return { exercise: c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ exercise: scored[0].exercise });
}
