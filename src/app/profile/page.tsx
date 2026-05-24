'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!resume.trim()) { setError('Resume text is required.'); return; }
    if (!jd.trim()) { setError('Job description is required.'); return; }

    try {
      setSaving(true);
      const supabase = createClient();

      const { data: profile, error: profileError } = await supabase
        .from('practice_profiles')
        .insert({
          title: title.trim() || 'Untitled Profile',
          resume_text: resume.trim(),
          job_description: jd.trim(),
          company_notes: notes.trim() || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      setSaving(false);
      setGenerating(true);

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate questions.');
      }

      router.push(`/questions/${profile.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(msg);
      setSaving(false);
      setGenerating(false);
    }
  }

  const isLoading = saving || generating;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Practice Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste your resume and the job description. The more detail you provide, the more accurate your questions will be.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profile Title <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior SWE @ Stripe — June 2025"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resume <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Paste the full text of your resume. Include all sections — experience, skills, projects, education.</p>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={12}
            placeholder="Paste your full resume here..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{resume.length} characters</p>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Description <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">Paste the full job posting. Include requirements, responsibilities, and any other details.</p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={12}
            placeholder="Paste the full job description here..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{jd.length} characters</p>
        </Card>

        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company / Interview Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Add any context: company culture, interviewer name, round type, things you know about the team, concerns you have.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="e.g. This is a hiring manager round at a Series B fintech. They care a lot about ownership and cross-functional work. I'm worried about the system design round..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
          />
        </Card>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Generating 20 questions takes ~30–60 seconds.
          </p>
          <Button type="submit" size="lg" loading={isLoading}>
            {saving ? 'Saving profile...' : generating ? 'Generating questions...' : 'Save & Generate Questions →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
