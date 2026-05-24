'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { InterviewQuestion, PracticeProfile } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge } from '@/components/ui/Badge';

export default function QuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;

  const [profile, setProfile] = useState<PracticeProfile | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [profileId]);

  async function loadData() {
    try {
      const supabase = createClient();
      const [profileRes, questionsRes] = await Promise.all([
        supabase.from('practice_profiles').select('*').eq('id', profileId).single(),
        supabase.from('interview_questions').select('*').eq('profile_id', profileId).order('rank'),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data);
      setQuestions(questionsRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setError('');
    setRegenerating(true);
    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate.');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate questions.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleStartSession() {
    setStartingSession(true);
    try {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({ profile_id: profileId, status: 'active' })
        .select()
        .single();

      if (sessionError) throw sessionError;
      router.push(`/interview/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session.');
      setStartingSession(false);
    }
  }

  const categoryGroups = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, InterviewQuestion[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-500">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.title ?? 'Interview Questions'}</h1>
          <p className="text-sm text-gray-500 mt-1">{questions.length} questions generated · Ranked by likelihood</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleRegenerate} loading={regenerating}>
            Regenerate
          </Button>
          <Button size="sm" onClick={handleStartSession} loading={startingSession}>
            Start Mock Interview →
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Category summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(categoryGroups).map(([cat, qs]) => (
          <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600">
            <CategoryBadge category={cat as InterviewQuestion['category']} />
            <span className="font-medium">{qs.length}</span>
          </span>
        ))}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((q) => (
          <Card key={q.id} padding="sm" className="cursor-pointer hover:border-indigo-200 transition-colors">
            <div onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                  {q.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CategoryBadge category={q.category} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{q.question_text}</p>
                </div>
                <span className="text-gray-400 text-xs">{expanded === q.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded === q.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 ml-10">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why you&apos;ll be asked this</p>
                  <p className="text-sm text-gray-700">{q.why_likely}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">What the interviewer is testing</p>
                  <p className="text-sm text-gray-700">{q.what_tested}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Suggested answer structure</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.answer_structure}</p>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-between items-center pt-2">
        <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">
          ← Create another profile
        </Link>
        <Button size="lg" onClick={handleStartSession} loading={startingSession}>
          Start Mock Interview →
        </Button>
      </div>
    </div>
  );
}
