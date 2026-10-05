-- English Personal Trainer — Achievements
-- La tabla `achievements` ya existía (creada en 0002) pero estaba vacía —
-- esta migración solo la puebla. No se crea ninguna tabla nueva.
-- Idempotente.

insert into public.achievements (code, title, description, icon)
select * from (values
  ('first_steps', 'First Steps', 'Gana tu primer XP en la app.', '🎉'),
  ('first_vocabulary', 'Word Collector', 'Aprende tu primera palabra de vocabulario.', '🗣️'),
  ('first_connector', 'Linking Up', 'Completa tu primer Connector Challenge.', '🔗'),
  ('first_pronunciation', 'Say It Right', 'Completa tu primer intento en el Pronunciation Lab.', '🎙️'),
  ('first_conversation', 'Let''s Talk', 'Termina tu primera conversación con la IA.', '💬'),
  ('first_listening', 'Tuning In', 'Completa tu primer ejercicio de Listening.', '🎧'),
  ('first_describe_image', 'Picture This', 'Completa tu primer Describe the Image.', '🖼️'),
  ('perfect_dictation', 'Perfect Ear', 'Consigue 100% de precisión en un ejercicio de dictado.', '💯'),
  ('vocabulary_25', 'Growing Vocabulary', 'Llega a 25 palabras en tu banco de vocabulario.', '📚'),
  ('vocabulary_mastered_5', 'Mastermind', 'Domina (mastered) 5 palabras.', '🧠'),
  ('connectors_active_10', 'Connector Pro', 'Usa 10 conectores distintos de forma activa.', '🧩'),
  ('streak_7', 'One Week Strong', 'Alcanza un streak de 7 días.', '🔥'),
  ('streak_30', 'Unstoppable', 'Alcanza un streak de 30 días.', '🚀'),
  ('level_5', 'Leveling Up', 'Llega al nivel 5.', '⭐'),
  ('weekly_goal_complete', 'Goal Getter', 'Cumple tu primera meta semanal.', '✅'),
  ('daily_challenge_complete', 'Challenge Accepted', 'Completa un Daily Challenge entero.', '🏆'),
  ('listening_10', 'Ears Wide Open', 'Completa 10 ejercicios de Listening.', '👂'),
  ('conversations_10', 'Chatterbox', 'Termina 10 conversaciones con la IA.', '🗨️')
) as a(code, title, description, icon)
where not exists (
  select 1 from public.achievements existing where existing.code = a.code
);
