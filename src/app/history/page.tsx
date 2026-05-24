'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeScore } from '@/lib/supabase/normalize';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, ScoreBadge } from '@/components/ui/Badge';
import { QuestionCategory } from '@/types';

interface SessionRow {
  id: string;
  profile_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  profile_title: string;
  answer_count: number;
  avg_score: number | null;
  answers: Array<{
    id: string;
    answer_text: string;
    question_text: string;
    category: QuestionCategory;
    score: number | null;
  }>;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const supabase = createClient();

      const { data, error: err } = await supabase
        .from('practice_sessions')
        .select(`
          *,
          profile:practice_profiles(title),
          answers:practice_answers(
            id,
            answer_text,
            question:interview_questions(question_text, category),
            score:answer_scores(overall_score)
          )
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const rows: SessionRow[] = (data ?? []).map((s: {
        id: string;
        profile_id: string;
        status: string;
        created_at: string;
        completed_at: string | null;
        profile?: { title?: string };
        answers?: Array<{
          id: string;
          answer_text: string;
          question?: { question_text?: string; category?: QuestionCategory };
          score?: unknown;
        }>;
      }) => {
        const answers = (s.answers ?? []).map((a) => {
          const scoreVal = normalizeScore(a.score as Parameters<typeof normalizeScore>[0])?.overall_score;
          return {
            id: a.id,
            answer_text: a.answer_text,
            question_text: a.question?.question_text ?? '',
            category: (a.question?.category ?? 'behavioral') as QuestionCategory,
            score: scoreVal ?? null,
          };
        });

        const scores = answers.map(a => a.score).filter((s): s is number => s !== null);
        const avg_score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

        return {
          id: s.id,
          profile_id: s.profile_id,
          status: s.status,
          created_at: s.created_at,
          completed_at: s.completed_at,
          profile_title: s.profile?.title ?? 'Unknown Profile',
          answer_count: answers.length,
          avg_score,
          answers,
        };
      });

      setSessions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
          <p className="text-sm text-gray-500 mt-1">{sessions.length} sessions total</p>
        </div>
        <Link href="/profile">
          <Button>+ New Session</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-12 space-y-3">
            <p className="text-gray-400">No sessions yet.</p>
            <Link href="/profile">
              <Button>Start your first practice session →</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <Card key={session.id} padding="md">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(expanded === session.id ? null : session.id)}
              >
                <div>
                  <p className="font-medium text-gray-900">{session.profile_title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(session.created_at).toLocaleString()} ·{' '}
                    {session.answer_count} answer{session.answer_count !== 1 ? 's' : ''} ·{' '}
                    <span className={session.status === 'completed' ? 'text-green-600' : 'text-orange-500'}>
                      {session.status}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {session.avg_score !== null && <ScoreBadge score={session.avg_score} />}
                  <Link
                    href={`/interview/${session.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" variant="secondary">Continue</Button>
                  </Link>
                  <span className="text-gray-400 text-xs">{expanded === session.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === session.id && session.answers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {session.answers.map((answer) => (
                    <div key={answer.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CategoryBadge category={answer.category} />
                        {answer.score !== null && <ScoreBadge score={answer.score} />}
                      </div>
                      <p className="text-xs font-medium text-gray-700 mb-1">{answer.question_text}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{answer.answer_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
