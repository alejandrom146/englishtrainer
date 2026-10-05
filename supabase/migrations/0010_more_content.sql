-- English Personal Trainer — más contenido
-- Vocabulario, conectores, imágenes de Describe the Image y ejercicios
-- de Listening adicionales. Solo INSERTs sobre tablas existentes,
-- idempotente (no duplica si el título/palabra ya existe).

-- ============================================================
-- 1. Vocabulario (20 palabras)
-- ============================================================
insert into public.vocabulary (word, ipa, part_of_speech, definition, example_sentence, topic, cefr_level)
select * from (values
  ('reschedule', 'ˌriːˈskedjuːl', 'verb', 'To change something to a different time or date.', 'Could we reschedule the meeting for Thursday instead?', 'job_interview', 'B1'),
  ('availability', 'əˌveɪləˈbɪləti', 'noun', 'Whether something or someone is free or can be used.', 'Let me check our availability for next week.', 'customer_service', 'B2'),
  ('inquiry', 'ɪnˈkwaɪəri', 'noun', 'A question asking for information.', 'We received an inquiry about the return policy.', 'customer_service', 'B2'),
  ('voucher', 'ˈvaʊtʃə', 'noun', 'A document that can be exchanged for goods or services.', 'We can offer you a voucher for your next visit.', 'customer_service', 'B1'),
  ('warranty', 'ˈwɒrənti', 'noun', 'A promise to repair or replace something if it breaks.', 'This laptop comes with a two-year warranty.', 'customer_service', 'B2'),
  ('colleague', 'ˈkɒliːɡ', 'noun', 'A person you work with.', 'I''ll ask a colleague to cover the phones this afternoon.', 'workplace', 'B1'),
  ('deadline', 'ˈdedlaɪn', 'noun', 'The time by which something must be finished.', 'The deadline for the report is Friday morning.', 'workplace', 'B1'),
  ('feedback', 'ˈfiːdbæk', 'noun', 'Opinions about how well something was done.', 'Thanks for the feedback — I''ll make those changes.', 'workplace', 'B1'),
  ('candidate', 'ˈkændɪdət', 'noun', 'A person applying for a job.', 'We interviewed three candidates for the position.', 'job_interview', 'B1'),
  ('qualification', 'ˌkwɒlɪfɪˈkeɪʃn', 'noun', 'A skill or achievement that makes someone suitable for a job.', 'Do you have any qualifications in customer service?', 'job_interview', 'B2'),
  ('flexible', 'ˈfleksəbl', 'adjective', 'Able to change or adapt easily.', 'I''m quite flexible with my working hours.', 'job_interview', 'B1'),
  ('reliable', 'rɪˈlaɪəbl', 'adjective', 'Able to be trusted to do something well.', 'She''s one of the most reliable people on the team.', 'job_interview', 'B1'),
  ('efficient', 'ɪˈfɪʃnt', 'adjective', 'Doing something well without wasting time or resources.', 'We need a more efficient way to handle complaints.', 'workplace', 'B2'),
  ('accommodate', 'əˈkɒmədeɪt', 'verb', 'To provide what someone needs, or to adapt to fit them.', 'We''ll try to accommodate your request if possible.', 'customer_service', 'B2'),
  ('boarding', 'ˈbɔːdɪŋ', 'noun', 'The process of getting onto a plane, train, or ship.', 'Boarding for your flight starts at gate 12.', 'travel', 'B1'),
  ('connection', 'kəˈnekʃn', 'noun', 'A flight or train that continues your journey after the first one.', 'We might miss our connection if this flight is delayed.', 'travel', 'B2'),
  ('refundable', 'rɪˈfʌndəbl', 'adjective', 'Able to be paid back.', 'Is this ticket refundable if I need to cancel?', 'travel', 'B2'),
  ('negotiate', 'nɪˈɡəʊʃieɪt', 'verb', 'To discuss something in order to reach an agreement.', 'We might be able to negotiate a better rate.', 'workplace', 'B2'),
  ('proactive', 'ˌprəʊˈæktɪv', 'adjective', 'Taking action before a problem happens, rather than reacting to it.', 'I like to be proactive rather than wait for complaints.', 'job_interview', 'B2'),
  ('punctual', 'ˈpʌŋktʃuəl', 'adjective', 'Arriving or doing things at the arranged time.', 'It''s important to be punctual for the interview.', 'job_interview', 'B1')
) as v(word, ipa, part_of_speech, definition, example_sentence, topic, cefr_level)
where not exists (select 1 from public.vocabulary existing where existing.word = v.word);

