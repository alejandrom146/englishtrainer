import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import { checkAiLimit } from "@/lib/aiLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateJsonFromImage } from "@/lib/ai/gemini";
import { buildDescribeImagePrompt } from "@/lib/ai/describe-image-prompts";
import { awardXp } from "@/lib/xp";
import { upsertErrorProfile } from "@/lib/errorProfileWrite";

interface Correction {
  original: string;
  correction: string;
  why: string;
}
interface VocabSuggestion {
  original: string;
  suggestion: string;
  why: string;
}

interface DescribeImageAnalysis {
  content: { score: number; feedback: string };
  grammar: { score: number; feedback: string; corrections: Correction[] };
  vocabulary: { score: number; feedback: string; suggestions: VocabSuggestion[] };
  coherence: { score: number; feedback: string };
  connectors: {
    score: number;
    used: string[];
    suggested: string[];
    feedback: string;
  };
  naturalness: { score: number; feedback: string };
  strengths: string[];
  improved_version: string;
  what_changed: string[];
  personalized_tip: string;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "object",
      properties: { score: { type: "number" }, feedback: { type: "string" } },
      required: ["score", "feedback"],
    },
    grammar: {
      type: "object",
      properties: {
        score: { type: "number" },
        feedback: { type: "string" },
        corrections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              original: { type: "string" },
              correction: { type: "string" },
              why: { type: "string" },
            },
            required: ["original", "correction", "why"],
          },
        },
      },
      required: ["score", "feedback", "corrections"],
    },
    vocabulary: {
      type: "object",
      properties: {
        score: { type: "number" },
        feedback: { type: "string" },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              original: { type: "string" },
              suggestion: { type: "string" },
              why: { type: "string" },
            },
            required: ["original", "suggestion", "why"],
          },
        },
      },
      required: ["score", "feedback", "suggestions"],
    },
    coherence: {
      type: "object",
      properties: { score: { type: "number" }, feedback: { type: "string" } },
      required: ["score", "feedback"],
    },
    connectors: {
      type: "object",
      properties: {
        score: { type: "number" },
        used: { type: "array", items: { type: "string" } },
        suggested: { type: "array", items: { type: "string" } },
        feedback: { type: "string" },
      },
      required: ["score", "used", "suggested", "feedback"],
    },
    naturalness: {
      type: "object",
      properties: { score: { type: "number" }, feedback: { type: "string" } },
      required: ["score", "feedback"],
    },
    strengths: { type: "array", items: { type: "string" } },
    improved_version: { type: "string" },
    what_changed: { type: "array", items: { type: "string" } },
    personalized_tip: { type: "string" },
  },
  required: [
    "content",
    "grammar",
    "vocabulary",
    "coherence",
    "connectors",
    "naturalness",
    "strengths",
    "improved_version",
    "what_changed",
    "personalized_tip",
  ],
};

// Diminishing XP para el mismo ejercicio — evita XP infinito por repetir
// (sección 34 del prompt de este módulo), pero sigue premiando "try again"
// las primeras veces, que es cuando realmente se está aprendiendo.
function xpForAttempt(attemptNumber: number): number {
  if (attemptNumber === 1) return 20;
  if (attemptNumber === 2) return 10;
  if (attemptNumber === 3) return 5;
  return 2;
}

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

  const { exercise_id, response_text } = (await request.json()) as {
    exercise_id: string;
    response_text: string;
  };

  if (!exercise_id || !response_text?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const { data: exercise, error: exerciseError } = await supabase
    .from("describe_image_exercises")
    .select("*")
    .eq("id", exercise_id)
    .single();

  if (exerciseError || !exercise) {
    return NextResponse.json({ error: "exercise not found" }, { status: 404 });
  }

  // La imagen vive en /public (local, pre-generada una sola vez — no se
  // crea una imagen nueva con IA en cada uso, ver sección 32).
  let imageBase64: string;
  try {
    const filePath = path.join(process.cwd(), "public", exercise.image_path);
    const buffer = await readFile(filePath);
    imageBase64 = buffer.toString("base64");
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer la imagen del ejercicio" },
      { status: 500 }
    );
  }

  let result: DescribeImageAnalysis;
  let usage: { model: string; inputTokens: number; outputTokens: number };

  try {
    const aiResponse = await generateJsonFromImage<DescribeImageAnalysis>({
      systemInstruction: buildDescribeImagePrompt(exercise.key_elements ?? {}),
      textPrompt: `Learner's description of the attached image:\n"""\n${response_text}\n"""`,
      imageBase64,
      imageMimeType: "image/png",
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

  const overallScore =
    result.content.score +
    result.grammar.score +
    result.vocabulary.score +
    result.coherence.score +
    result.connectors.score +
    result.naturalness.score;

  const { count: priorCount } = await supabase
    .from("user_describe_image_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("exercise_id", exercise_id);

  const attemptNumber = (priorCount ?? 0) + 1;

  const { data: attempt, error: attemptError } = await supabase
    .from("user_describe_image_attempts")
    .insert({
      user_id: user.id,
      exercise_id,
      attempt_number: attemptNumber,
      response_text,
      overall_score: overallScore,
      content_score: result.content.score,
      grammar_score: result.grammar.score,
      vocabulary_score: result.vocabulary.score,
      coherence_score: result.coherence.score,
      connectors_score: result.connectors.score,
      naturalness_score: result.naturalness.score,
      strengths: result.strengths,
      corrections: result.grammar.corrections,
      vocabulary_suggestions: result.vocabulary.suggestions,
      connectors_used: result.connectors.used,
      connectors_feedback: result.connectors.feedback,
      connectors_to_try: result.connectors.suggested,
      coherence_feedback: result.coherence.feedback,
      improved_version: result.improved_version,
      what_changed: result.what_changed,
      personalized_tip: result.personalized_tip,
    })
    .select()
    .single();

  if (attemptError) {
    return NextResponse.json({ error: attemptError.message }, { status: 500 });
  }

  // Alimenta el mismo Error Profile que ya usa el resto de la app — sin
  // categoría nueva, 'grammar'/'vocabulary'/'connectors' ya existían.
  // Las 3 fuentes son independientes entre sí, así que van todas juntas.
  await Promise.all([
    ...result.grammar.corrections.map((c) =>
      upsertErrorProfile(supabase, user.id, "grammar", c.original)
    ),
    ...result.vocabulary.suggestions.map((v) =>
      upsertErrorProfile(supabase, user.id, "vocabulary", v.original)
    ),
    ...(result.connectors.score < 6 && result.connectors.suggested[0]
      ? [
          upsertErrorProfile(
            supabase,
            user.id,
            "connectors",
            `underused:${result.connectors.suggested[0]}`
          ),
        ]
      : []),
  ]);

  await awardXp(supabase, user.id, "describe_image", xpForAttempt(attemptNumber));

  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_events").insert({
      user_id: user.id,
      feature: "describe_image_analysis",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });
  } catch {
    // no crítico
  }

  return NextResponse.json({ attempt, analysis: result, overallScore, attemptNumber });
}
