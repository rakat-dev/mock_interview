# Interview Readiness Engine — Setup Guide

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Where to get these:
- **Supabase URL + Anon Key**: Go to your Supabase project → Settings → API
- **Anthropic API Key**: https://console.anthropic.com → API Keys

---

## Supabase Database Setup

Run this SQL in your Supabase SQL Editor (Project → SQL Editor → New Query):

```sql
-- Paste the full contents of supabase/migrations/001_initial_schema.sql here
```

Or use the Supabase CLI:
```bash
supabase db push
```

---

## Tables Created

| Table | Purpose |
|-------|---------|
| `practice_profiles` | Resume + JD + notes saved by user |
| `interview_questions` | 20 AI-generated questions per profile |
| `practice_sessions` | One session = one run through questions |
| `practice_answers` | User's typed answers per question |
| `answer_scores` | AI scoring (10 dimensions) per answer |

---

## Running Locally

```bash
npm install
npm run dev
```

App runs at http://localhost:3000

---

## How to Use

1. **Go to /profile** — paste your resume, job description, optional notes
2. **Questions generate automatically** — 20 ranked questions with categories
3. **Click "Start Mock Interview"** — answer questions one at a time
4. **Submit each answer** — AI scores it across 10 dimensions
5. **See score card** — feedback, improved answer, likely follow-up
6. **Check /dashboard** — progress tracking, readiness by interview type
7. **Generate /prep-sheet** — final prep sheet before your interview

---

## Test Checklist

- [ ] Create a practice profile with resume + JD
- [ ] Verify 20 questions are generated and ranked
- [ ] Click into questions to see why_likely, what_tested, answer_structure
- [ ] Start a mock interview session
- [ ] Type and submit an answer
- [ ] Verify AI scoring appears with all 10 dimensions
- [ ] Navigate to next question and submit another answer
- [ ] Check navigation dots update with color-coded scores
- [ ] Check /dashboard shows stats and category breakdown
- [ ] Check /history shows sessions with answers
- [ ] Generate a prep sheet — verify it includes reminders, weak areas, risky questions
- [ ] Test error handling: try submitting empty answer (should be disabled)
- [ ] Test with ANTHROPIC_API_KEY missing — verify error message

---

## Files Changed

```
src/
  types/index.ts                          — All TypeScript interfaces
  lib/
    supabase/client.ts                    — Browser Supabase client
    supabase/server.ts                    — Server Supabase client
    ai/
      anthropic.ts                        — AI API calls (generate, score, prep)
      prompts.ts                          — All AI prompt templates
  components/
    Navbar.tsx                            — Navigation bar
    ScoreCard.tsx                         — Answer score display component
    ui/
      Button.tsx                          — Reusable button
      Card.tsx                            — Reusable card
      Badge.tsx                           — Category + score badges
  app/
    layout.tsx                            — Root layout with navbar
    page.tsx                              — Landing page
    globals.css                           — Global styles
    profile/page.tsx                      — Create practice profile
    questions/[profileId]/page.tsx        — View + regenerate questions
    interview/[sessionId]/page.tsx        — Mock interview mode
    dashboard/page.tsx                    — Progress dashboard
    history/page.tsx                      — Session history
    prep-sheet/[profileId]/page.tsx       — Final prep sheet
    api/
      generate-questions/route.ts         — POST: generate questions from profile
      score-answer/route.ts               — POST: score a submitted answer
      prep-sheet/route.ts                 — POST: generate prep sheet

supabase/
  migrations/001_initial_schema.sql       — Full DB schema
```