-- ============================================================
-- 2. Conectores nuevos (10) como expressions
-- ============================================================
insert into public.expressions (text, type, meaning, register, usage_notes, example_sentence, cefr_level)
select * from (values
  ('nevertheless', 'connector', 'Introduces a contrast, similar to "however" but slightly more formal.', 'formal', 'Common in writing and formal speech.', 'The flight was delayed. Nevertheless, we arrived in time for the meeting.', 'B2'),
  ('consequently', 'connector', 'Introduces a result or consequence.', 'formal', 'More formal than "so"; similar to "therefore".', 'The system crashed twice last week. Consequently, we upgraded the servers.', 'B2'),
  ('meanwhile', 'connector', 'Describes something happening at the same time as something else.', 'neutral', 'Often used to switch between two parallel situations.', 'I''ll call the supplier. Meanwhile, could you check the stock?', 'B2'),
  ('as well as', 'connector', 'Adds an extra item or point, similar to "and".', 'neutral', 'Can join two nouns or two actions.', 'She handles complaints as well as general enquiries.', 'B2'),
  ('apart from', 'connector', 'Introduces an exception to a general statement.', 'neutral', 'Similar to "except for".', 'Apart from one small issue, the order arrived perfectly.', 'B2'),
  ('despite', 'connector', 'Introduces a contrast, followed by a noun or -ing form (not a full clause).', 'neutral', 'Unlike "although", it''s followed by a noun phrase, not subject+verb.', 'Despite the delay, the customer stayed calm.', 'B2'),
  ('such as', 'connector', 'Introduces an example, similar to "for example" but inside the sentence.', 'neutral', 'Used right after the noun it''s giving examples of.', 'We offer several options, such as express delivery and store pickup.', 'B1'),
  ('to be honest', 'connector', 'Introduces a frank or direct opinion.', 'informal', 'Common in spoken English, softens a blunt statement.', 'To be honest, I think we should just offer a refund.', 'B1'),
  ('the thing is', 'connector', 'Introduces the main point or a problem, often before explaining further.', 'informal', 'Very common in spoken English to lead into an explanation.', 'The thing is, we don''t usually accept returns after 30 days.', 'B1'),
  ('provided that', 'connector', 'Introduces a condition, similar to "if" but more formal.', 'formal', 'Common in policies and formal agreements.', 'We can offer a refund, provided that you have the receipt.', 'B2')
) as c(text, type, meaning, register, usage_notes, example_sentence, cefr_level)
where not exists (
  select 1 from public.expressions existing where existing.text = c.text and existing.type = 'connector'
);

-- ============================================================
-- 3. Describe the Image: 2 imagenes nuevas (restaurant, job interview)
-- ============================================================
insert into public.describe_image_exercises (title, image_path, topic, cefr_level, key_elements)
select * from (values
  ('Restaurant dinner', '/images/describe/restaurant.webp', 'restaurants', 'B2', '{"who": "two people sitting at a table, and a waiter standing nearby", "where": "a restaurant, with a window and a curtain in the background", "what": "the two people seem to be having dinner together; the waiter appears to be carrying a tray, perhaps bringing or clearing something", "objects": ["a round table", "plates", "glasses", "a candle", "a tray"], "possible_inference": "it could be a romantic dinner or a meal between friends or colleagues; the waiter might be about to serve them or take their order"}'::jsonb),
  ('Job interview', '/images/describe/job-interview.webp', 'job_interview', 'B2', '{"who": "an interviewer sitting behind a desk and a candidate sitting across from them", "where": "an office, with a bookshelf and a window in the background", "what": "the interviewer appears to be speaking or gesturing while the candidate listens; there''s a laptop and what looks like a CV or document on the desk", "objects": ["a desk", "a laptop", "a folder or CV", "a bookshelf", "a window"], "possible_inference": "this looks like a job interview in progress; the candidate might be answering a question or waiting to be asked one"}'::jsonb)
) as v(title, image_path, topic, cefr_level, key_elements)
where not exists (
  select 1 from public.describe_image_exercises existing where existing.title = v.title
);

-- ============================================================
-- 4. Listening: 2 ejercicios nuevos por cada uno de los 6 subtipos
-- ============================================================
insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, duration_category, speakers, questions, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.duration_category, v.speakers, v.questions, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select 'conversation' as type, 'listen_understand' as exercise_subtype,
    'Booking a restaurant table' as title,
    'A: Good evening, thank you for calling Riverside Grill. How can I help you?
