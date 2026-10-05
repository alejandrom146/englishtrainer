-- English Personal Trainer — esquema completo del dominio
-- Requiere 0001_init.sql (tabla profiles) aplicada antes.
-- Ver docs/database-schema.md para el razonamiento detrás de cada decisión.
--
-- Este script es idempotente: se puede volver a ejecutar sin errores
-- (CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS antes de cada
-- CREATE POLICY).

-- ============================================================
-- 1. SKILL SCORES — puntuación por habilidad
-- ============================================================

create table if not exists public.skill_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null check (
    skill in ('fluency','pronunciation','vocabulary','connectors','grammar','listening','customer_service')
  ),
  score numeric(5,2) not null default 0 check (score >= 0 and score <= 100),
  confidence text not null default 'estimated' check (confidence in ('estimated','measured')),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill)
);

alter table public.skill_scores enable row level security;

drop policy if exists "Users manage own skill scores" on public.skill_scores;
create policy "Users manage own skill scores"
  on public.skill_scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 2. VOCABULARY — catálogo global + estado por usuario
-- ============================================================

create table if not exists public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  ipa text,
  part_of_speech text,
  definition text not null,
  example_sentence text,
  topic text, -- e.g. 'customer_service', 'travel', 'technology'
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  audio_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary (id) on delete cascade,
  state text not null default 'new' check (
    state in ('new','recognition','understanding','pronunciation','recall','active_use','spontaneous_use','mastered')
  ),
  -- repetición espaciada (SM-2 simplificado)
  ease_factor numeric(4,2) not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  times_seen int not null default 0,
  times_correct int not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, vocabulary_id)
);

alter table public.user_vocabulary enable row level security;

drop policy if exists "Users manage own vocabulary progress" on public.user_vocabulary;
create policy "Users manage own vocabulary progress"
  on public.user_vocabulary for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_vocabulary_due_idx
  on public.user_vocabulary (user_id, due_at);

-- ============================================================
-- 3. EXPRESSIONS — frases, collocations, phrasal verbs y conectores
-- ============================================================

create table if not exists public.expressions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  type text not null check (
    type in ('phrase','collocation','phrasal_verb','connector','customer_service_phrase')
  ),
  meaning text not null,
  register text check (register in ('neutral','formal','informal')),
  usage_notes text, -- cuándo usarla, cuándo no, tono, alternativas
  example_sentence text,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expression_id uuid not null references public.expressions (id) on delete cascade,
  state text not null default 'new' check (
    state in ('new','recognition','understanding','pronunciation','recall','active_use','spontaneous_use','mastered')
  ),
  ease_factor numeric(4,2) not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  times_used_in_conversation int not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, expression_id)
);

alter table public.user_expressions enable row level security;

drop policy if exists "Users manage own expression progress" on public.user_expressions;
create policy "Users manage own expression progress"
  on public.user_expressions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists user_expressions_due_idx
  on public.user_expressions (user_id, due_at);

-- ============================================================
-- 4. CONVERSATIONS — escenarios, mensajes y feedback
-- ============================================================

create table if not exists public.conversation_scenarios (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in ('casual','travel','customer_service','job_interview')
  ),
  title text not null,
  description text,
  level int, -- para customer_service_track: 1..10; null en otras categorías
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid references public.conversation_scenarios (id) on delete set null,
  mode text not null default 'practice' check (mode in ('practice','mock_interview')),
  topic text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.conversations enable row level security;

drop policy if exists "Users manage own conversations" on public.conversations;
create policy "Users manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.conversation_messages enable row level security;

drop policy if exists "Users manage messages of own conversations" on public.conversation_messages;
create policy "Users manage messages of own conversations"
  on public.conversation_messages for all
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create table if not exists public.conversation_feedback (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  fluency_score numeric(5,2),
  grammar_notes jsonb, -- [{error, correction, explanation}]
  vocabulary_notes jsonb, -- {used: [...], missed: [...]}
  connectors_used jsonb, -- [text]
  connectors_missed jsonb, -- [{suggested, where}]
  pronunciation_notes jsonb,
  strengths text,
  improvements text,
  next_recommendation text,
  created_at timestamptz not null default now()
);

alter table public.conversation_feedback enable row level security;

drop policy if exists "Users view feedback of own conversations" on public.conversation_feedback;
create policy "Users view feedback of own conversations"
  on public.conversation_feedback for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ============================================================
-- 5. PRONUNCIATION
-- ============================================================

