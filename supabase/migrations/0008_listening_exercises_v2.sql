-- English Personal Trainer — 6 ejercicios dentro de las 2 cards de Listening
-- Extiende listening_exercises y user_listening_attempts (ya existían).
-- No crea tablas nuevas. Idempotente.

-- ============================================================
-- 1. listening_exercises: subtipo + datos específicos por subtipo
-- ============================================================

alter table public.listening_exercises
  add column if not exists exercise_subtype text
    check (exercise_subtype in (
      'listen_understand', 'main_idea', 'retell',
      'basic_dictation', 'fill_gaps', 'complete_sentence'
    )),
  add column if not exists questions jsonb, -- listen_understand / main_idea: [{question, options[], correct_index, explanation, targets[]}]
  add column if not exists gap_template text, -- fill_gaps: "I'll check that for you and ___ back to you shortly."
  add column if not exists gap_answers text[], -- fill_gaps: ['get']
  add column if not exists prompt_prefix text; -- complete_sentence: la parte que se muestra antes de completar

-- ============================================================
-- 2. user_listening_attempts: a qué subtipo pertenece cada intento
-- ============================================================

alter table public.user_listening_attempts
  add column if not exists exercise_subtype text
    check (exercise_subtype in (
      'listen_understand', 'main_idea', 'retell',
      'basic_dictation', 'fill_gaps', 'complete_sentence'
    )),
  add column if not exists answers jsonb; -- selecciones de multiple choice / respuestas de gaps, para poder revisar después

-- ============================================================
-- 3. Semilla: 6 ejercicios (uno por subtipo)
-- ============================================================

insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, duration_category, speakers, questions, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.duration_category, v.speakers, v.questions, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select
    'conversation' as type,
    'listen_understand' as exercise_subtype,
    'Changing an appointment' as title,
    'Sarah: Hi, I''m calling because I''d like to change my appointment.' || chr(10) ||
    'John: Sure. What day would work better for you?' || chr(10) ||
    'Sarah: Would Thursday afternoon be possible?' || chr(10) ||
    'John: Let me check... Yes, I can offer you 3:30 PM.' as transcript,
    'making_appointments' as topic,
    'B1' as cefr_level,
    'short' as duration_category,
    '[{"speaker":"A","text":"Hi, I''m calling because I''d like to change my appointment."},{"speaker":"B","text":"Sure. What day would work better for you?"},{"speaker":"A","text":"Would Thursday afternoon be possible?"},{"speaker":"B","text":"Let me check... Yes, I can offer you 3:30 PM."}]'::jsonb as speakers,
    '[
      {"question":"Why is Sarah calling?","options":["To cancel her appointment.","To change her appointment.","To make a new appointment.","To ask about the price."],"correct_index":1,"explanation":"Sarah dice \"I''d like to change my appointment\".","targets":["appointment"]},
      {"question":"What time does John offer her?","options":["Thursday at 10:00 AM","Thursday at 3:30 PM","Friday at 3:30 PM","Thursday at 1:30 PM"],"correct_index":1,"explanation":"John dice \"I can offer you 3:30 PM\" despu\u00e9s de que Sarah pide el jueves por la tarde.","targets":["available"]}
    ]'::jsonb as questions,
    array['contraction:I''m','contraction:I''d']::text[] as target_patterns,
    array['appointment','available']::text[] as target_vocabulary,
    3 as difficulty

  union all select
    'conversation', 'main_idea',
    'A delayed order',
    'Customer: Hi, I''m calling about an order that was supposed to arrive yesterday, and it still hasn''t shown up.' || chr(10) ||
    'Agent: I''m sorry about that. Let me check what happened... It looks like it''s stuck at the local depot, but it should be delivered by tomorrow morning.' || chr(10) ||
    'Customer: Okay, but this is actually the second time this has happened with my orders.' || chr(10) ||
    'Agent: I understand your frustration. I''ll add a credit to your account for the inconvenience, and I''ll flag this so it doesn''t happen again.',
    'customer_service',
    'B2',
    'medium',
    '[{"speaker":"A","text":"Hi, I''m calling about an order that was supposed to arrive yesterday, and it still hasn''t shown up."},{"speaker":"B","text":"I''m sorry about that. Let me check what happened... It looks like it''s stuck at the local depot, but it should be delivered by tomorrow morning."},{"speaker":"A","text":"Okay, but this is actually the second time this has happened with my orders."},{"speaker":"B","text":"I understand your frustration. I''ll add a credit to your account for the inconvenience, and I''ll flag this so it doesn''t happen again."}]'::jsonb,
    '[
      {"question":"What is this conversation mainly about?","options":["A customer asking how to place an order.","A customer complaining about a repeated delivery problem.","A customer asking for a refund on a broken item.","An agent offering a discount on a new order."],"correct_index":1,"explanation":"El cliente llama porque su pedido no lleg\u00f3, y menciona que ya le pas\u00f3 antes \u2014 es una queja por un problema repetido.","targets":["however"]}
    ]'::jsonb,
    array['contraction:I''m','contraction:hasn''t','contraction:it''s','contraction:I''ll']::text[],
    array['depot','credit','inconvenience']::text[],
    5

  union all select
    'conversation', 'retell',
    'Explaining a problem at work',
    'A: You look stressed. Is everything okay?' || chr(10) ||
    'B: Not really. I found out this morning that the client meeting got moved up to today, and I haven''t finished the report yet.' || chr(10) ||
    'A: That''s rough. Do you want some help with it?' || chr(10) ||
    'B: Actually, that would be great. I think I can finish the numbers if you could help me with the summary slide.' || chr(10) ||
    'A: No problem, although we should probably start right now if the meeting''s this afternoon.',
    'workplace',
    'B2',
    'medium',
    '[{"speaker":"A","text":"You look stressed. Is everything okay?"},{"speaker":"B","text":"Not really. I found out this morning that the client meeting got moved up to today, and I haven''t finished the report yet."},{"speaker":"A","text":"That''s rough. Do you want some help with it?"},{"speaker":"B","text":"Actually, that would be great. I think I can finish the numbers if you could help me with the summary slide."},{"speaker":"A","text":"No problem, although we should probably start right now if the meeting''s this afternoon."}]'::jsonb,
    null,
    array['contraction:haven''t','contraction:that''s','reduction:going to','contraction:meeting''s']::text[],
    array['moved up','summary slide']::text[],
    6

  union all select
    'dictation', 'basic_dictation',
    'Dictation: no availability',
    'I''m afraid we don''t have any availability at that time.',
    'customer_service', 'B2', null, null, null,
    array['contraction:I''m']::text[], array['availability']::text[], 5
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, duration_category, speakers, questions, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);

insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, gap_template, gap_answers, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.gap_template, v.gap_answers, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select
    'dictation' as type,
    'fill_gaps' as exercise_subtype,
    'Fill the gaps: check and get back' as title,
    'I''ll check that for you and get back to you shortly.' as transcript,
    'customer_service' as topic,
    'B1' as cefr_level,
    'I''ll check that for you and ___ back to you shortly.' as gap_template,
    array['get']::text[] as gap_answers,
    array['contraction:I''ll']::text[] as target_patterns,
    array['get back to you']::text[] as target_vocabulary,
    3 as difficulty
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, gap_template, gap_answers, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);

insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, prompt_prefix, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.prompt_prefix, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select
    'dictation' as type,
    'complete_sentence' as exercise_subtype,
    'Complete the sentence: understand but' as title,
    'I understand what you mean, but we can''t make an exception this time.' as transcript,
    'customer_service' as topic,
    'B2' as cefr_level,
    'I understand what you mean, but' as prompt_prefix,
    array['contraction:can''t']::text[] as target_patterns,
    array['make an exception']::text[] as target_vocabulary,
    5 as difficulty
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, prompt_prefix, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);
