-- English Personal Trainer — Weekly Goals
-- Extiende la tabla `goals` que ya existía (creada en 0002) — no se crea
-- ninguna tabla nueva. Idempotente.

alter table public.goals
  add column if not exists metric text not null default 'active_days'
    check (metric in ('active_days', 'xp'));

-- Evita crear dos metas semanales activas para la misma semana del mismo
-- usuario (la app siempre busca antes de crear, pero este índice lo
-- garantiza también a nivel de base de datos).
create unique index if not exists goals_user_type_period_idx
  on public.goals (user_id, type, period_start);
