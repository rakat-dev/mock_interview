import { QuestionCategory } from '@/types';

// ── GPT: Question Generation ──────────────────────────────────────────────────

export function buildQuestionGenerationPrompt(
  resumeText: string,
  jobDescription: string,
  companyNotes?: string
): string {
  return `You are a senior technical recruiter and interview coach with 15+ years of experience placing software engineers at top companies. You have deep knowledge of how interviews are conducted at different stages.

Your job is to analyze the candidate's resume and the job description, then generate the 20 most likely interview questions they will face, ranked by likelihood.

RESUME:
---
${resumeText}
---

JOB DESCRIPTION:
---
${jobDescription}
---

${companyNotes ? `ADDITIONAL CONTEXT:\n---\n${companyNotes}\n---\n` : ''}

Generate exactly 20 interview questions. For each question, think carefully about:
1. What gaps or risks exist between the resume and JD (these will definitely be asked)
2. What specific projects/experience on the resume will be probed
3. What technical skills the JD requires that need validation
4. What behavioral patterns the company cares about based on the JD language
5. What system design challenges the role likely involves

Return ONLY a valid JSON array with exactly this structure (no markdown, no code blocks, just raw JSON):
[
  {
    "rank": 1,
    "question_text": "The exact question as an interviewer would ask it",
    "category": "one of: recruiter | behavioral | hiring_manager | technical | project_deep_dive | system_design | gap_risk",
    "why_likely": "2-3 sentences explaining why this question is almost certain to come up given this specific resume + JD combo",
    "what_tested": "What the interviewer is actually evaluating — be specific, not generic",
    "answer_structure": "A concrete framework or structure for answering this question effectively. Include what elements must be covered. Do NOT write a sample answer."
  }
]

Category definitions:
- recruiter: Questions a recruiter screen would ask (background, motivation, logistics, comp)
- behavioral: STAR-format questions about past behavior
- hiring_manager: Questions a HM cares about (team fit, ownership, past impact, priorities)
- technical: Technical knowledge validation questions
- project_deep_dive: Deep questions about a specific project on the resume
- system_design: System design / architecture questions
- gap_risk: Questions targeting gaps, mismatches, or risks between resume and JD

Rank 1 = most likely to be asked. Be ruthlessly realistic about what interviewers actually ask.`;
}

// ── GPT: Answer Scoring ───────────────────────────────────────────────────────
// Returns numeric scores and qualitative feedback only.
// Does NOT return an improved answer — that is handled by Claude humanization.

export function buildScoringPrompt(
  question: string,
  category: QuestionCategory,
  answer: string,
  jobDescription: string,
  resumeText: string
): string {
  return `You are a strict but fair interview coach. A candidate just answered an interview question. Your job is to give honest, actionable feedback — not to be nice, not to inflate scores.

JOB DESCRIPTION (for alignment context):
---
${jobDescription}
---

CANDIDATE RESUME (for context):
---
${resumeText}
---

INTERVIEW QUESTION (Category: ${category.replace(/_/g, ' ')}):
"${question}"

CANDIDATE'S ANSWER:
---
${answer}
---

Score this answer honestly on each dimension from 1 to 10. Then provide detailed feedback.

SCORING GUIDE:
- star_alignment: Does it follow Situation → Task → Action → Result structure? (1=no structure, 10=perfect STAR)
- clarity: Is it easy to follow? Clear transitions? No rambling? (1=confusing, 10=crystal clear)
- tone: Professional but human? Not stiff, not overly casual? (1=inappropriate, 10=perfect tone)
- confidence: Does it sound like someone who owns their work? (1=apologetic/hedging, 10=confident ownership)
- technical_depth: Appropriate technical detail for the question type and audience? (1=too shallow/too deep, 10=perfectly calibrated)
- realism: Does it sound like a real experience, not a made-up textbook answer? (1=sounds fake, 10=completely believable)
- answer_length: Appropriate length for the question? (1=way too short or way too long, 10=perfect length)
- jd_alignment: Does the answer demonstrate skills/experience the JD specifically asks for? (1=not aligned, 10=directly addresses JD requirements)
- business_impact: Does it communicate business/user impact, not just technical work? (1=no impact mentioned, 10=clear business value)
- ai_robotic_phrasing: Does it sound like a real human talking? LOWER score = more robotic/AI-sounding. (1=sounds like ChatGPT wrote it, 10=sounds like a real person talking)

Common failure modes to penalize:
- "I leveraged synergies to drive outcomes" → very low ai_robotic_phrasing score
- No result/outcome mentioned → low star_alignment, low business_impact
- "We did X" with no personal ownership → low confidence
- Listing technologies without explaining why → low technical_depth
- Answer that's 3 sentences for a deep question → low answer_length
- Answer that's 800 words for a simple recruiter question → low answer_length
- Generic answer that could apply to any job → low jd_alignment

Return ONLY a valid JSON object (no markdown, no code blocks) with exactly this structure:
{
  "star_alignment": <1-10>,
  "clarity": <1-10>,
  "tone": <1-10>,
  "confidence": <1-10>,
  "technical_depth": <1-10>,
  "realism": <1-10>,
  "answer_length": <1-10>,
  "jd_alignment": <1-10>,
  "business_impact": <1-10>,
  "ai_robotic_phrasing": <1-10>,
  "overall_score": <1.0-10.0, one decimal place, weighted average>,
  "what_was_good": "2-4 specific things done well in this specific answer",
  "what_was_weak": "2-4 specific problems with this answer. Be honest. Don't sugarcoat.",
  "improvement_suggestions": "3-5 concrete, actionable suggestions. Quote the problematic parts where relevant.",
  "likely_followup": "One specific follow-up question an interviewer would ask after hearing this answer"
}`;
}

