import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreAnswer } from '@/lib/ai/openai';
import { humanizeAnswer } from '@/lib/ai/anthropic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { answer_id } = body;

    if (!answer_id) {
      return NextResponse.json({ error: 'answer_id is required.' }, { status: 400 });
    }

    const supabase = await createClient();

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

    // Step 1: GPT scores the answer
    const { score: scoreData, model: gptModel } = await scoreAnswer(
      question.question_text,
      question.category,
      answer.answer_text,
      profile.job_description,
      profile.resume_text
    );

    // Step 2: Claude humanizes the answer using GPT feedback as context.
    // If Claude fails we still save the GPT score — do not block the whole request.
    let humanizedAnswer: string | null = null;
    let humanizationNotes: string | null = null;
    let claudeModel: string | null = null;
    let humanizationWarning: string | undefined;

    try {
      const { result, model } = await humanizeAnswer(
        question.question_text,
        question.category,
        answer.answer_text,
        {
          what_was_weak: scoreData.what_was_weak,
          improvement_suggestions: scoreData.improvement_suggestions,
        },
        profile.resume_text,
        profile.job_description
      );
      humanizedAnswer = result.humanized_answer;
      humanizationNotes = result.humanization_notes;
      claudeModel = model;
    } catch (humanizeErr) {
      humanizationWarning = humanizeErr instanceof Error
        ? humanizeErr.message
        : 'Claude humanization failed.';
      console.warn('Humanization failed (score saved anyway):', humanizationWarning);
    }

    // Step 3: Delete any existing score row and insert fresh
    await supabase.from('answer_scores').delete().eq('answer_id', answer_id);

    const { data: score, error: scoreError } = await supabase
      .from('answer_scores')
      .insert({
        answer_id,
        // GPT numeric scores
        ...scoreData,
        // improved_answer not populated for new rows — humanized_answer replaces it
        improved_answer: null,
        // Provenance
        scoring_provider: 'openai',
        humanizer_provider: 'anthropic',
        gpt_model: gptModel,
        claude_model: claudeModel,
        // Claude output (null if humanization failed)
        humanized_answer: humanizedAnswer,
        humanization_notes: humanizationNotes,
      })
      .select()
      .single();

    if (scoreError) {
      console.error('Score insert error:', scoreError);
      return NextResponse.json({ error: 'Failed to save score.' }, { status: 500 });
    }

    return NextResponse.json({
      score,
      ...(humanizationWarning ? { humanization_warning: humanizationWarning } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.';
    console.error('score-answer error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
