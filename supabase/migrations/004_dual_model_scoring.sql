-- Dual-model scoring flow: GPT scores, Claude humanizes.
-- improved_answer becomes nullable (legacy rows keep their value; new rows use humanized_answer).

ALTER TABLE answer_scores ALTER COLUMN improved_answer DROP NOT NULL;

ALTER TABLE answer_scores
  ADD COLUMN IF NOT EXISTS gpt_model           text,
  ADD COLUMN IF NOT EXISTS claude_model        text,
  ADD COLUMN IF NOT EXISTS humanized_answer    text,
  ADD COLUMN IF NOT EXISTS humanization_notes  text,
  ADD COLUMN IF NOT EXISTS scoring_provider    text DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS humanizer_provider  text DEFAULT 'anthropic';
