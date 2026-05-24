import Anthropic from '@anthropic-ai/sdk';
import {
  buildQuestionGenerationPrompt,
  buildScoringPrompt,
  buildPrepSheetPrompt,
} from './prompts';
import { GeneratedQuestion, QuestionCategory, ScoreResponse } from '@/types';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY environment variable is not set.'
    );
  }
  return new Anthropic({ apiKey });
}

function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
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
  const prompt = buildQuestionGenerationPrompt(resumeText, jobDescription, companyNotes);

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI.');

  const questions = parseJSON<GeneratedQuestion[]>(content.text);

  if (!Array.isArray(questions)) throw new Error('AI returned invalid question format.');

  // Validate categories
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
): Promise<ScoreResponse> {
  if (!answer.trim()) throw new Error('Answer text is required.');

  const client = getClient();
  const prompt = buildScoringPrompt(question, category, answer, jobDescription, resumeText);

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI.');

  const score = parseJSON<ScoreResponse>(content.text);

  // Clamp all numeric fields
  const intFields = [
    'star_alignment', 'clarity', 'tone', 'confidence', 'technical_depth',
    'realism', 'answer_length', 'jd_alignment', 'business_impact', 'ai_robotic_phrasing',
  ] as const;

  for (const field of intFields) {
    score[field] = Math.min(10, Math.max(1, Math.round(score[field])));
  }

  score.overall_score = Math.min(10, Math.max(1, Number(score.overall_score.toFixed(1))));

  return score;
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

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from AI.');

  return parseJSON(content.text);
}
