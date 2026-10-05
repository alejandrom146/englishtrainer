-- English Personal Trainer — límites de costo de IA
-- Extiende `profiles` (ya existía desde 0001) con límites configurables.
-- No crea ninguna tabla nueva. Idempotente.

alter table public.profiles
  add column if not exists ai_daily_limit_usd numeric(6,2), -- null = sin límite
  add column if not exists ai_monthly_limit_usd numeric(6,2); -- null = sin límite
