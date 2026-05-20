import type { PipelineCandidateProfile } from '@/lib/company/company-candidate-builder';

export const PIPELINE_STAGES = [
  { id: 'saved', label: 'Saved', color: '#64748b', description: 'Talent you want to track' },
  { id: 'watching', label: 'Watching', color: '#6366f1', description: 'Long-term monitoring before they graduate' },
  { id: 'contacted', label: 'Contacted', color: '#0ea5e9', description: 'Active outreach started' },
  { id: 'interview', label: 'Interview', color: '#8b5cf6', description: 'Interview process in motion' },
  { id: 'shortlisted', label: 'Shortlisted', color: '#10b981', description: 'Final shortlist candidates' },
  { id: 'future_potential', label: 'Future Potential', color: '#f59e0b', description: 'Exceptional talent not ready yet' },
  { id: 'hired', label: 'Hired', color: '#059669', description: 'Joined your company ecosystem' },
  { id: 'archived', label: 'Archived', color: '#94a3b8', description: 'Paused or closed relationships' },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]['id'];

const LEGACY_STAGE_MAP: Record<string, PipelineStageId> = {
  reviewing: 'watching',
  follow_up: 'future_potential',
  rejected: 'archived',
};

export function normalizePipelineStage(stage: string): PipelineStageId {
  if (PIPELINE_STAGES.some((s) => s.id === stage)) return stage as PipelineStageId;
  return LEGACY_STAGE_MAP[stage] ?? 'saved';
}

export type PipelineAiLabel =
  | 'top_match'
  | 'fastest_growing'
  | 'leadership_potential'
  | 'likely_to_accept'
  | 'startup_potential'
  | 'strong_communication'
  | 'hidden_gem'
  | 'future_executive'
  | 'high_networking';

export const AI_LABEL_COPY: Record<PipelineAiLabel, string> = {
  top_match: 'Top Match',
  fastest_growing: 'Fastest Growing',
  leadership_potential: 'Leadership Match',
  likely_to_accept: 'Likely to Accept',
  startup_potential: 'Startup Founder',
  strong_communication: 'Strong Communication',
  hidden_gem: 'Hidden Gem',
  future_executive: 'Future Executive',
  high_networking: 'High Networking',
};

export const PIPELINE_AI_SECTIONS = [
  { id: 'highest_potential', title: 'Highest Potential', subtitle: 'Top composite signals across your ecosystem' },
  { id: 'rising_talent', title: 'Rising Talent', subtitle: 'Fastest profile and compatibility growth' },
  { id: 'most_compatible', title: 'Most Compatible', subtitle: 'Strongest fit with your company DNA' },
  { id: 'leadership_match', title: 'Strong Leadership Match', subtitle: 'Leadership + networking indicators' },
  { id: 'startup_founders', title: 'Startup Founders', subtitle: 'Builders in the Startup OS' },
  { id: 'hidden_gems', title: 'Hidden Gems', subtitle: 'High potential, lower visibility' },
  { id: 'fastest_growing', title: 'Fastest Growing', subtitle: 'Momentum in the last 30 days' },
  { id: 'high_networking', title: 'High Networking Activity', subtitle: 'Events, outreach, and engagement' },
  { id: 'future_executive', title: 'Future Executive Potential', subtitle: 'Long-horizon strategic talent' },
] as const;

export type PipelineAiSectionId = (typeof PIPELINE_AI_SECTIONS)[number]['id'];

export const SEARCH_SUGGESTIONS = [
  'Finance students with startup experience',
  'Leadership',
  'High compatibility',
  'Startup founders',
  'Open to internships',
  'Marketing + English',
  'Future potential',
  'Verified profiles',
];

