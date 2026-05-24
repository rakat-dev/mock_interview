import { QuestionCategory } from '@/types';

const categoryColors: Record<QuestionCategory, string> = {
  recruiter: 'bg-blue-100 text-blue-700',
  behavioral: 'bg-purple-100 text-purple-700',
  hiring_manager: 'bg-orange-100 text-orange-700',
  technical: 'bg-green-100 text-green-700',
  project_deep_dive: 'bg-teal-100 text-teal-700',
  system_design: 'bg-red-100 text-red-700',
  gap_risk: 'bg-yellow-100 text-yellow-700',
};

const categoryLabels: Record<QuestionCategory, string> = {
  recruiter: 'Recruiter',
  behavioral: 'Behavioral',
  hiring_manager: 'Hiring Manager',
  technical: 'Technical',
  project_deep_dive: 'Project Deep Dive',
  system_design: 'System Design',
  gap_risk: 'Gap / Risk',
};

export function CategoryBadge({ category }: { category: QuestionCategory }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[category]}`}>
      {categoryLabels[category]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8 ? 'bg-green-100 text-green-700' :
    score >= 6 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score.toFixed(1)}/10
    </span>
  );
}
