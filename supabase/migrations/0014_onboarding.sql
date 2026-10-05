-- English Personal Trainer — Onboarding
-- Extiende `profiles` (ya existía desde 0001) con un flag para saber si
-- el usuario ya pasó por la pantalla de configuración inicial. No crea
-- ninguna tabla nueva. Idempotente.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;
