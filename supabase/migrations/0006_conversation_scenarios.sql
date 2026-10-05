-- English Personal Trainer — escenarios de conversación
-- Idempotente.

insert into public.conversation_scenarios (category, title, description, level, cefr_level)
select * from (values
  ('casual', 'Meeting someone new', 'A relaxed first conversation: names, where you''re from, what you do.', null, 'B1'),
  ('casual', 'Talking about your weekend', 'Chat naturally about what you did (or plan to do) at the weekend.', null, 'B1'),
  ('casual', 'Technology and AI', 'A casual chat about AI tools and how technology is changing daily life.', null, 'B2'),

  ('travel', 'At the airport', 'Check-in, security, boarding — handling the small talk and instructions.', null, 'B1'),
  ('travel', 'Problems with a hotel reservation', 'Your booking has an issue and you need to sort it out at reception.', null, 'B2'),
  ('travel', 'Asking for directions', 'You''re lost in an unfamiliar city and need help getting somewhere.', null, 'A2'),

  ('customer_service', 'Basic customer interaction', 'Greet a customer and understand a simple request.', 1, 'A2'),
  ('customer_service', 'Understanding customer problems', 'A customer explains an issue; your job is to understand it fully.', 2, 'B1'),
  ('customer_service', 'Clarifying information', 'Practise asking the right clarifying questions before acting.', 3, 'B1'),
  ('customer_service', 'Offering solutions', 'Propose a solution to a customer''s problem clearly and confidently.', 4, 'B1'),
  ('customer_service', 'Handling complaints', 'A customer is unhappy with a product or service — handle it professionally.', 5, 'B2'),
  ('customer_service', 'Angry customers', 'De-escalate a frustrated, raised-voice customer without losing composure.', 6, 'B2'),
  ('customer_service', 'Phone support', 'A support call with no visual cues — clarity matters even more.', 7, 'B2'),
  ('customer_service', 'Professional vocabulary', 'Use precise, professional language in a slightly more formal interaction.', 8, 'B2'),
  ('customer_service', 'Full realistic simulation', 'A longer, realistic customer-service interaction combining everything above.', 10, 'C1'),

  ('job_interview', 'Tell me about yourself', 'The classic opener — practise a clear, well-structured answer.', null, 'B1'),
  ('job_interview', 'Customer service experience', 'Talk about past experience relevant to a customer-facing role.', null, 'B2'),
  ('job_interview', 'Strengths and weaknesses', 'Answer honestly and constructively about strengths and areas to improve.', null, 'B2'),
  ('job_interview', 'Why should we hire you?', 'Make a confident, concise case for yourself.', null, 'B2')
) as s(category, title, description, level, cefr_level)
where not exists (
  select 1 from public.conversation_scenarios existing
  where existing.category = s.category and existing.title = s.title
);
