// Claude is used exclusively for humanizing scored answers.
// Question generation, scoring, and prep sheet are handled by GPT (openai.ts).

import Anthropic from '@anthropic-ai/sdk';
import { buildHumanizeAnswerPrompt } from './prompts';
import { HumanizeResponse, QuestionCategory } from '@/types';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  return new Anthropic({ apiKey });
}

function getModel(): string {
  // Configure via ANTHROPIC_MODEL_HUMANIZER env var.
  // Recommended: claude-opus-4-5 for quality rewrites; claude-haiku-4-5-20251001 for speed/cost.
  return process.env.ANTHROPIC_MODEL_HUMANIZER ?? 'claude-opus-4-5';
}

function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function humanizeAnswer(
  question: string,
  category: QuestionCategory,
  originalAnswer: string,
  gptFeedback: { what_was_weak: string; improvement_suggestions: string },
  resumeText: string,
  jobDescription: string
): Promise<{ result: HumanizeResponse; model: string }> {
  if (!originalAnswer.trim()) throw new Error('Original answer is required.');

  const client = getClient();
  const model = getModel();
  const prompt = buildHumanizeAnswerPrompt(
    question,
    category,
    originalAnswer,
    gptFeedback,
    resumeText,
    jobDescription
  );

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude.');

  const result = parseJSON<HumanizeResponse>(content.text);

  if (!result.humanized_answer?.trim()) {
    throw new Error('Claude returned empty humanized_answer.');
  }

  return { result, model };
}
