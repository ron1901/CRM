-- Adds storage for AI-suggested observations awaiting human approval. Run once in Supabase → SQL Editor.
alter table interviews add column if not exists ai_suggestions jsonb;
notify pgrst, 'reload schema';
