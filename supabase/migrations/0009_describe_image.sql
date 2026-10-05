-- English Personal Trainer — Describe the Image
-- Sección nueva: no existía ninguna tabla equivalente (imagen + respuesta
-- libre escrita), así que se crean 2 tablas nuevas siguiendo el mismo
-- estilo que ya usa el resto de la app (ver listening_exercises /
-- user_listening_attempts). Todo lo demás (XP, error_profile, Auth) se
-- REUTILIZA, no se duplica. Idempotente.

-- ============================================================
-- 1. Catálogo de imágenes (local, no generadas por IA en cada uso)
-- ============================================================

create table if not exists public.describe_image_exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_path text not null, -- ruta dentro de /public, ej. /images/describe/office-meeting.webp
  topic text,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  -- Grounding oculto para la IA (no se muestra al usuario): ayuda a que la
  -- evaluación de contenido sea consistente, dado que la imagen es una
  -- ilustración simple y no una fotografía real.
  key_elements jsonb,
  created_at timestamptz not null default now()
);

alter table public.describe_image_exercises enable row level security;

drop policy if exists "Authenticated users can read describe-image exercises" on public.describe_image_exercises;
create policy "Authenticated users can read describe-image exercises"
  on public.describe_image_exercises for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- 2. Intentos del usuario
-- ============================================================

create table if not exists public.user_describe_image_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.describe_image_exercises (id) on delete cascade,
  attempt_number int not null default 1,
  response_text text not null,

  overall_score numeric(5,2),
  content_score numeric(5,2),
  grammar_score numeric(5,2),
  vocabulary_score numeric(5,2),
  coherence_score numeric(5,2),
  connectors_score numeric(5,2),
  naturalness_score numeric(5,2),

  strengths jsonb,               -- string[]
  corrections jsonb,             -- [{original, correction, why}]
  vocabulary_suggestions jsonb,  -- [{original, suggestion, why}]
  connectors_used jsonb,         -- string[]
  connectors_feedback text,
  connectors_to_try jsonb,       -- string[]
  coherence_feedback text,
  improved_version text,
  what_changed jsonb,            -- string[]
  personalized_tip text,

  created_at timestamptz not null default now()
);

alter table public.user_describe_image_attempts enable row level security;

drop policy if exists "Users manage own describe-image attempts" on public.user_describe_image_attempts;
create policy "Users manage own describe-image attempts"
  on public.user_describe_image_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_describe_image_attempts_user_idx
  on public.user_describe_image_attempts (user_id, exercise_id, created_at);

-- ============================================================
-- 3. Semilla: 3 imágenes locales (pre-generadas, ver /public/images/describe)
-- ============================================================

insert into public.describe_image_exercises (title, image_path, topic, cefr_level, key_elements)
select * from (values
  (
    'Office meeting',
    '/images/describe/office-meeting.webp',
    'workplace',
    'B2',
    '{"who":"a man and a woman","where":"an office, near two windows","what":"they appear to be having a conversation or a meeting at a desk","objects":["a laptop","papers on the desk","a plant","a wall clock"],"possible_inference":"they could be colleagues discussing work, perhaps reviewing the documents on the desk"}'::jsonb
  ),
  (
    'Coffee shop',
    '/images/describe/coffee-shop.webp',
    'everyday_life',
    'B2',
    '{"who":"a barista behind the counter and a customer waiting","where":"a coffee shop, with a menu board on the wall","what":"the barista is preparing or serving drinks; the customer is waiting at the counter","objects":["a coffee machine","three cups on the counter","a menu board","a bag/purse the customer is carrying"],"possible_inference":"the customer is probably waiting to order or to collect a drink"}'::jsonb
  ),
  (
    'Airport check-in',
    '/images/describe/airport-checkin.webp',
    'travel',
    'B2',
    '{"who":"an airline agent behind the counter and a traveller with a suitcase","where":"an airport check-in area, with a departures board and a small plane icon in the background","what":"the traveller appears to be checking in or asking the agent something","objects":["a check-in counter","a computer monitor","a rolling suitcase","a departures board"],"possible_inference":"the traveller might be checking in for a flight or asking about their gate/luggage"}'::jsonb
  )
) as v(title, image_path, topic, cefr_level, key_elements)
where not exists (
  select 1 from public.describe_image_exercises existing where existing.title = v.title
);