// ── Claude: Answer Humanization ───────────────────────────────────────────────
// Claude rewrites the answer to sound like a real senior engineer.
// STRICT CONSTRAINT: Claude may only improve wording, flow, tone, and structure.
// It must NOT invent new facts, metrics, tools, companies, or achievements.

export function buildHumanizeAnswerPrompt(
  question: string,
  category: QuestionCategory,
  originalAnswer: string,
  gptFeedback: { what_was_weak: string; improvement_suggestions: string },
  resumeText: string,
  jobDescription: string
): string {
  return `You are editing a job interview answer. Your sole job is to make it sound more natural and human — like a senior software engineer talking in a real interview, not reading a prepared script.

INTERVIEW QUESTION (Category: ${category.replace(/_/g, ' ')}):
"${question}"

ORIGINAL ANSWER:
---
${originalAnswer}
---

WHAT GPT SCORED AS WEAK IN THIS ANSWER:
${gptFeedback.what_was_weak}

GPT'S IMPROVEMENT SUGGESTIONS:
${gptFeedback.improvement_suggestions}

CANDIDATE RESUME (for factual context only):
---
${resumeText}
---

JOB DESCRIPTION (for alignment context only):
---
${jobDescription}
---

REWRITE RULES — READ CAREFULLY:
1. You may ONLY use facts, numbers, technologies, companies, and achievements that appear in the original answer or resume. Do NOT invent or add anything new.
2. Use contractions naturally (I've, we'd, didn't, wasn't).
3. Write how someone actually talks in a 1-on-1 conversation, not how they'd write a LinkedIn post.
4. Avoid corporate/consultant language: "leveraged", "synergies", "impactful", "spearheaded", "drove outcomes".
5. Keep the answer under 250 words.
6. Preserve the candidate's authentic voice — do not over-polish or make it sound too perfect.
7. Address the specific weaknesses flagged by GPT, but only using existing facts.
8. Do not make the answer sound rehearsed or AI-generated.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "humanized_answer": "The rewritten answer exactly as the candidate should say it",
  "humanization_notes": "1-2 sentences describing what you changed and why — e.g. 'Removed corporate phrasing, added the missed outcome, tightened the story.'"
}`;
}

// ── GPT: Prep Sheet ───────────────────────────────────────────────────────────

export function buildPrepSheetPrompt(
  resumeText: string,
  jobDescription: string,
  sessionSummary: string
): string {
  return `You are an experienced interview coach preparing a candidate for their final interview. Based on their practice session data, create a focused prep sheet.

RESUME:
---
${resumeText}
---

JOB DESCRIPTION:
---
${jobDescription}
---

PRACTICE SESSION SUMMARY:
---
${sessionSummary}
---

Create a prep sheet that will help this candidate walk into their interview confident and prepared.

Return ONLY a valid JSON object (no markdown, no code blocks) with exactly this structure:
{
  "weak_areas": ["specific weakness 1", "specific weakness 2", ...],
  "risky_question_ids": ["question text 1", "question text 2", ...],
  "final_reminders": [
    "Specific, practical reminder 1 (not generic advice)",
    "Specific, practical reminder 2",
    ...
  ],
  "overall_readiness": "An honest 3-4 sentence assessment of where this candidate stands. What's their biggest risk? What's their strongest suit? What should they focus on in the next 24 hours?"
}

Make the final_reminders specific to THIS candidate and THIS job. Not generic interview advice.
Be honest in overall_readiness — if they're not ready, say so specifically.`;
}
