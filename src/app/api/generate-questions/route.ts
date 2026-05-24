import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInterviewQuestions } from '@/lib/ai/anthropic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { profile_id } = body;

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id is required.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from('practice_profiles')
      .select('*')
      .eq('id', profile_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    // Only delete questions that have no associated answers.
    // Deleting questions with answers would cascade-null those answers and break
    // historical session data — survivors are left in place alongside the new set.
    const { data: existingQuestions } = await supabase
      .from('interview_questions')
      .select('id')
      .eq('profile_id', profile_id);

    if (existingQuestions && existingQuestions.length > 0) {
      const existingIds = existingQuestions.map((q: { id: string }) => q.id);

      const { data: answeredIds } = await supabase
        .from('practice_answers')
        .select('question_id')
        .in('question_id', existingIds);

      const answeredSet = new Set((answeredIds ?? []).map((a: { question_id: string }) => a.question_id));
      const safeToDelete = existingIds.filter((id: string) => !answeredSet.has(id));

      if (safeToDelete.length > 0) {
        await supabase.from('interview_questions').delete().in('id', safeToDelete);
      }
    }

    // Generate questions via AI
    const questions = await generateInterviewQuestions(
      profile.resume_text,
      profile.job_description,
      profile.company_notes ?? undefined
    );

    // Insert into DB
    const rows = questions.map((q) => ({
      profile_id,
      rank: q.rank,
      question_text: q.question_text,
      category: q.category,
      why_likely: q.why_likely,
      what_tested: q.what_tested,
      answer_structure: q.answer_structure,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('interview_questions')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save questions.' }, { status: 500 });
    }

    return NextResponse.json({ questions: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.';
    console.error('generate-questions error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
