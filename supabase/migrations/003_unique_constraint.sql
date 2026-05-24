-- Migration 002 added a partial unique index (WHERE question_id IS NOT NULL) to
-- practice_answers. Partial indexes are not recognised by Supabase PostgREST's
-- onConflict upsert — it requires a proper named unique constraint. Replace it.

DROP INDEX IF EXISTS practice_answers_session_question_unique;

-- A regular unique constraint on a nullable column treats each NULL as distinct,
-- so orphaned rows (question_id IS NULL after SET NULL cascade) don't collide.
-- Non-null (session_id, question_id) pairs are correctly deduplicated.
ALTER TABLE practice_answers
  ADD CONSTRAINT practice_answers_session_question_unique
  UNIQUE (session_id, question_id);
