-- Fix 1: Break the cascade from interview_questions → practice_answers.
-- Regenerating questions must never silently wipe historical answer data.
-- Change question_id to nullable + SET NULL so answers survive question replacement.

ALTER TABLE practice_answers ALTER COLUMN question_id DROP NOT NULL;

ALTER TABLE practice_answers
  DROP CONSTRAINT practice_answers_question_id_fkey;

ALTER TABLE practice_answers
  ADD CONSTRAINT practice_answers_question_id_fkey
  FOREIGN KEY (question_id)
  REFERENCES interview_questions(id)
  ON DELETE SET NULL;

-- Fix 2: Prevent duplicate answers for the same (session, question).
-- Use a partial unique index so NULL question_ids (orphaned after SET NULL) are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS practice_answers_session_question_unique
  ON practice_answers(session_id, question_id)
  WHERE question_id IS NOT NULL;

-- Fix 5: Enable RLS on all tables.
-- Permissive open policies for local MVP — replace with auth-scoped policies for production.
ALTER TABLE practice_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_scores        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mvp_open_practice_profiles"   ON practice_profiles   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open_interview_questions" ON interview_questions  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open_practice_sessions"   ON practice_sessions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open_practice_answers"    ON practice_answers     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mvp_open_answer_scores"       ON answer_scores        FOR ALL USING (true) WITH CHECK (true);
