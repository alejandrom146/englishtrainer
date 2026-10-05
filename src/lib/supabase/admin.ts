import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente con la service role key: se salta RLS por completo.
 * SOLO se usa en código de servidor (route handlers), NUNCA se importa
 * desde un componente de cliente. Hoy se usa únicamente para registrar
 * `ai_usage_events` (control de costo), que los usuarios no deben poder
 * leer ni escribir directamente.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
