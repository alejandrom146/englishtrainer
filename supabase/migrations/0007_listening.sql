-- English Personal Trainer — módulo Listening
-- Extiende tablas que YA EXISTÍAN (listening_exercises,
-- user_listening_attempts, error_profile) en vez de crear una arquitectura
-- paralela, tal como pide el prompt de este módulo. Idempotente.

-- ============================================================
-- 1. listening_exercises: metadata para conversation + dictation
-- ============================================================

alter table public.listening_exercises
  add column if not exists type text not null default 'conversation'
    check (type in ('conversation', 'dictation')),
  add column if not exists duration_category text
    check (duration_category in ('short', 'medium', 'long')),
  add column if not exists speakers jsonb, -- conversation: [{speaker:'A', text:'...'}, ...]
  add column if not exists key_information jsonb, -- {who, what, when, where, why, intention}
  add column if not exists target_patterns text[] not null default '{}',
  add column if not exists target_vocabulary text[] not null default '{}',
  add column if not exists difficulty int not null default 1;

-- ============================================================
-- 2. user_listening_attempts: desglose real de cada intento
-- ============================================================

alter table public.user_listening_attempts
  add column if not exists mode text not null default 'conversation'
    check (mode in ('conversation', 'dictation')),
  add column if not exists user_response text,
  add column if not exists main_idea_score numeric(5,2),
  add column if not exists details_score numeric(5,2),
  -- comprehension_score (ya existía) se usa como el score "overall" de
  -- conversation, para no duplicar una columna equivalente.
  add column if not exists listening_accuracy numeric(5,2), -- dictation
  add column if not exists word_accuracy numeric(5,2), -- dictation
  add column if not exists critical_errors int not null default 0,
  add column if not exists minor_errors int not null default 0,
  add column if not exists word_diff jsonb, -- dictation: comparación palabra por palabra
  add column if not exists matched_info jsonb, -- conversation: {understood, missed, confused}
  add column if not exists detected_difficulties jsonb not null default '[]', -- [{type, item}]
  add column if not exists replays int not null default 0,
  add column if not exists speed_used numeric(3,2) not null default 1.0;

-- ============================================================
-- 3. error_profile: permitir category = 'listening'
-- ============================================================

alter table public.error_profile drop constraint if exists error_profile_category_check;
alter table public.error_profile add constraint error_profile_category_check
  check (category in ('grammar', 'pronunciation', 'fluency', 'vocabulary', 'connectors', 'listening'));

-- ============================================================
-- 4. Semilla: conversation listening
-- ============================================================

insert into public.listening_exercises
  (type, title, transcript, topic, cefr_level, duration_category, speakers, key_information, target_patterns, target_vocabulary, difficulty)
