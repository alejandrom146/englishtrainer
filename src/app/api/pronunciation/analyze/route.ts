import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJsonFromAudio } from "@/lib/ai/gemini";
import { maxState } from "@/lib/srs";
import { awardXp } from "@/lib/xp";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

interface PronunciationResult {
  transcript_guess: string;
  score: number; // 0-100, estimado
  feedback: string;
  problem_sounds: string[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    transcript_guess: { type: "string" },
    score: { type: "number" },
    feedback: { type: "string" },
    problem_sounds: { type: "array", items: { type: "string" } },
  },
  required: ["transcript_guess", "score", "feedback", "problem_sounds"],
};

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

  const { user_vocabulary_id, audio_base64 } = (await request.json()) as {
    user_vocabulary_id: string;
    audio_base64: string;
  };

  if (!user_vocabulary_id || !audio_base64) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: card, error: cardError } = await supabase
    .from("user_vocabulary")
    .select("*, vocabulary(*)")
    .eq("id", user_vocabulary_id)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "card not found" }, { status: 404 });
  }

  const word = card.vocabulary;

  let result: PronunciationResult;
  let usage: { model: string; inputTokens: number; outputTokens: number };

  try {
    const aiResponse = await generateJsonFromAudio<PronunciationResult>({
      systemInstruction: `You are a British English pronunciation coach for a Spanish-speaking B2 learner. You will hear a short audio clip of the learner trying to say a specific target word or phrase. Assess clarity, word stress, and any problem sounds — pay special attention to sounds that are typically hard for Spanish speakers (TH sounds, final consonants, vowel length, the English R, H at the start of words). Give an HONEST estimated score from 0 to 100 (this is an estimate from listening, not a precise phonetic measurement — don't overstate precision). Give ONE short, specific, encouraging feedback sentence in Spanish, in the style of: "Se entendió bien, pero la sílaba del medio sonó un poco marcada" — reference the actual English word/sounds by name. List problem_sounds as short tags (e.g. "TH", "final consonants", "word stress", "vowel length") — empty array if pronunciation was clear. Also give transcript_guess: your best guess, in English, of what the learner actually said (helps detect if they said a completely different word).`,
      textPrompt: `Target word/phrase: "${word.word}" (IPA: ${word.ipa ?? "n/a"}). Meaning: ${word.definition}. Listen to the attached audio and assess the pronunciation attempt.`,
      audioBase64: audio_base64,
      audioMimeType: "audio/wav",
      responseSchema: RESPONSE_SCHEMA,
    });
    result = aiResponse.data;
    usage = aiResponse.usage;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  const { data: attempt, error: attemptError } = await supabase
    .from("pronunciation_attempts")
    .insert({
      user_id: user.id,
      vocabulary_id: word.id,
      transcript: result.transcript_guess,
      score: result.score,
      feedback: result.feedback,
      problem_sounds: result.problem_sounds,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  await awardXp(supabase, user.id, "pronunciation_attempt", 8);

  // Si salió bien, avanza el estado de la palabra (no baja si ya estaba más
  // adelante, ej. 'recall' — ver comentario en src/lib/srs.ts).
  if (result.score >= 70) {
    await supabase
      .from("user_vocabulary")
      .update({ state: maxState(card.state, "pronunciation") })
      .eq("id", card.id);
  }

  // Actualiza el error profile con los sonidos problemáticos detectados.
  await Promise.all(
    result.problem_sounds.map((pattern) =>
      upsertErrorProfile(supabase, user.id, "pronunciation", pattern)
    )
  );

  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "pronunciation_analysis",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      audio_seconds: null,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({ attempt, analysis: result });
}
