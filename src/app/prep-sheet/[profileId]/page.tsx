'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, ScoreBadge } from '@/components/ui/Badge';
import { InterviewQuestion } from '@/types';

interface PrepSheetData {
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

export default function PrepSheetPage() {
  const params = useParams();
  const profileId = params.profileId as string;

  const [data, setData] = useState<PrepSheetData | null>(null);
  const [profileTitle, setProfileTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [profileId]);

  async function loadInitialData() {
    // Just load profile title
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('practice_profiles')
      .select('title')
      .eq('id', profileId)
      .single();
    setProfileTitle(profile?.title ?? 'Practice Profile');
    setLoading(false);
  }

  async function generatePrepSheet() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/prep-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to generate prep sheet.');
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setGenerating(false);
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Final Prep Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">{profileTitle}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/questions/${profileId}`}>
            <Button variant="secondary" size="sm">View Questions</Button>
          </Link>
          <Button onClick={generatePrepSheet} loading={generating}>
            {data ? 'Regenerate' : 'Generate Prep Sheet'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {!data && !generating && (
        <Card>
          <div className="text-center py-12 space-y-4">
            <div className="text-4xl">📄</div>
            <h2 className="font-semibold text-gray-900">Generate Your Prep Sheet</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Based on your practice sessions, we&apos;ll create a focused prep sheet with your strongest answers,
              weak areas to fix, risky questions, and last-minute reminders.
            </p>
            <p className="text-xs text-gray-400">
              For best results, complete at least one mock interview session first.
            </p>
            <Button onClick={generatePrepSheet} size="lg">Generate Prep Sheet →</Button>
          </div>
        </Card>
      )}

      {generating && (
        <Card>
          <div className="text-center py-12 space-y-3">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-gray-500">Analyzing your sessions and generating prep sheet...</p>
            <p className="text-xs text-gray-400">This takes ~30 seconds</p>
          </div>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          {/* Overall readiness */}
          <Card className="border-indigo-200 bg-indigo-50">
            <h2 className="font-semibold text-indigo-900 mb-2">Overall Readiness Assessment</h2>
            <p className="text-sm text-indigo-800 leading-relaxed">{data.overall_readiness}</p>
          </Card>

          {/* Final reminders */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Last-Minute Reminders</h2>
            <ul className="space-y-2">
              {data.final_reminders.map((reminder, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="flex-shrink-0 text-indigo-500 font-bold">→</span>
                  {reminder}
                </li>
              ))}
            </ul>
          </Card>

          {/* Weak areas */}
          {data.weak_areas.length > 0 && (
            <Card className="border-red-200">
              <h2 className="font-semibold text-gray-900 mb-3">Weak Areas to Fix</h2>
              <ul className="space-y-2">
                {data.weak_areas.map((area, i) => (
                  <li key={i} className="flex gap-2 text-sm text-red-700">
                    <span className="flex-shrink-0 text-red-500">⚠</span>
                    {area}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Risky questions */}
          {data.risky_questions.length > 0 && (
            <Card className="border-yellow-200">
              <h2 className="font-semibold text-gray-900 mb-3">Risky Questions — Be Prepared</h2>
              <div className="space-y-3">
                {data.risky_questions.map((q) => (
                  <div key={q.id} className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryBadge category={q.category} />
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{q.question_text}</p>
                    <p className="text-xs text-gray-500">{q.why_likely}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top questions with best answers */}
          {data.top_questions.length > 0 && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-3">Your Best Answers</h2>
              <div className="space-y-4">
                {data.top_questions.map(({ question, best_answer, score }, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryBadge category={(question as InterviewQuestion).category} />
                      {score > 0 && <ScoreBadge score={score} />}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-2">{(question as InterviewQuestion).question_text}</p>
                    {best_answer && (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your best answer</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{best_answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Print hint */}
          <div className="text-center pb-4">
            <button
              onClick={() => window.print()}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Print this prep sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
