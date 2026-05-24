'use client';

import { AnswerScore } from '@/types';
import { Card } from './ui/Card';

interface ScoreCardProps {
  score: AnswerScore;
  humanizationWarning?: string;
}

const scoreFields = [
  { key: 'star_alignment', label: 'STAR Alignment', description: 'Situation → Task → Action → Result structure' },
  { key: 'clarity', label: 'Clarity', description: 'Easy to follow, no rambling' },
  { key: 'tone', label: 'Tone', description: 'Professional but human' },
  { key: 'confidence', label: 'Confidence', description: 'Ownership of your work' },
  { key: 'technical_depth', label: 'Technical Depth', description: 'Right level of detail for the audience' },
  { key: 'realism', label: 'Realism', description: 'Sounds like a real experience' },
  { key: 'answer_length', label: 'Answer Length', description: 'Appropriate length for the question' },
  { key: 'jd_alignment', label: 'JD Alignment', description: 'Addresses what the job posting requires' },
  { key: 'business_impact', label: 'Business Impact', description: 'Communicates value beyond just technical work' },
  { key: 'ai_robotic_phrasing', label: 'Human-Sounding', description: 'Sounds like a real person talking' },
] as const;

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 8 ? 'bg-green-500' :
    value >= 6 ? 'bg-yellow-400' :
    value >= 4 ? 'bg-orange-400' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}

export function ScoreCard({ score, humanizationWarning }: ScoreCardProps) {
  // Prefer Claude humanized version; fall back to legacy improved_answer for old rows
  const rewrittenAnswer = score.humanized_answer ?? score.improved_answer ?? null;
  const isHumanized = !!score.humanized_answer;

  return (
    <div className="space-y-6">
      {/* Overall score — scored by GPT */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p className="text-sm text-gray-500">
            Overall Score
            {score.gpt_model && (
              <span className="ml-2 text-xs text-gray-400">scored by GPT · {score.gpt_model}</span>
            )}
          </p>
          <p className="text-4xl font-bold text-gray-900">
            {score.overall_score.toFixed(1)}
            <span className="text-xl text-gray-400">/10</span>
          </p>
        </div>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg ${
          score.overall_score >= 8 ? 'bg-green-500' :
          score.overall_score >= 6 ? 'bg-yellow-400' :
          score.overall_score >= 4 ? 'bg-orange-400' : 'bg-red-500'
        }`}>
          {score.overall_score >= 8 ? '★' : score.overall_score >= 6 ? '○' : '△'}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-3">
        {scoreFields.map(({ key, label, description }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <p className="text-xs text-gray-400">{description}</p>
              </div>
            </div>
            <ScoreBar value={score[key]} />
          </div>
        ))}
      </div>

      {/* GPT qualitative feedback */}
      <div className="space-y-4">
        <Card padding="sm" className="border-green-200 bg-green-50">
          <p className="text-sm font-semibold text-green-800 mb-1">What worked</p>
          <p className="text-sm text-green-700 whitespace-pre-wrap">{score.what_was_good}</p>
        </Card>

        <Card padding="sm" className="border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-800 mb-1">What was weak</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{score.what_was_weak}</p>
        </Card>

        <Card padding="sm" className="border-blue-200 bg-blue-50">
          <p className="text-sm font-semibold text-blue-800 mb-1">Improvement suggestions</p>
          <p className="text-sm text-blue-700 whitespace-pre-wrap">{score.improvement_suggestions}</p>
        </Card>

        {/* Claude humanized version */}
        {rewrittenAnswer && (
          <Card padding="sm" className="border-violet-200 bg-violet-50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-violet-800">
                {isHumanized ? 'Claude humanized version' : 'Improved version'}
              </p>
              {score.claude_model && (
                <span className="text-xs text-violet-400">{score.claude_model}</span>
              )}
            </div>
            <p className="text-sm text-violet-700 italic whitespace-pre-wrap">
              &ldquo;{rewrittenAnswer}&rdquo;
            </p>
            {isHumanized && score.humanization_notes && (
              <p className="text-xs text-violet-500 mt-2 not-italic">
                {score.humanization_notes}
              </p>
            )}
            <p className="text-xs text-violet-400 mt-2 not-italic">
              Verify all facts before memorizing — Claude only rewrites tone and flow using your original answer.
            </p>
          </Card>
        )}

        {/* Humanization failed warning */}
        {humanizationWarning && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
            Claude humanization unavailable: {humanizationWarning}
          </div>
        )}

        <Card padding="sm" className="border-gray-200 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-1">Likely follow-up question</p>
          <p className="text-sm text-gray-600 italic">&ldquo;{score.likely_followup}&rdquo;</p>
        </Card>
      </div>
    </div>
  );
}
