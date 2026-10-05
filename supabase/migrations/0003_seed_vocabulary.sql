-- English Personal Trainer — semilla inicial de vocabulario
-- British English, B1+/B2, orientado a atención al cliente y conversación
-- cotidiana. Contenido de prueba para que el módulo de vocabulario tenga
-- algo real que servir; se irá ampliando (y generando con IA) más adelante.
--
-- Idempotente: no duplica si ya existen (usa el texto de la palabra como
-- clave natural de comprobación).

insert into public.vocabulary (word, ipa, part_of_speech, definition, example_sentence, topic, cefr_level)
select * from (values
  ('refund', 'ˈriːfʌnd', 'noun', 'Money given back to a customer, usually for a returned product or cancelled service.', 'We can offer you a full refund if the item arrived damaged.', 'customer_service', 'B1'),
  ('complaint', 'kəmˈpleɪnt', 'noun', 'A statement that something is unsatisfactory or unacceptable.', 'I''d like to raise a complaint about a delayed delivery.', 'customer_service', 'B1'),
  ('apologise', 'əˈpɒlədʒaɪz', 'verb', 'To say sorry for something, typically in a formal or professional way.', 'I completely understand your frustration, and I apologise for the delay.', 'customer_service', 'B1'),
  ('reassure', 'ˌriːəˈʃʊə', 'verb', 'To say or do something to remove someone''s doubts or fears.', 'Let me reassure you that we''ll get this sorted today.', 'customer_service', 'B2'),
  ('inconvenience', 'ˌɪnkənˈviːniəns', 'noun', 'Trouble or difficulty caused to someone.', 'We''re sorry for any inconvenience this may have caused.', 'customer_service', 'B2'),
  ('escalate', 'ˈeskəleɪt', 'verb', 'To pass a problem on to someone with more authority to deal with it.', 'If it isn''t resolved by tomorrow, I''ll escalate it to my supervisor.', 'customer_service', 'B2'),
  ('outstanding', 'aʊtˈstændɪŋ', 'adjective', 'Not yet paid, resolved, or dealt with.', 'You still have an outstanding payment on your account.', 'customer_service', 'B2'),
  ('overwhelmed', 'ˌəʊvəˈwelmd', 'adjective', 'Having so much of something that you can''t deal with it easily.', 'I know it feels overwhelming — let''s go through it step by step.', 'everyday_life', 'B2'),
  ('commute', 'kəˈmjuːt', 'verb', 'To travel regularly between home and work.', 'I commute into the city by train every day.', 'everyday_life', 'B1'),
  ('procrastinate', 'prəˈkræstɪneɪt', 'verb', 'To delay doing something that should be done.', 'I always end up procrastinating before a big deadline.', 'everyday_life', 'B2'),
  ('groundbreaking', 'ˈɡraʊndbreɪkɪŋ', 'adjective', 'Innovative; introducing new ideas or methods.', 'The new AI model is genuinely groundbreaking.', 'technology', 'B2'),
  ('glitch', 'ɡlɪtʃ', 'noun', 'A small, usually temporary problem with a machine or system.', 'There seems to be a glitch in the booking system.', 'technology', 'B1'),
  ('itinerary', 'aɪˈtɪnərəri', 'noun', 'A planned route or schedule for a journey.', 'Could you send me the full itinerary for the trip?', 'travel', 'B2'),
  ('layover', 'ˈleɪəʊvə', 'noun', 'A break in a journey, especially at an airport.', 'We have a three-hour layover in Amsterdam.', 'travel', 'B1'),
  ('candid', 'ˈkændɪd', 'adjective', 'Honest and direct, even about difficult topics.', 'To be candid, I think we could have handled that better.', 'job_interview', 'B2')
) as v(word, ipa, part_of_speech, definition, example_sentence, topic, cefr_level)
where not exists (
  select 1 from public.vocabulary existing where existing.word = v.word
);
