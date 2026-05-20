export type OpportunityCategoryId =
  | 'internship'
  | 'graduate_program'
  | 'full_time'
  | 'startup_collaboration'
  | 'leadership_program'
  | 'mentorship'
  | 'research'
  | 'innovation_challenge'
  | 'ambassador'
  | 'event_workshop'
  | 'future_opening';

export type OpportunityAvailability = 'open' | 'future' | 'filled';

export interface OpportunityCategoryMeta {
  id: OpportunityCategoryId;
  label: string;
  description: string;
  gradient: string;
}

export const OPPORTUNITY_CATEGORIES: OpportunityCategoryMeta[] = [
  {
    id: 'internship',
    label: 'Internships',
    description: 'Structured entry paths with mentorship and project exposure.',
    gradient: 'from-indigo-500/20 via-violet-500/10 to-transparent',
  },
  {
    id: 'graduate_program',
    label: 'Graduate Programs',
    description: 'Accelerated tracks for high-potential graduates.',
    gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
  },
  {
    id: 'full_time',
    label: 'Full-Time Roles',
    description: 'Permanent roles across departments and growth tracks.',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
  },
  {
    id: 'startup_collaboration',
    label: 'Startup Collaborations',
    description: 'Founder shadowing, venture scouting, and innovation partnerships.',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
  },
  {
    id: 'leadership_program',
    label: 'Leadership Programs',
    description: 'High-agency tracks for future leaders.',
    gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
  },
  {
    id: 'mentorship',
    label: 'Mentorship Opportunities',
    description: 'Guided growth with company mentors and alumni.',
    gradient: 'from-purple-500/20 via-fuchsia-500/10 to-transparent',
  },
  {
    id: 'research',
    label: 'Research Projects',
    description: 'Applied research with universities and labs.',
    gradient: 'from-cyan-500/20 via-sky-500/10 to-transparent',
  },
  {
    id: 'innovation_challenge',
    label: 'Innovation Challenges',
    description: 'Compete, build, and prove fit before hiring.',
    gradient: 'from-lime-500/20 via-green-500/10 to-transparent',
  },
  {
    id: 'ambassador',
    label: 'Ambassadors',
    description: 'Represent the brand on campus and at events.',
    gradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',
  },
  {
    id: 'event_workshop',
    label: 'Events & Workshops',
    description: 'Live sessions that feed your talent pipeline.',
    gradient: 'from-slate-500/20 via-zinc-500/10 to-transparent',
  },
  {
    id: 'future_opening',
    label: 'Future Openings',
    description: 'Upcoming paths students can follow before launch.',
    gradient: 'from-violet-600/25 via-indigo-500/15 to-transparent',
  },
];

const ROLE_TYPE_TO_CATEGORY: Record<string, OpportunityCategoryId> = {
  internship: 'internship',
  graduate: 'graduate_program',
  full_time: 'full_time',
  leadership: 'leadership_program',
  startup_collab: 'startup_collaboration',
};

export function resolveOpportunityCategory(
  roleType: string | null | undefined,
  override: string | null | undefined,
  isFutureOpening: boolean
): OpportunityCategoryId {
  if (isFutureOpening) return 'future_opening';
  if (override && OPPORTUNITY_CATEGORIES.some((c) => c.id === override)) {
    return override as OpportunityCategoryId;
  }
  return ROLE_TYPE_TO_CATEGORY[roleType ?? 'internship'] ?? 'internship';
}

export function resolveAvailability(
  isFilled: boolean,
  isFutureOpening: boolean,
  opensAt: Date | null
): OpportunityAvailability {
  if (isFilled) return 'filled';
  if (isFutureOpening || (opensAt && opensAt > new Date())) return 'future';
  return 'open';
}

export function availabilityLabel(status: OpportunityAvailability): string {
  if (status === 'filled') return 'Filled';
  if (status === 'future') return 'Future opening';
  return 'Open';
}

export function remoteLabel(remoteType: string | null | undefined): string {
  const r = (remoteType ?? 'on_site').toLowerCase();
  if (r === 'remote') return 'Remote';
  if (r === 'hybrid') return 'Hybrid';
  return 'On-site';
}

export function hiringUrgencyLabel(priority: string | null | undefined): string {
  if (priority === 'high') return 'High urgency';
  if (priority === 'low') return 'Steady hiring';
  return 'Active hiring';
}

export function formatSalaryRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `€${min.toLocaleString()} – €${max.toLocaleString()}`;
  if (min != null) return `From €${min.toLocaleString()}`;
  return `Up to €${max!.toLocaleString()}`;
}

export function buildOpportunitySignals(input: {
  applicationsThisWeek: number;
  applicationsCount: number;
  bookmarkCount: number;
  compatibilityAvg: number | null;
  topDegree: string | null;
  growthPercent: number;
  startupAlignment: number;
  leadershipAlignment: number;
}): string[] {
  const signals: string[] = [];
  if (input.applicationsThisWeek >= 3) {
    signals.push(`${input.applicationsThisWeek} students applied this week`);
  } else if (input.applicationsThisWeek > 0) {
    signals.push(`${input.applicationsThisWeek} new application${input.applicationsThisWeek > 1 ? 's' : ''} this week`);
  }
  if (input.topDegree) {
    signals.push(`High compatibility with ${input.topDegree} students`);
  }
  if (input.growthPercent >= 25) signals.push('Fast-growing interest');
  if (input.startupAlignment >= 70) signals.push('High startup founder interest');
  if (input.leadershipAlignment >= 70) signals.push('Strong leadership alignment');
  if (input.bookmarkCount >= 5) signals.push(`${input.bookmarkCount} students saved this role`);
  if (input.compatibilityAvg != null && input.compatibilityAvg >= 80) {
    signals.push(`Avg compatibility ${input.compatibilityAvg}%`);
  }
  if (signals.length === 0 && input.applicationsCount === 0) {
    signals.push('Ecosystem live — publish to attract talent');
  }
  return signals.slice(0, 4);
}

export interface OpportunityEcosystemJson {
  whyExists?: string;
  successProfile?: string;
  growthPath?: string;
  cultureAlignment?: string;
  customQuestions?: string[];
  linkedEventIds?: string[];
  timeline?: {
    openDate?: string;
    deadline?: string;
    interviewPhase?: string;
    hiringEstimate?: string;
    eventTimeline?: string;
  };
}

export function parseEcosystemJson(val: unknown): OpportunityEcosystemJson {
  if (!val || typeof val !== 'object') return {};
  const o = val as Record<string, unknown>;
  return {
    whyExists: typeof o.whyExists === 'string' ? o.whyExists : undefined,
    successProfile: typeof o.successProfile === 'string' ? o.successProfile : undefined,
    growthPath: typeof o.growthPath === 'string' ? o.growthPath : undefined,
    cultureAlignment: typeof o.cultureAlignment === 'string' ? o.cultureAlignment : undefined,
    customQuestions: Array.isArray(o.customQuestions)
      ? o.customQuestions.map(String)
      : undefined,
    linkedEventIds: Array.isArray(o.linkedEventIds)
      ? o.linkedEventIds.map(String)
      : undefined,
    timeline:
      o.timeline && typeof o.timeline === 'object'
        ? (o.timeline as OpportunityEcosystemJson['timeline'])
        : undefined,
  };
}
