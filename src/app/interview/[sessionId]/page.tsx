'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeScore } from '@/lib/supabase/normalize';
import {
  InterviewQuestion, PracticeSession, PracticeAnswer, AnswerScore,
} from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, ScoreBadge } from '@/components/ui/Badge';
import { ScoreCard } from '@/components/ScoreCard';

interface AnswerWithScore extends PracticeAnswer {
  score?: AnswerScore;
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, AnswerWithScore>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showPrevious, setShowPrevious] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [humanizationWarning, setHumanizationWarning] = useState<string | undefined>();

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: sessionData, error: sessionError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) throw new Error('Session not found.');
      setSession(sessionData);

      const { data: questionsData } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('profile_id', sessionData.profile_id)
        .order('rank');

      setQuestions(questionsData ?? []);

      const { data: answersData } = await supabase
        .from('practice_answers')
        .select(`*, score:answer_scores(*)`)
        .eq('session_id', sessionId);

      const answerMap = new Map<string, AnswerWithScore>();
      for (const a of (answersData ?? [])) {
        answerMap.set(a.question_id, {
          ...a,
          score: normalizeScore(a.score),
        });
      }
      setAnswers(answerMap);

      // Resume from where we left off
      const nextUnanswered = (questionsData ?? []).findIndex(
        (q: InterviewQuestion) => !answerMap.has(q.id)
      );
      if (nextUnanswered !== -1) setCurrentIndex(nextUnanswered);
      else if ((questionsData ?? []).length > 0) setCurrentIndex((questionsData ?? []).length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : undefined;
  const answeredCount = answers.size;

  async function handleSubmitAnswer() {
    if (!answerText.trim() || !currentQuestion) return;
    setError('');
    setSubmitting(true);

    try {
      const supabase = createClient();

      // Upsert on (session_id, question_id) so re-answering a question
      // replaces the old row rather than hitting the unique constraint.
      const { data: answer, error: answerError } = await supabase
        .from('practice_answers')
        .upsert(
          {
            session_id: sessionId,
            question_id: currentQuestion.id,
            answer_text: answerText.trim(),
          },
          { onConflict: 'session_id,question_id' }
        )
        .select()
        .single();

      if (answerError) throw answerError;

      setSubmitting(false);
      setScoring(true);
      setShowScore(false);

      const res = await fetch('/api/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer_id: answer.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scoring failed.');
      }

      const { score, humanization_warning } = await res.json();
      setHumanizationWarning(humanization_warning);

      const updatedAnswer: AnswerWithScore = { ...answer, score };
      setAnswers((prev) => new Map(prev).set(currentQuestion.id, updatedAnswer));
      setShowScore(true);
      setAnswerText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    } finally {
      setScoring(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const supabase = createClient();
      await supabase
        .from('practice_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      router.push(`/dashboard`);
    } catch {
      setCompleting(false);
    }
  }

  function handleNext() {
    setShowScore(false);
    setAnswerText('');
    setShowPrevious(null);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrev() {
    setShowScore(false);
    setAnswerText('');
    setShowPrevious(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-gray-500">No questions found for this session.</p>
        <Button onClick={() => router.push('/profile')}>Create a new profile</Button>
      </div>
    );
  }

  const isAnswered = !!currentAnswer;
  const allAnswered = answeredCount === questions.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {answeredCount} answered
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => {
          const ans = answers.get(q.id);
          const score = ans?.score?.overall_score;
          const color =
            i === currentIndex ? 'bg-indigo-600' :
            score !== undefined
              ? score >= 8 ? 'bg-green-400' : score >= 6 ? 'bg-yellow-400' : 'bg-red-400'
              : 'bg-gray-200';
          return (
            <button
              key={q.id}
              onClick={() => { setCurrentIndex(i); setShowScore(!!answers.get(q.id)); setAnswerText(''); }}
              className={`w-7 h-7 rounded-full text-xs font-bold text-white transition-colors ${color}`}
              title={`Q${i + 1}: ${q.question_text.slice(0, 50)}...`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Current question */}
      <Card>
        <div className="flex items-start gap-3 mb-4">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
            {currentQuestion.rank}
          </span>
          <div>
            <CategoryBadge category={currentQuestion.category} />
          </div>
        </div>
        <p className="text-lg font-medium text-gray-900">{currentQuestion.question_text}</p>

        {/* Answer structure hint */}
        <details className="mt-3">
          <summary className="text-xs text-indigo-600 cursor-pointer hover:text-indigo-800 select-none">
            Hint: suggested answer structure
          </summary>
          <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
            {currentQuestion.answer_structure}
          </p>
        </details>
      </Card>

      {/* Answer input or show existing */}
      {!isAnswered ? (
        <div className="space-y-3">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={8}
            placeholder="Type your answer here. Write it as if you're speaking — don't over-polish it."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            disabled={submitting || scoring}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{answerText.length} characters</span>
            <Button
              onClick={handleSubmitAnswer}
              loading={submitting || scoring}
              disabled={!answerText.trim()}
            >
              {submitting ? 'Submitting...' : scoring ? 'Scoring...' : 'Submit Answer →'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Card padding="sm" className="bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your answer</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentAnswer.answer_text}</p>
          </Card>
        </div>
      )}

      {/* Score display */}
      {isAnswered && showScore && currentAnswer.score && (
        <ScoreCard score={currentAnswer.score} humanizationWarning={humanizationWarning} />
      )}

      {isAnswered && !showScore && currentAnswer.score && (
        <Button variant="secondary" onClick={() => setShowScore(true)} className="w-full">
          Show Score & Feedback
        </Button>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
          ← Previous
        </Button>

        <div className="flex gap-2">
          {allAnswered && (
            <Button variant="secondary" loading={completing} onClick={handleComplete}>
              Finish Session →
            </Button>
          )}
          {currentIndex < questions.length - 1 && (
            <Button onClick={handleNext}>
              Next Question →
            </Button>
          )}
        </div>
      </div>

      {/* Previous answered questions list */}
      {answeredCount > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 select-none">
            View all answered questions ({answeredCount})
          </summary>
          <div className="mt-3 space-y-2">
            {questions.filter(q => answers.has(q.id)).map((q, i) => {
              const ans = answers.get(q.id);
              return (
                <div
                  key={q.id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-200"
                  onClick={() => {
                    setCurrentIndex(questions.indexOf(q));
                    setShowScore(true);
                    setAnswerText('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span className="text-xs text-gray-400 font-medium w-5">{q.rank}</span>
                  <CategoryBadge category={q.category} />
                  <p className="text-sm text-gray-700 flex-1 truncate">{q.question_text}</p>
                  {ans?.score && <ScoreBadge score={ans.score.overall_score} />}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
