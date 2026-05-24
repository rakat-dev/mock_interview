import OpenAI from 'openai';
import {
  buildQuestionGenerationPrompt,
  buildScoringPrompt,
  buildPrepSheetPrompt,
} from './prompts';
import { GeneratedQuestion, QuestionCategory, ScoreResponse } from '@/types';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set.');
  return new OpenAI({ apiKey });
}

function getModel(): string {
  // Configure via OPENAI_MODEL_FAST env var. Recommended: gpt-4o-mini (cheap, fast, good JSON).
  // For higher accuracy at higher cost, set OPENAI_MODEL_FAST=gpt-4o.
  return process.env.OPENAI_MODEL_FAST ?? 'gpt-4o-mini';
}

function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function generateInterviewQuestions(
  resumeText: string,
  jobDescription: string,
  companyNotes?: string
): Promise<GeneratedQuestion[]> {
  if (!resumeText.trim()) throw new Error('Resume text is required.');
  if (!jobDescription.trim()) throw new Error('Job description is required.');

  const client = getClient();
  const model = getModel();
  const prompt = buildQuestionGenerationPrompt(resumeText, jobDescription, companyNotes);

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned an empty response.');

  const questions = parseJSON<GeneratedQuestion[]>(text);
  if (!Array.isArray(questions)) throw new Error('GPT returned invalid question format.');

  const validCategories: QuestionCategory[] = [
    'recruiter', 'behavioral', 'hiring_manager', 'technical',
    'project_deep_dive', 'system_design', 'gap_risk',
  ];

  return questions.map((q, i) => ({
    ...q,
    rank: q.rank ?? i + 1,
    category: validCategories.includes(q.category) ? q.category : 'behavioral',
  }));
}

export async function scoreAnswer(
  question: string,
  category: QuestionCategory,
  answer: string,
  jobDescription: string,
  resumeText: string
): Promise<{ score: ScoreResponse; model: string }> {
  if (!answer.trim()) throw new Error('Answer text is required.');

  const client = getClient();
  const model = getModel();
  const prompt = buildScoringPrompt(question, category, answer, jobDescription, resumeText);

  const response = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    temperature: 0.3, // lower temp for consistent scoring
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned an empty response.');

  const score = parseJSON<ScoreResponse>(text);

  const intFields = [
    'star_alignment', 'clarity', 'tone', 'confidence', 'technical_depth',
    'realism', 'answer_length', 'jd_alignment', 'business_impact', 'ai_robotic_phrasing',
  ] as const;

  for (const field of intFields) {
    score[field] = Math.min(10, Math.max(1, Math.round(score[field])));
  }
  score.overall_score = Math.min(10, Math.max(1, Number(score.overall_score.toFixed(1))));

  return { score, model };
}

export async function generatePrepSheet(
  resumeText: string,
  jobDescription: string,
  sessionSummary: string
): Promise<{
  weak_areas: string[];
  risky_question_ids: string[];
  final_reminders: string[];
  overall_readiness: string;
}> {
  const client = getClient();
  const prompt = buildPrepSheetPrompt(resumeText, jobDescription, sessionSummary);

  const response = await client.chat.completions.create({
    model: getModel(),
    max_tokens: 2048,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0]?.message?.content ?? '';
  if (!text) throw new Error('OpenAI returned an empty response.');

  return parseJSON(text);
}
