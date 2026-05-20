export const PIPELINE_STAGES = [
  { id: 'saved', label: 'Saved', color: '#94a3b8' },
  { id: 'reviewing', label: 'Reviewing', color: '#6366f1' },
  { id: 'contacted', label: 'Contacted', color: '#0ea5e9' },
  { id: 'interview', label: 'Interview', color: '#8b5cf6' },
  { id: 'shortlisted', label: 'Shortlisted', color: '#10b981' },
  { id: 'hired', label: 'Hired', color: '#059669' },
  { id: 'rejected', label: 'Rejected', color: '#f43f5e' },
  { id: 'follow_up', label: 'Follow-Up Later', color: '#f59e0b' },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];

export type PipelineAiLabel =
  | 'top_match'
  | 'fastest_growing'
  | 'leadership_potential'
  | 'likely_to_accept'
  | 'startup_potential'
  | 'strong_communication';

export const AI_LABEL_COPY: Record<PipelineAiLabel, string> = {
  top_match: 'Top Match',
  fastest_growing: 'Fastest Growing',
  leadership_potential: 'High Leadership Potential',
  likely_to_accept: 'Likely to Accept',
  startup_potential: 'High Startup Potential',
  strong_communication: 'Strong Communication',
};

export function computePipelineAiLabels(
  card: {
    compatibilityScore: number | null;
    profileStrength: number;
    employabilityScore: number;
    leadershipScore: number;
    startupInvolvement: string | null;
    availability: string[];
  },
  hasStartup: boolean
): PipelineAiLabel[] {
  const labels: PipelineAiLabel[] = [];
  if ((card.compatibilityScore ?? 0) >= 75) labels.push('top_match');
  if (card.profileStrength >= 70 && card.employabilityScore >= 60) labels.push('fastest_growing');
  if (card.leadershipScore >= 65) labels.push('leadership_potential');
  if (card.availability.some((a) => a.toLowerCase().includes('intern'))) labels.push('likely_to_accept');
  if (hasStartup || card.startupInvolvement) labels.push('startup_potential');
  if (card.profileStrength >= 55) labels.push('strong_communication');
  return labels.slice(0, 3);
}

export function stageFromApplicationStatus(status: string): PipelineStageId {
  const s = status.toLowerCase();
  if (['accepted', 'hired', 'completed'].includes(s)) return 'hired';
  if (['rejected'].includes(s)) return 'rejected';
  if (['interview', 'final_interview', 'interviewing'].includes(s)) return 'interview';
  if (['under_review', 'reviewing'].includes(s)) return 'reviewing';
  if (['applied'].includes(s)) return 'contacted';
  return 'reviewing';
}
