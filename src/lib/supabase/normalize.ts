import { AnswerScore } from '@/types';

// Supabase nested selects with a one-to-one relation (answer_scores)
// are returned as an array when using the `score:answer_scores(*)` syntax.
// Normalise to a single object everywhere so consumers don't need to branch.
export function normalizeScore(
  raw: AnswerScore | AnswerScore[] | null | undefined
): AnswerScore | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[0] ?? undefined;
  return raw;
}
