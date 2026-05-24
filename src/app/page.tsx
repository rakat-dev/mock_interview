import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function Home() {
  const features = [
    { icon: '📋', title: 'Resume + JD Analysis', desc: 'Paste your resume and target job description to generate personalized questions.' },
    { icon: '🎯', title: '20 Ranked Questions', desc: 'AI generates the 20 most likely questions with category, reasoning, and answer frameworks.' },
    { icon: '💬', title: 'Mock Interview Mode', desc: 'Answer questions one at a time, review previous answers, and navigate at your pace.' },
    { icon: '⚡', title: 'AI Scoring (10 Dimensions)', desc: 'STAR alignment, clarity, tone, JD fit, business impact, and more — with an improved answer.' },
    { icon: '📈', title: 'Progress Dashboard', desc: 'Track scores over sessions, spot weak categories, and see readiness by interview type.' },
    { icon: '📄', title: 'Final Prep Sheet', desc: 'Get a curated prep sheet with top questions, risky areas, and last-minute reminders.' },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
          Interview Readiness Engine
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Paste your resume and a job description. Get 20 personalized interview questions, practice your answers, and get scored like a strict coach — not a cheerleader.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/profile">
            <Button size="lg">Get Started →</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary">View Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} padding="md">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
        <ol className="space-y-3">
          {[
            'Create a practice profile — paste your resume, job description, and any notes about the company.',
            'Generate 20 personalized questions ranked by likelihood, with categories and answer structures.',
            'Start a mock interview session — answer questions one at a time.',
            'Get AI scored on 10 dimensions with an improved answer and a likely follow-up question.',
            'Track your progress on the dashboard and generate a final prep sheet before the interview.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-gray-600">{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
