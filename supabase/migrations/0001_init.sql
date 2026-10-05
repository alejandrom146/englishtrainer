-- English Personal Trainer — migración inicial
-- Solo la base: perfiles ligados a auth.users de Supabase.
-- El resto del esquema (vocabulary, conversations, error_profile, xp_events,
-- etc.) se añade en migraciones posteriores, según el módulo que construyamos.
--
-- Este script es idempotente: se puede volver a ejecutar sin errores.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  target_variant text not null default 'british', -- 'british' | 'american'
  overall_level text not null default 'B2', -- A1..C2, estimado inicial
  daily_minutes_goal int not null default 35,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario solo puede ver y modificar su propio perfil.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea automáticamente un perfil cuando se registra un usuario nuevo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