B: Hi, I''d like to book a table for four, please, for Saturday evening.
A: Of course. What time would you like?
B: Around 7:30, if that''s possible.
A: Let me check... yes, we have a table available at 7:30.' as transcript,
    'restaurants' as topic, 'B1' as cefr_level, 'short' as duration_category,
    '[{"speaker": "A", "text": "Good evening, thank you for calling Riverside Grill. How can I help you?"}, {"speaker": "B", "text": "Hi, I''d like to book a table for four, please, for Saturday evening."}, {"speaker": "A", "text": "Of course. What time would you like?"}, {"speaker": "B", "text": "Around 7:30, if that''s possible."}, {"speaker": "A", "text": "Let me check... yes, we have a table available at 7:30."}]'::jsonb as speakers,
    '[{"question": "What is the customer trying to do?", "options": ["Cancel a reservation.", "Book a table for four.", "Order food for delivery.", "Ask about opening hours."], "correct_index": 1, "explanation": "El cliente dice \"I''d like to book a table for four\".", "targets": ["book a table"]}, {"question": "What time does the customer ask for?", "options": ["6:30", "7:00", "7:30", "8:30"], "correct_index": 2, "explanation": "El cliente pide \"around 7:30\".", "targets": []}]'::jsonb as questions,
    array['contraction:I''d']::text[] as target_patterns,
    array['book a table','available']::text[] as target_vocabulary,
    3 as difficulty
  union all select 'conversation', 'listen_understand',
    'Asking about a job opening',
    'A: Hi, I saw your advert for a customer service assistant. Is the position still available?
B: Yes, it is. Have you got any experience in customer service?
A: Yes, I worked in a call centre for two years.
B: Great, could you send us your CV by email?',
    'job_interview', 'B1', 'short',
    '[{"speaker": "A", "text": "Hi, I saw your advert for a customer service assistant. Is the position still available?"}, {"speaker": "B", "text": "Yes, it is. Have you got any experience in customer service?"}, {"speaker": "A", "text": "Yes, I worked in a call centre for two years."}, {"speaker": "B", "text": "Great, could you send us your CV by email?"}]'::jsonb,
    '[{"question": "Why is the caller phoning?", "options": ["To complain about a product.", "To ask if a job is still available.", "To ask for a refund.", "To book an appointment."], "correct_index": 1, "explanation": "El que llama pregunta \"Is the position still available?\".", "targets": ["available"]}, {"question": "What does the caller say about their experience?", "options": ["They have no experience.", "They worked in a shop.", "They worked in a call centre for two years.", "They studied customer service at university."], "correct_index": 2, "explanation": "Dice \"I worked in a call centre for two years\".", "targets": []}]'::jsonb,
    array[]::text[],
    array['call centre','available','CV']::text[],
    3
  union all select 'conversation', 'main_idea',
    'AI tools at work',
    'A: Have you tried using that new AI tool for writing emails?
B: Yeah, I have. It saves me a lot of time, but sometimes the tone isn''t quite right.
A: Same here. I still have to edit almost everything it writes.
B: True, but overall it''s still faster than starting from scratch.',
    'technology', 'B2', 'medium',
    '[{"speaker": "A", "text": "Have you tried using that new AI tool for writing emails?"}, {"speaker": "B", "text": "Yeah, I have. It saves me a lot of time, but sometimes the tone isn''t quite right."}, {"speaker": "A", "text": "Same here. I still have to edit almost everything it writes."}, {"speaker": "B", "text": "True, but overall it''s still faster than starting from scratch."}]'::jsonb,
    '[{"question": "What is this conversation mainly about?", "options": ["The speakers are arguing about which AI tool is the best.", "The speakers are discussing the pros and cons of an AI writing tool.", "One speaker is teaching the other how to use AI.", "The speakers are complaining that AI tools don''t work at all."], "correct_index": 1, "explanation": "Ambos mencionan ventajas (ahorra tiempo) y desventajas (el tono no es exacto) del mismo tool.", "targets": ["however"]}]'::jsonb,
    array['contraction:isn''t','contraction:it''s']::text[],
    array['from scratch']::text[],
    5
  union all select 'conversation', 'main_idea',
    'A flight delay',
    'A: Excuse me, do you know why our flight''s been delayed?
B: I heard there''s a problem with the weather at the connecting airport.
A: That''s frustrating, I have a connection to catch in two hours.
B: I know, they said they''d give us more information in twenty minutes.',
    'travel', 'B2', 'medium',
    '[{"speaker": "A", "text": "Excuse me, do you know why our flight''s been delayed?"}, {"speaker": "B", "text": "I heard there''s a problem with the weather at the connecting airport."}, {"speaker": "A", "text": "That''s frustrating, I have a connection to catch in two hours."}, {"speaker": "B", "text": "I know, they said they''d give us more information in twenty minutes."}]'::jsonb,
    '[{"question": "What is this conversation mainly about?", "options": ["Two passengers discussing a flight delay caused by weather.", "A passenger complaining about lost luggage.", "Two passengers planning their holiday itinerary.", "An agent explaining airport security rules."], "correct_index": 0, "explanation": "Hablan del vuelo demorado y la causa (el clima en el aeropuerto de conexión).", "targets": ["connection"]}]'::jsonb,
    array['contraction:flight''s','contraction:there''s','contraction:that''s','contraction:they''d']::text[],
    array['connection','delayed']::text[],
    5
  union all select 'conversation', 'retell',
    'Solving a shipping problem',
    'A: Hi, I ordered a jacket last week but received the wrong size.
