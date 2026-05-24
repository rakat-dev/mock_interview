import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreAnswer } from '@/lib/ai/anthropic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answer_id } = body;

    if (!answer_id) {
      return NextResponse.json({ error: 'answer_id is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the answer with its question and profile
    const { data: answer, error: answerError } = await supabase
      .from('practice_answers')
      .select(`
        *,
        question:interview_questions(*,
          profile:practice_profiles(*)
        )
      `)
      .eq('id', answer_id)
      .single();

    if (answerError || !answer) {
      return NextResponse.json({ error: 'Answer not found.' }, { status: 404 });
    }

    const question = answer.question;
    const profile = question?.profile;

    if (!question || !profile) {
      return NextResponse.json({ error: 'Associated question or profile not found.' }, { status: 404 });
    }

    // Score the answer via AI
    const scoreData = await scoreAnswer(
      question.question_text,
      question.category,
      answer.answer_text,
      profile.job_description,
      profile.resume_text
    );

    // Delete any existing score for this answer
    await supabase.from('answer_scores').delete().eq('answer_id', answer_id);

    // Insert score
    const { data: score, error: scoreError } = await supabase
      .from('answer_scores')
      .insert({
        answer_id,
        ...scoreData,
      })
      .select()
      .single();

    if (scoreError) {
      console.error('Score insert error:', scoreError);
      return NextResponse.json({ error: 'Failed to save score.' }, { status: 500 });
    }

    return NextResponse.json({ score });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.';
    console.error('score-answer error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