select v.type, v.title, v.transcript, v.topic, v.cefr_level, v.duration_category, v.speakers, v.key_information, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select
    'conversation' as type,
    'Gym plans after work' as title,
    'A: Hey, are you still going to the gym today?' || chr(10) ||
    'B: Yeah, but I''ll probably go after work.' || chr(10) ||
    'A: What time do you finish?' || chr(10) ||
    'B: Around five. I''ll probably get there at six.' as transcript,
    'daily_life' as topic,
    'A2' as cefr_level,
    'short' as duration_category,
    '[{"speaker":"A","text":"Hey, are you still going to the gym today?"},{"speaker":"B","text":"Yeah, but I''ll probably go after work."},{"speaker":"A","text":"What time do you finish?"},{"speaker":"B","text":"Around five. I''ll probably get there at six."}]'::jsonb as speakers,
    '{"who":"B","what":"is going to the gym after work","when":"around 6pm, finishes work at 5","why":"works until five","intention":"confirm gym plans"}'::jsonb as key_information,
    array['contraction:I''ll','reduction:going to'] as target_patterns,
    array['gym','after work'] as target_vocabulary,
    2 as difficulty

  union all select
    'conversation',
    'Missing Sarah''s party',
    'A: Are you going to Sarah''s party tonight?' || chr(10) ||
    'B: No, I can''t. I have to work until ten.' || chr(10) ||
    'A: That''s a shame, she''ll be disappointed.' || chr(10) ||
    'B: I know, tell her I''ll make it up to her next time.',
    'social_situations',
    'A2',
    'short',
    '[{"speaker":"A","text":"Are you going to Sarah''s party tonight?"},{"speaker":"B","text":"No, I can''t. I have to work until ten."},{"speaker":"A","text":"That''s a shame, she''ll be disappointed."},{"speaker":"B","text":"I know, tell her I''ll make it up to her next time."}]'::jsonb,
    '{"who":"B","what":"cannot go to the party","when":"has to work until 10pm","why":"work commitment","intention":"apologise and offer to make it up later"}'::jsonb,
    array['contraction:can''t','contraction:that''s','contraction:she''ll','contraction:I''ll'],
    array['party','make it up to someone'],
    2

  union all select
    'conversation',
    'Late delivery complaint',
    'A: Hi, I''m calling about an order that still hasn''t arrived.' || chr(10) ||
    'B: I''m really sorry to hear that. Could you give me your order number?' || chr(10) ||
    'A: Sure, it''s 4482.' || chr(10) ||
    'B: Thanks. I can see it was delayed at the warehouse — it should arrive by tomorrow, and I''ll add a discount to your account for the inconvenience.',
    'customer_service',
    'B1',
    'medium',
    '[{"speaker":"A","text":"Hi, I''m calling about an order that still hasn''t arrived."},{"speaker":"B","text":"I''m really sorry to hear that. Could you give me your order number?"},{"speaker":"A","text":"Sure, it''s 4482."},{"speaker":"B","text":"Thanks. I can see it was delayed at the warehouse — it should arrive by tomorrow, and I''ll add a discount to your account for the inconvenience."}]'::jsonb,
    '{"who":"A (customer) and B (support agent)","what":"order 4482 was delayed at the warehouse","when":"should arrive tomorrow","why":"warehouse delay","intention":"agent offers a discount as compensation"}'::jsonb,
    array['contraction:I''m','contraction:hasn''t','reduction:could you','contraction:it''s','contraction:I''ll'],
    array['order','warehouse','discount','inconvenience'],
    4

  union all select
    'conversation',
    'Planning a weekend trip',
    'A: So I''ve been thinking, we should probably book the train tickets soon if we want to go next weekend.' || chr(10) ||
    'B: Yeah, you''re right, they tend to sell out. Do you want to go on Friday night or Saturday morning?' || chr(10) ||
    'A: Friday night, definitely — that way we''ve got the whole weekend there. I just have to check if I can leave work a bit early.' || chr(10) ||
    'B: Sounds good, let me know once you''ve sorted that out and I''ll book everything.',
    'travel',
    'B2',
    'long',
    '[{"speaker":"A","text":"So I''ve been thinking, we should probably book the train tickets soon if we want to go next weekend."},{"speaker":"B","text":"Yeah, you''re right, they tend to sell out. Do you want to go on Friday night or Saturday morning?"},{"speaker":"A","text":"Friday night, definitely — that way we''ve got the whole weekend there. I just have to check if I can leave work a bit early."},{"speaker":"B","text":"Sounds good, let me know once you''ve sorted that out and I''ll book everything."}]'::jsonb,
    '{"who":"A and B","what":"planning to book train tickets for a weekend trip","when":"leaving Friday night","why":"tickets tend to sell out, and Friday night gives them the whole weekend","intention":"A needs to confirm leaving work early before B books everything"}'::jsonb,
    array['contraction:I''ve','contraction:you''re','reduction:have to','contraction:we''ve','contraction:I''ll'],
    array['sell out','sorted out','book tickets'],
    6
) as v(type, title, transcript, topic, cefr_level, duration_category, speakers, key_information, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);

-- ============================================================
-- 5. Semilla: dictation
-- ============================================================

insert into public.listening_exercises
  (type, title, transcript, topic, cefr_level, target_patterns, target_vocabulary, difficulty)
select * from (values
  ('dictation', 'Dictation: finished report', 'I''ve already finished the report.', 'work', 'B1', array['contraction:I''ve'], array['finished','report'], 3),
  ('dictation', 'Dictation: three years', 'I''ve been working here for three years.', 'work', 'B1', array['contraction:I''ve'], array['working'], 3),
  ('dictation', 'Dictation: gym after work', 'I''ll probably go to the gym after work.', 'daily_life', 'A2', array['contraction:I''ll','reduction:going to'], array['gym'], 2),
  ('dictation', 'Dictation: can''t make it', 'I can''t make it tonight because I have to finish something.', 'social_situations', 'B1', array['contraction:can''t','reduction:have to'], array['make it'], 4),
  ('dictation', 'Dictation: sold out', 'The tickets were sold out by the time we checked.', 'travel', 'B2', array[]::text[], array['sold out'], 4),
  ('dictation', 'Dictation: kind of tired', 'I''m kind of tired, so I think I''m going to head home early.', 'daily_life', 'B2', array['contraction:I''m','reduction:kind of','reduction:going to'], array['head home'], 5),
  ('dictation', 'Dictation: order number', 'Could you give me your order number, please?', 'customer_service', 'A2', array['reduction:could you'], array['order number'], 2),
  ('dictation', 'Dictation: discount added', 'I''ll add a discount to your account for the inconvenience.', 'customer_service', 'B1', array['contraction:I''ll'], array['discount','inconvenience'], 3)
) as v(type, title, transcript, topic, cefr_level, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);
