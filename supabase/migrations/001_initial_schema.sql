-- Interview Readiness Engine Schema

create extension if not exists "uuid-ossp";

-- Practice Profiles: resume + JD + notes saved by user
create table if not exists practice_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id text,
  title text not null default 'Untitled Profile',
  resume_text text not null,
  job_description text not null,
  company_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Interview Questions generated from a profile
create table if not exists interview_questions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references practice_profiles(id) on delete cascade,
  rank integer not null,
  question_text text not null,
  category text not null check (category in (
    'recruiter', 'behavioral', 'hiring_manager', 'technical',
    'project_deep_dive', 'system_design', 'gap_risk'
  )),
  why_likely text not null,
  what_tested text not null,
  answer_structure text not null,
  created_at timestamptz not null default now()
);

-- Practice Sessions: one session = one run through questions
create table if not exists practice_sessions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references practice_profiles(id) on delete cascade,
  user_id text,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Practice Answers: one row per question answered in a session
create table if not exists practice_answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references practice_sessions(id) on delete cascade,
  question_id uuid not null references interview_questions(id) on delete cascade,
  answer_text text not null,
  created_at timestamptz not null default now()
);

-- Answer Scores: AI scoring for each answer
create table if not exists answer_scores (
  id uuid primary key default uuid_generate_v4(),
  answer_id uuid not null references practice_answers(id) on delete cascade,
  star_alignment integer not null check (star_alignment between 1 and 10),
  clarity integer not null check (clarity between 1 and 10),
  tone integer not null check (tone between 1 and 10),
  confidence integer not null check (confidence between 1 and 10),
  technical_depth integer not null check (technical_depth between 1 and 10),
  realism integer not null check (realism between 1 and 10),
  answer_length integer not null check (answer_length between 1 and 10),
  jd_alignment integer not null check (jd_alignment between 1 and 10),
  business_impact integer not null check (business_impact between 1 and 10),
  ai_robotic_phrasing integer not null check (ai_robotic_phrasing between 1 and 10),
  overall_score numeric(4,2) not null,
  what_was_good text not null,
  what_was_weak text not null,
  improvement_suggestions text not null,
  improved_answer text not null,
  likely_followup text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_interview_questions_profile_id on interview_questions(profile_id);
create index if not exists idx_practice_sessions_profile_id on practice_sessions(profile_id);
create index if not exists idx_practice_answers_session_id on practice_answers(session_id);
create index if not exists idx_answer_scores_answer_id on answer_scores(answer_id);
