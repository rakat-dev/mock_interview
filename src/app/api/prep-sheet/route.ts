import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePrepSheet } from '@/lib/ai/anthropic';
import { normalizeScore } from '@/lib/supabase/normalize';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_id } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: profile } = await supabase
      .from('practice_profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    // Gather all sessions and answers for this profile
    const { data: sessions } = await supabase
      .from('practice_sessions')
      .select(`
        *,
        answers:practice_answers(
          *,
          score:answer_scores(*),
          question:interview_questions(*)
        )
      `)
      .eq('profile_id', profile_id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build a summary string
    const summary = (sessions ?? []).map((session) => {
      const answers = (session.answers ?? []).map((a: { question?: { question_text?: string; category?: string }; answer_text?: string; score?: unknown }) => {
        const q = a.question;
        const s = normalizeScore(a.score as Parameters<typeof normalizeScore>[0]);
        return `Q [${q?.category}]: ${q?.question_text}\nAnswer: ${a.answer_text}\nScore: ${s?.overall_score ?? 'unscored'}/10\nWeak: ${s?.what_was_weak ?? 'N/A'}`;
      }).join('\n\n');
      return `Session ${session.created_at}:\n${answers}`;
    }).join('\n\n---\n\n');

    const { data: allQuestions } = await supabase
      .from('interview_questions')
      .select('*')
      .eq('profile_id', profile_id)
      .order('rank');

    // Get best answers per question
    const { data: topAnswers } = await supabase
      .from('practice_answers')
      .select(`
        *,
        score:answer_scores(*),
        question:interview_questions(*)
      `)
      .in(
        'question_id',
        (allQuestions ?? []).map((q: { id: string }) => q.id)
      )
      .order('created_at', { ascending: false });

    const prepData = await generatePrepSheet(
      profile.resume_text,
      profile.job_description,
      summary || 'No practice sessions completed yet.'
    );

    // Build top questions from existing data
    const questionMap = new Map<string, { question: unknown; best_answer: string; score: number }>();
    for (const answer of (topAnswers ?? []) as Array<{ question_id?: string; question?: { rank?: number }; answer_text?: string; score?: unknown }>) {
      const qid = answer.question_id;
      const score = normalizeScore(answer.score as Parameters<typeof normalizeScore>[0])?.overall_score ?? 0;
      if (qid && (!questionMap.has(qid) || questionMap.get(qid)!.score < score)) {
        questionMap.set(qid, {
          question: answer.question,
          best_answer: answer.answer_text ?? '',
          score,
        });
      }
    }

    const topQuestions = Array.from(questionMap.values())
      .sort((a, b) => {
        const rankA = (a.question as { rank?: number })?.rank ?? 99;
        const rankB = (b.question as { rank?: number })?.rank ?? 99;
        return rankA - rankB;
      })
      .slice(0, 10);

    const riskyQuestions = (allQuestions ?? []).filter((q: { category: string }) => q.category === 'gap_risk').slice(0, 5);

    return NextResponse.json({
      top_questions: topQuestions,
      weak_areas: prepData.weak_areas,
      risky_questions: riskyQuestions,
      final_reminders: prepData.final_reminders,
      overall_readiness: prepData.overall_readiness,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.';
    console.error('prep-sheet error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
