import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Precios de Gemini (USD por 1M tokens) — vigentes a la fecha en que se
 * escribió esto. Google los cambia con el tiempo, así que esto es una
 * ESTIMACIÓN, no una factura exacta — igual criterio que el resto de la
 * app (skill scores, pronunciation score, etc.): mejor una estimación
 * honesta que una falsa precisión. `ai_usage_events` no guarda el costo
 * en dólares directamente (solo tokens) — se calcula acá, al leer, para
 * no tener que tocar cada una de las rutas que ya registran uso.
 */
const TEXT_PRICE = { input: 0.25, output: 1.5 }; // gemini-flash-lite-latest (aprox.)
const TTS_PRICE = { input: 1.0, output: 20.0 }; // gemini-3.1-flash-tts-preview

function isTtsModel(model: string): boolean {
  return model.toLowerCase().includes("tts");
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price = isTtsModel(model) ? TTS_PRICE : TEXT_PRICE;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

export interface UsageBucket {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface FeatureUsage extends UsageBucket {
  feature: string;
}

export interface AiUsageSummary {
  today: UsageBucket;
  thisMonth: UsageBucket;
  allTime: UsageBucket;
  byFeature: FeatureUsage[];
}

function emptyBucket(): UsageBucket {
  return { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
}

function addToBucket(bucket: UsageBucket, row: EventRow) {
  bucket.calls += 1;
  bucket.inputTokens += row.input_tokens ?? 0;
  bucket.outputTokens += row.output_tokens ?? 0;
  bucket.estimatedCostUsd += estimateCostUsd(
    row.model,
    row.input_tokens ?? 0,
    row.output_tokens ?? 0
  );
}

interface EventRow {
  feature: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

/**
 * `ai_usage_events` no tiene policies de RLS para usuarios (a propósito —
 * ver el comentario en la migración original), así que esto usa el
 * cliente de service role, filtrando por user_id en el propio código del
 * servidor — nunca se expone al cliente.
 */
export async function getAiUsageSummary(userId: string): Promise<AiUsageSummary> {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("ai_usage_events")
    .select("feature, model, input_tokens, output_tokens, created_at")
    .eq("user_id", userId);

  const events = (rows ?? []) as EventRow[];

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  const today = emptyBucket();
  const thisMonth = emptyBucket();
  const allTime = emptyBucket();
  const byFeatureMap = new Map<string, UsageBucket>();

  for (const row of events) {
    const createdAt = new Date(row.created_at);
    addToBucket(allTime, row);
    if (createdAt >= startOfMonth) addToBucket(thisMonth, row);
    if (createdAt >= startOfDay) addToBucket(today, row);

    const featureBucket = byFeatureMap.get(row.feature) ?? emptyBucket();
    addToBucket(featureBucket, row);
    byFeatureMap.set(row.feature, featureBucket);
  }

  const byFeature = Array.from(byFeatureMap.entries())
    .map(([feature, bucket]) => ({ feature, ...bucket }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  return { today, thisMonth, allTime, byFeature };
}
