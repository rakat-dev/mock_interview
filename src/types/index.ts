export type QuestionCategory =
  | 'recruiter'
  | 'behavioral'
  | 'hiring_manager'
  | 'technical'
  | 'project_deep_dive'
  | 'system_design'
  | 'gap_risk';

export interface PracticeProfile {
  id: string;
  user_id?: string | null;
  title: string;
  resume_text: string;
  job_description: string;
  company_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  profile_id: string;
  rank: number;
  question_text: string;
  category: QuestionCategory;
  why_likely: string;
  what_tested: string;
  answer_structure: string;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  profile_id: string;
  user_id?: string | null;
  status: 'active' | 'completed';
  created_at: string;
  completed_at?: string | null;
}

export interface PracticeAnswer {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  created_at: string;
}

export interface AnswerScore {
  id: string;
  answer_id: string;
  // GPT numeric scores
  star_alignment: number;
  clarity: number;
  tone: number;
  confidence: number;
  technical_depth: number;
  realism: number;
  answer_length: number;
  jd_alignment: number;
  business_impact: number;
  ai_robotic_phrasing: number;
  overall_score: number;
  // GPT qualitative feedback
  what_was_good: string;
  what_was_weak: string;
  improvement_suggestions: string;
  likely_followup: string;
  // Legacy field — kept for backwards compat with rows scored before dual-model flow
  improved_answer: string | null;
  // Dual-model provenance
  gpt_model: string | null;
  claude_model: string | null;
  scoring_provider: string | null;
  humanizer_provider: string | null;
  // Claude humanization output
  humanized_answer: string | null;
  humanization_notes: string | null;
  created_at: string;
}

export interface HumanizeResponse {
  humanized_answer: string;
  humanization_notes: string;
}

export interface AnswerWithScore extends PracticeAnswer {
  score?: AnswerScore;
  question?: InterviewQuestion;
}

export interface SessionWithDetails extends PracticeSession {
  answers: AnswerWithScore[];
  profile?: PracticeProfile;
}

export interface CategoryScore {
  category: QuestionCategory;
  averageScore: number;
  answerCount: number;
}

export interface DashboardStats {
  totalSessions: number;
  totalAnswers: number;
  averageOverallScore: number;
  categoryScores: CategoryScore[];
  weakestCategories: QuestionCategory[];
  strongestCategories: QuestionCategory[];
  readinessScores: Record<string, number>;
  questionsNeedingPractice: InterviewQuestion[];
}

export interface GeneratedQuestion {
  rank: number;
  question_text: string;
  category: QuestionCategory;
  why_likely: string;
  what_tested: string;
  answer_structure: string;
}

// Returned by GPT scoring — does not include improved_answer (Claude handles that)
export interface ScoreResponse {
  star_alignment: number;
  clarity: number;
  tone: number;
  confidence: number;
  technical_depth: number;
  realism: number;
  answer_length: number;
  jd_alignment: number;
  business_impact: number;
  ai_robotic_phrasing: number;
  overall_score: number;
  what_was_good: string;
  what_was_weak: string;
  improvement_suggestions: string;
  likely_followup: string;
}

export interface PrepSheet {
  top_questions: Array<{
    question: InterviewQuestion;
    best_answer: string;
    score: number;
  }>;
  weak_areas: string[];
  risky_questions: InterviewQuestion[];
  final_reminders: string[];
  overall_readiness: string;
}