B: I''m sorry about that. Would you like an exchange or a refund?
A: An exchange would be great, if possible.
B: Sure, I''ll send a return label to your email, and we''ll ship the correct size as soon as we receive it back.',
    'customer_service', 'B2', 'medium',
    '[{"speaker": "A", "text": "Hi, I ordered a jacket last week but received the wrong size."}, {"speaker": "B", "text": "I''m sorry about that. Would you like an exchange or a refund?"}, {"speaker": "A", "text": "An exchange would be great, if possible."}, {"speaker": "B", "text": "Sure, I''ll send a return label to your email, and we''ll ship the correct size as soon as we receive it back."}]'::jsonb,
    null,
    array['contraction:I''m','contraction:I''ll','contraction:we''ll']::text[],
    array['exchange','return label']::text[],
    5
  union all select 'conversation', 'retell',
    'Planning a night out',
    'A: Do you fancy going out this weekend?
B: Sure, what did you have in mind?
A: There''s a new restaurant that just opened downtown, or we could just grab a drink somewhere quiet.
B: Let''s try the restaurant, actually — I''ve heard really good things about it.',
    'social_situations', 'B1', 'short',
    '[{"speaker": "A", "text": "Do you fancy going out this weekend?"}, {"speaker": "B", "text": "Sure, what did you have in mind?"}, {"speaker": "A", "text": "There''s a new restaurant that just opened downtown, or we could just grab a drink somewhere quiet."}, {"speaker": "B", "text": "Let''s try the restaurant, actually — I''ve heard really good things about it."}]'::jsonb,
    null,
    array['contraction:there''s','contraction:let''s','contraction:I''ve']::text[],
    array['fancy','grab a drink']::text[],
    3
  union all select 'dictation', 'basic_dictation',
    'Dictation: transfer your call',
    'Could you hold on for just a moment while I transfer your call?',
    'customer_service', 'B2', null, null, null,
    array[]::text[],
    array['transfer','hold on']::text[],
    4
  union all select 'dictation', 'basic_dictation',
    'Dictation: appreciate your patience',
    'We really appreciate your patience while we sort this out.',
    'customer_service', 'B2', null, null, null,
    array[]::text[],
    array['appreciate','sort out']::text[],
    4
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, duration_category, speakers, questions, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);

insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, gap_template, gap_answers, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.gap_template, v.gap_answers, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select 'dictation' as type, 'fill_gaps' as exercise_subtype,
    'Fill the gaps: resolved by tomorrow' as title,
    'I''m sorry for the inconvenience, but we should have this resolved by tomorrow.' as transcript,
    'customer_service' as topic, 'B2' as cefr_level,
    'I''m sorry for the inconvenience, but we should have this ___ by tomorrow.' as gap_template,
    array['resolved']::text[] as gap_answers,
    array['contraction:I''m']::text[] as target_patterns,
    array['inconvenience','resolved']::text[] as target_vocabulary,
    4 as difficulty
  union all select 'dictation', 'fill_gaps',
    'Fill the gaps: holding for a moment',
    'Would you mind holding for a moment while I check that for you?',
    'customer_service', 'B1',
    'Would you mind ___ for a moment while I check that for you?',
    array['holding']::text[],
    array['reduction:would you']::text[],
    array['would you mind']::text[],
    3
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, gap_template, gap_answers, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);

insert into public.listening_exercises
  (type, exercise_subtype, title, transcript, topic, cefr_level, prompt_prefix, target_patterns, target_vocabulary, difficulty)
select v.type, v.exercise_subtype, v.title, v.transcript, v.topic, v.cefr_level, v.prompt_prefix, v.target_patterns, v.target_vocabulary, v.difficulty
from (
  select 'dictation' as type, 'complete_sentence' as exercise_subtype,
    'Complete the sentence: waiting list' as title,
    'Although we''re currently fully booked, I can put you on a waiting list.' as transcript,
    'customer_service' as topic, 'B2' as cefr_level,
    'Although we''re currently fully booked,' as prompt_prefix,
    array['contraction:we''re']::text[] as target_patterns,
    array['fully booked','waiting list']::text[] as target_vocabulary,
    5 as difficulty
  union all select 'dictation', 'complete_sentence',
    'Complete the sentence: fix it',
    'I completely understand your frustration, and I''ll do everything I can to fix it.',
    'customer_service', 'B2',
    'I completely understand your frustration, and',
    array['contraction:I''ll']::text[],
    array['frustration']::text[],
    5
) as v(type, exercise_subtype, title, transcript, topic, cefr_level, prompt_prefix, target_patterns, target_vocabulary, difficulty)
where not exists (
  select 1 from public.listening_exercises existing where existing.title = v.title
);