export interface PipelineNote {
  id: string;
  body: string;
  pinned: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineTimelineEvent {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  at: string;
}

export interface PipelineFilters {
  minCompatibility?: number;
  leadership?: boolean;
  startup?: boolean;
  verified?: boolean;
  openToOpportunities?: boolean;
  stage?: PipelineStageId;
  tag?: string;
  followed?: boolean;
}

export function computePipelineAiLabels(
  card: {
    compatibilityScore: number | null;
    profileStrength: number;
    employabilityScore: number;
    leadershipScore: number;
    networkingScore: number;
    startupInvolvement: string | null;
    availability: string[];
    growthPercent: number;
  },
  hasStartup: boolean
): PipelineAiLabel[] {
  const labels: PipelineAiLabel[] = [];
  if ((card.compatibilityScore ?? 0) >= 78) labels.push('top_match');
  if (card.growthPercent >= 10) labels.push('fastest_growing');
  if (card.leadershipScore >= 68) labels.push('leadership_potential');
  if (card.availability.some((a) => a.toLowerCase().includes('intern'))) labels.push('likely_to_accept');
  if (hasStartup || card.startupInvolvement) labels.push('startup_potential');
  if (card.profileStrength >= 58) labels.push('strong_communication');
  if ((card.compatibilityScore ?? 0) >= 72 && card.profileStrength < 65) labels.push('hidden_gem');
  if (card.leadershipScore >= 75 && (card.compatibilityScore ?? 0) >= 70) labels.push('future_executive');
  if (card.networkingScore >= 65) labels.push('high_networking');
  return [...new Set(labels)].slice(0, 4);
}

export function stageFromApplicationStatus(status: string): PipelineStageId {
  const s = status.toLowerCase();
  if (['accepted', 'hired', 'completed'].includes(s)) return 'hired';
  if (['rejected', 'withdrawn'].includes(s)) return 'archived';
  if (['interview', 'final_interview', 'interviewing'].includes(s)) return 'interview';
  if (['shortlisted', 'offer'].includes(s)) return 'shortlisted';
  if (['under_review', 'reviewing'].includes(s)) return 'watching';
  if (['applied'].includes(s)) return 'contacted';
  return 'saved';
}

export function scoreSearchMatch(card: PipelineCandidateProfile, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const blob = [
    card.name,
    card.universityName,
    card.program,
    card.headline,
    card.academicYear,
    card.startupInvolvement,
    ...card.topSkills,
    ...card.languages,
    ...card.availability,
    ...card.interestTags,
    ...card.aiLabels.map((l) => AI_LABEL_COPY[l]),
    ...card.ecosystemSignals,
    String(card.compatibilityScore ?? ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (blob.includes(q)) return 100;
  const tokens = q.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const t of tokens) {
    if (blob.includes(t)) hits += 1;
    if (t === 'leadership' && card.leadershipScore >= 60) hits += 1;
    if (t === 'startup' && card.startupInvolvement) hits += 2;
    if ((t === 'high' || t === 'compatibility') && (card.compatibilityScore ?? 0) >= 75) hits += 1;
  }
  return hits > 0 ? hits * 20 : 0;
}

export function passesPipelineFilters(card: PipelineCandidateProfile, filters: PipelineFilters): boolean {
  if (filters.minCompatibility != null && (card.compatibilityScore ?? 0) < filters.minCompatibility) return false;
  if (filters.leadership && card.leadershipScore < 60) return false;
  if (filters.startup && !card.startupInvolvement) return false;
  if (filters.verified && card.verifiedBadges.length === 0) return false;
  if (filters.openToOpportunities && card.availability.length === 0) return false;
  return true;
}

export function assignPipelineAiSections(
  cards: { pipelineId: string; candidate: PipelineCandidateProfile; stage: PipelineStageId }[]
): Record<PipelineAiSectionId, string[]> {
  const sorted = [...cards].sort(
    (a, b) =>
      (b.candidate.compatibilityScore ?? 0) - (a.candidate.compatibilityScore ?? 0) ||
      b.candidate.profileStrength - a.candidate.profileStrength
  );

  const pick = (predicate: (c: (typeof cards)[0]) => boolean, limit = 6) =>
    sorted.filter(predicate).slice(0, limit).map((c) => c.pipelineId);

  return {
    highest_potential: pick(
      (c) => (c.candidate.compatibilityScore ?? 0) >= 74 && c.candidate.profileStrength >= 62,
      8
    ),
    rising_talent: pick((c) => c.candidate.growthPercent >= 8, 8),
    most_compatible: pick((c) => (c.candidate.compatibilityScore ?? 0) >= 70, 8),
    leadership_match: pick((c) => c.candidate.leadershipScore >= 65, 8),
    startup_founders: pick((c) => Boolean(c.candidate.startupInvolvement), 8),
    hidden_gems: pick(
      (c) => (c.candidate.compatibilityScore ?? 0) >= 72 && c.candidate.profileStrength < 62,
      6
    ),
    fastest_growing: pick((c) => c.candidate.growthPercent >= 12, 8),
    high_networking: pick((c) => c.candidate.networkingScore >= 62, 8),
    future_executive: pick(
      (c) =>
        c.candidate.leadershipScore >= 70 &&
        (c.stage === 'future_potential' || c.stage === 'watching'),
      8
    ),
  };
}

export const DEFAULT_PIPELINE_TAGS = [
  'Future Intern',
  'Leadership Potential',
  'Startup Mindset',
  'Strong Communication',
  'Keep Watching',
  'Immediate Hire',
  'Future Founder',
  'Finance Target',
  'Consulting Prospect',
];

export const TAG_COLORS: Record<string, string> = {
  'Future Intern': '#6366f1',
  'Leadership Potential': '#8b5cf6',
  'Startup Mindset': '#f59e0b',
  'Strong Communication': '#0ea5e9',
  'Keep Watching': '#64748b',
  'Immediate Hire': '#10b981',
  'Future Founder': '#ec4899',
  'Finance Target': '#14b8a6',
  'Consulting Prospect': '#3b82f6',
};