create table if not exists public.pronunciation_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vocabulary_id uuid references public.vocabulary (id) on delete set null,
  expression_id uuid references public.expressions (id) on delete set null,
  conversation_id uuid references public.conversations (id) on delete set null,
  audio_url text,
  transcript text,
  score numeric(5,2),
  feedback text, -- feedback específico en lenguaje natural, no solo un número
  problem_sounds text[], -- ej. ['TH', 'final consonants']
  created_at timestamptz not null default now()
);

alter table public.pronunciation_attempts enable row level security;

drop policy if exists "Users manage own pronunciation attempts" on public.pronunciation_attempts;
create policy "Users manage own pronunciation attempts"
  on public.pronunciation_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 6. LISTENING
-- ============================================================

create table if not exists public.listening_exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  audio_url text,
  transcript text not null,
  topic text,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_listening_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listening_exercise_id uuid not null references public.listening_exercises (id) on delete cascade,
  comprehension_score numeric(5,2),
  created_at timestamptz not null default now()
);

alter table public.user_listening_attempts enable row level security;

drop policy if exists "Users manage own listening attempts" on public.user_listening_attempts;
create policy "Users manage own listening attempts"
  on public.user_listening_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 7. DAILY CHALLENGE Y SESIONES
-- ============================================================

create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_date date not null default current_date,
  planned_minutes int not null default 35,
  blocks jsonb not null default '[]', -- [{type: 'vocabulary', minutes: 7}, ...]
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  generated_reason text, -- explicación legible de por qué se priorizó así
  created_at timestamptz not null default now(),
  unique (user_id, challenge_date)
);

alter table public.daily_challenges enable row level security;

drop policy if exists "Users manage own daily challenges" on public.daily_challenges;
create policy "Users manage own daily challenges"
  on public.daily_challenges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  daily_challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  block_type text not null,
  completed_at timestamptz not null default now(),
  xp_earned int not null default 0,
  summary jsonb
);

alter table public.daily_progress enable row level security;

drop policy if exists "Users manage progress of own daily challenges" on public.daily_progress;
create policy "Users manage progress of own daily challenges"
  on public.daily_progress for all
  using (
    exists (
      select 1 from public.daily_challenges d
      where d.id = daily_challenge_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.daily_challenges d
      where d.id = daily_challenge_id and d.user_id = auth.uid()
    )
  );

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_challenge_id uuid references public.daily_challenges (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  total_minutes numeric(5,2),
  xp_earned int not null default 0
);

alter table public.learning_sessions enable row level security;

drop policy if exists "Users manage own learning sessions" on public.learning_sessions;
create policy "Users manage own learning sessions"
  on public.learning_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 8. GAMIFICACIÓN — goals, achievements, xp
-- ============================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('weekly','custom')),
  target_value numeric(8,2) not null,
  current_value numeric(8,2) not null default 0,
  period_start date not null,
  period_end date not null,
  status text not null default 'active' check (status in ('active','completed','failed')),
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  icon text
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "Users manage own achievements" on public.user_achievements;
create policy "Users manage own achievements"
  on public.user_achievements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null, -- ej. 'daily_challenge', 'conversation', 'achievement'
  amount int not null,
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

drop policy if exists "Users manage own xp events" on public.xp_events;
create policy "Users manage own xp events"
  on public.xp_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 9. ERROR PROFILE
-- ============================================================

create table if not exists public.error_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (
    category in ('grammar','pronunciation','fluency','vocabulary','connectors')
  ),
  pattern text not null, -- ej. 'articles', 'TH sound', 'too many pauses'
  frequency int not null default 1,
  trend text not null default 'stable' check (trend in ('improving','stable','worsening')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, category, pattern)
);

alter table public.error_profile enable row level security;

drop policy if exists "Users manage own error profile" on public.error_profile;
create policy "Users manage own error profile"
  on public.error_profile for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 10. COST CONTROL (no visible al usuario final)
-- ============================================================

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  feature text not null, -- ej. 'conversation', 'pronunciation_analysis'
  model text not null,
  input_tokens int,
  output_tokens int,
  audio_seconds numeric(6,2),
  estimated_cost_usd numeric(8,4),
  created_at timestamptz not null default now()
);

-- Sin RLS de usuario: esta tabla es solo para el propio dueño de la app
-- (se consulta con la service role key desde el servidor, nunca desde el
-- cliente). Se deja RLS activado sin policies para bloquear el acceso
-- por defecto vía la anon key.
alter table public.ai_usage_events enable row level security;
