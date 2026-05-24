'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, ScoreBadge } from '@/components/ui/Badge';
import { QuestionCategory } from '@/types';

interface ProfileSummary {
  id: string;
  title: string;
  created_at: string;
  sessionCount: number;
  avgScore: number | null;
  lastActivity: string;
}

interface CategoryStat {
  category: QuestionCategory;
  avgScore: number;
  count: number;
}

const readinessCategories: { label: string; categories: QuestionCategory[] }[] = [
  { label: 'Recruiter Screen', categories: ['recruiter'] },
  { label: 'Hiring Manager', categories: ['hiring_manager'] },
  { label: 'Behavioral', categories: ['behavioral'] },
  { label: 'Technical', categories: ['technical'] },
  { label: 'Project Deep Dive', categories: ['project_deep_dive'] },
  { label: 'System Design', categories: ['system_design'] },
];

function ReadinessBar({ label, score }: { label: string; score: number | null }) {
  const pct = score !== null ? Math.round(score * 10) : 0;
  const color =
    score === null ? 'bg-gray-200' :
    score >= 8 ? 'bg-green-500' :
    score >= 6 ? 'bg-yellow-400' :
    score >= 4 ? 'bg-orange-400' : 'bg-red-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-semibold text-gray-700">
          {score !== null ? `${score.toFixed(1)}/10` : 'No data'}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [avgOverall, setAvgOverall] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const supabase = createClient();

      // Get all profiles with session counts
      const { data: profilesData } = await supabase
        .from('practice_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Get all sessions
      const { data: sessionsData } = await supabase
        .from('practice_sessions')
        .select('*');

      // Get all answers with scores and questions
      const { data: answersData } = await supabase
        .from('practice_answers')
        .select(`
          *,
          score:answer_scores(*),
          question:interview_questions(category)
        `);

      setTotalSessions(sessionsData?.length ?? 0);
      setTotalAnswers(answersData?.length ?? 0);

      // Compute scores
      const scored = (answersData ?? []).filter((a: { score?: { overall_score?: number } }) => a.score);
      const overallScores = (scored.map((a: { score?: { overall_score?: number } }) =>
        Array.isArray(a.score) ? a.score[0]?.overall_score : (a.score as { overall_score?: number })?.overall_score
      ).filter((s: unknown) => s !== undefined)) as number[];

      if (overallScores.length > 0) {
        setAvgOverall(overallScores.reduce((a, b) => a + b, 0) / overallScores.length);
      }

      // Category stats
      const catMap = new Map<string, number[]>();
      for (const a of scored as Array<{ question?: { category?: string }; score?: { overall_score?: number } | Array<{ overall_score?: number }> }>) {
        const cat = a.question?.category;
        if (!cat) continue;
        const scoreVal = Array.isArray(a.score)
          ? a.score[0]?.overall_score
          : (a.score as { overall_score?: number })?.overall_score;
        if (scoreVal === undefined) continue;
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(scoreVal);
      }

      const stats: CategoryStat[] = Array.from(catMap.entries()).map(([cat, scores]) => ({
        category: cat as QuestionCategory,
        avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length,
      })).sort((a, b) => b.avgScore - a.avgScore);

      setCategoryStats(stats);

      // Profile summaries
      const sessionsByProfile = new Map<string, typeof sessionsData>();
      for (const s of (sessionsData ?? [])) {
        if (!sessionsByProfile.has(s.profile_id)) sessionsByProfile.set(s.profile_id, []);
        sessionsByProfile.get(s.profile_id)!.push(s);
      }

      const answersByProfile = new Map<string, typeof answersData>();
      for (const a of (answersData ?? [])) {
        for (const s of (sessionsData ?? [])) {
          if (s.id === a.session_id) {
            if (!answersByProfile.has(s.profile_id)) answersByProfile.set(s.profile_id, []);
            answersByProfile.get(s.profile_id)!.push(a);
            break;
          }
        }
      }

      const profileSummaries: ProfileSummary[] = (profilesData ?? []).map((p: { id: string; title: string; created_at: string }) => {
        const sessions = sessionsByProfile.get(p.id) ?? [];
        const pAnswers = (answersByProfile.get(p.id) ?? []) as Array<{ score?: { overall_score?: number } | Array<{ overall_score?: number }> }>;
        const scoredAnswers = pAnswers.filter(a => a.score);
        const pScores = scoredAnswers.map(a =>
          Array.isArray(a.score) ? a.score[0]?.overall_score : (a.score as { overall_score?: number })?.overall_score
        ).filter((s): s is number => s !== undefined);

        return {
          id: p.id,
          title: p.title,
          created_at: p.created_at,
          sessionCount: sessions.length,
          avgScore: pScores.length > 0 ? pScores.reduce((a, b) => a + b, 0) / pScores.length : null,
          lastActivity: sessions.sort((a: { created_at: string }, b: { created_at: string }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]?.created_at ?? p.created_at,
        };
      });

      setProfiles(profileSummaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
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

  const readinessScores = readinessCategories.map(({ label, categories }) => {
    const matching = categoryStats.filter(s => categories.includes(s.category));
    const avg = matching.length > 0
      ? matching.reduce((sum, s) => sum + s.avgScore, 0) / matching.length
      : null;
    return { label, score: avg };
  });

  const weakest = categoryStats.slice(-3);
  const strongest = categoryStats.slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your interview readiness at a glance</p>
        </div>
        <Link href="/profile">
          <Button>+ New Profile</Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: totalSessions },
          { label: 'Questions Answered', value: totalAnswers },
          { label: 'Avg Overall Score', value: avgOverall !== null ? `${avgOverall.toFixed(1)}/10` : '—' },
        ].map((stat) => (
          <Card key={stat.label} padding="md" className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      {totalAnswers === 0 ? (
        <Card>
          <div className="text-center py-8 space-y-3">
            <p className="text-gray-500">No practice sessions yet.</p>
            <Link href="/profile">
              <Button>Create your first profile →</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Readiness by interview type */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Readiness by Interview Type</h2>
            <div className="space-y-4">
              {readinessScores.map(({ label, score }) => (
                <ReadinessBar key={label} label={label} score={score} />
              ))}
            </div>
          </Card>

          {/* Category scores */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Score by Category</h2>
            {categoryStats.length === 0 ? (
              <p className="text-sm text-gray-400">No scored answers yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((stat) => (
                  <div key={stat.category} className="flex items-center gap-3">
                    <CategoryBadge category={stat.category} />
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stat.avgScore >= 8 ? 'bg-green-500' : stat.avgScore >= 6 ? 'bg-yellow-400' : 'bg-red-500'}`}
                        style={{ width: `${stat.avgScore * 10}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {stat.avgScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">({stat.count})</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Strongest / Weakest */}
          {categoryStats.length > 0 && (
            <>
              <Card>
                <h2 className="font-semibold text-gray-900 mb-3">Strongest Areas</h2>
                <div className="space-y-2">
                  {strongest.map((s) => (
                    <div key={s.category} className="flex items-center justify-between">
                      <CategoryBadge category={s.category} />
                      <ScoreBadge score={s.avgScore} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="font-semibold text-gray-900 mb-3">Weakest Areas — Focus Here</h2>
                <div className="space-y-2">
                  {weakest.map((s) => (
                    <div key={s.category} className="flex items-center justify-between">
                      <CategoryBadge category={s.category} />
                      <ScoreBadge score={s.avgScore} />
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Profiles */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Practice Profiles</h2>
        {profiles.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-400 text-center py-4">No profiles yet. <Link href="/profile" className="text-indigo-600 hover:underline">Create one →</Link></p>
          </Card>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <Card key={p.id} padding="sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{p.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.sessionCount} session{p.sessionCount !== 1 ? 's' : ''} ·{' '}
                      Last active {new Date(p.lastActivity).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.avgScore !== null && <ScoreBadge score={p.avgScore} />}
                    <Link href={`/questions/${p.id}`}>
                      <Button size="sm" variant="secondary">View Questions</Button>
                    </Link>
                    <Link href={`/prep-sheet/${p.id}`}>
                      <Button size="sm">Prep Sheet</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
