-- English Personal Trainer — Connector Challenge
-- Idempotente: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS.

-- ============================================================
-- 1. Prompts abiertos diseñados para provocar el uso de conectores
-- ============================================================

create table if not exists public.connector_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_text text not null,
  topic text,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  created_at timestamptz not null default now()
);

-- Catálogo global de lectura pública (autenticado); sin policy de escritura
-- de usuario porque el contenido lo gestiona el propio dueño de la app.
alter table public.connector_prompts enable row level security;

drop policy if exists "Authenticated users can read connector prompts" on public.connector_prompts;
create policy "Authenticated users can read connector prompts"
  on public.connector_prompts for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- 2. Intentos del usuario (respuesta libre + feedback de la IA)
-- ============================================================

create table if not exists public.connector_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt_id uuid not null references public.connector_prompts (id) on delete cascade,
  response_text text not null,
  connectors_used jsonb not null default '[]', -- [{text, correct, natural}]
  connectors_missed jsonb not null default '[]', -- [{suggested, why}]
  naturalness_score numeric(5,2),
  overall_feedback text,
  created_at timestamptz not null default now()
);

alter table public.connector_challenge_attempts enable row level security;

drop policy if exists "Users manage own connector attempts" on public.connector_challenge_attempts;
create policy "Users manage own connector attempts"
  on public.connector_challenge_attempts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. Semilla: conectores como `expressions` (type = 'connector')
-- ============================================================

insert into public.expressions (text, type, meaning, register, usage_notes, example_sentence, cefr_level)
select * from (values
  ('however', 'connector', 'Introduces a contrast with the previous idea.', 'neutral', 'Usually starts a new sentence, followed by a comma. More formal than "but".', 'The plan sounded good. However, we hadn''t considered the cost.', 'B1'),
  ('although', 'connector', 'Introduces a contrast within the same sentence.', 'neutral', 'Goes at the start or middle of the sentence; no comma needed before the main clause if it starts the sentence.', 'Although it was raining, we went for a walk.', 'B1'),
  ('even though', 'connector', 'A stronger version of "although", emphasising the contrast.', 'neutral', 'Followed by a full clause (subject + verb), not just a noun — unlike "despite".', 'Even though I was tired, I finished the report.', 'B1'),
  ('therefore', 'connector', 'Introduces a logical result or conclusion.', 'formal', 'More formal than "so"; common in writing and professional speech.', 'Sales dropped sharply; therefore, we need a new strategy.', 'B2'),
  ('because', 'connector', 'Introduces a reason.', 'neutral', 'Can start a sentence in speech, though some avoid it in formal writing.', 'I left early because I had an appointment.', 'A2'),
  ('besides', 'connector', 'Adds an extra point, often to reinforce an argument.', 'informal', 'Often used at the start of a sentence in spoken English.', 'It''s too expensive. Besides, we don''t really need it.', 'B2'),
  ('in addition', 'connector', 'Adds a further point, in a more formal way than "besides".', 'formal', 'Common in written or professional spoken English.', 'The role requires fluent English. In addition, some travel is expected.', 'B2'),
  ('on the other hand', 'connector', 'Introduces a contrasting point of view.', 'neutral', 'Often paired earlier with "on one hand", though it can stand alone.', 'Working from home is convenient. On the other hand, it can feel isolating.', 'B2'),
  ('as a result', 'connector', 'Introduces a consequence.', 'neutral', 'Similar to "therefore" but slightly less formal.', 'The flight was delayed. As a result, we missed our connection.', 'B2'),
  ('actually', 'connector', 'Introduces a correction or a slightly surprising fact.', 'informal', 'Very common in spoken English; softens a correction.', 'Actually, I think the meeting is at 3, not 4.', 'A2'),
  ('basically', 'connector', 'Introduces a simplified summary of something.', 'informal', 'Very common filler/connector in spoken English.', 'Basically, the system checks your order and sends a confirmation.', 'B1'),
  ('in my opinion', 'connector', 'Introduces a personal viewpoint.', 'neutral', 'Slightly more formal than "I think"; good for giving reasoned opinions.', 'In my opinion, the second option is more practical.', 'B1'),
  ('from my perspective', 'connector', 'Introduces a personal viewpoint, slightly more formal/reflective.', 'formal', 'Useful in interviews or professional discussions.', 'From my perspective, communication was the main issue.', 'B2'),
  ('what I mean is', 'connector', 'Clarifies or rephrases what was just said.', 'neutral', 'Very useful for self-correcting mid-conversation.', 'It wasn''t exactly a mistake — what I mean is, we could have planned better.', 'B1'),
  ('for example', 'connector', 'Introduces an example to support a point.', 'neutral', 'Can also use "for instance" interchangeably.', 'Some sounds are tricky, for example the "th" sound.', 'A2'),
  ('by the way', 'connector', 'Introduces a related but slightly off-topic point.', 'informal', 'Common in casual conversation.', 'By the way, did you see the email about the schedule change?', 'B1'),
  ('anyway', 'connector', 'Signals a return to the main topic, or closes a digression.', 'informal', 'Very common to end a story or change subject.', 'Anyway, back to what we were discussing.', 'A2'),
  ('at the same time', 'connector', 'Introduces a simultaneous or contrasting point.', 'neutral', 'Can express contrast similar to "however" in some contexts.', 'The job is demanding. At the same time, it''s very rewarding.', 'B2'),
  ('in other words', 'connector', 'Rephrases the previous point more simply or clearly.', 'neutral', 'Useful when clarifying for the listener.', 'The system flags unusual activity — in other words, it catches fraud automatically.', 'B2')
) as c(text, type, meaning, register, usage_notes, example_sentence, cefr_level)
where not exists (
  select 1 from public.expressions existing
  where existing.text = c.text and existing.type = 'connector'
);

-- ============================================================
-- 4. Semilla: prompts abiertos para el reto
-- ============================================================

insert into public.connector_prompts (prompt_text, topic, cefr_level)
select * from (values
  ('Do you prefer working from home or working in an office? Why?', 'everyday_life', 'B1'),
  ('Tell me about a time you had to deal with a difficult customer. What happened?', 'customer_service', 'B2'),
  ('What are the advantages and disadvantages of using AI at work?', 'technology', 'B2'),
  ('Describe your ideal holiday. What would you do, and why?', 'travel', 'B1'),
  ('Why do you think communication skills matter in customer service jobs?', 'job_interview', 'B2'),
  ('What''s something you used to dislike but now enjoy? What changed?', 'everyday_life', 'B1'),
  ('If a customer complains about a late delivery, how should a company respond?', 'customer_service', 'B2')
) as p(prompt_text, topic, cefr_level)
where not exists (
  select 1 from public.connector_prompts existing
  where existing.prompt_text = p.prompt_text
);
