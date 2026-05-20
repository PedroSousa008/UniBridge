import type { InternshipCard } from '@/lib/student/internship-job-builder';
import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type OpportunityStage =
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'under_review'
  | 'interview'
  | 'final_interview'
  | 'offer_received'
  | 'accepted'
  | 'rejected'
  | 'closed';

export type OpportunityCategory =
  | 'internship'
  | 'graduate'
  | 'part_time'
  | 'full_time'
  | 'startup'
  | 'freelance'
  | 'research';

export type StatusTone = 'green' | 'yellow' | 'red' | 'blue' | 'neutral';

export const OPPORTUNITY_STAGES: { id: OpportunityStage; label: string; tone: StatusTone }[] = [
  { id: 'saved', label: 'Saved', tone: 'neutral' },
  { id: 'preparing', label: 'Preparing', tone: 'yellow' },
  { id: 'applied', label: 'Applied', tone: 'blue' },
  { id: 'under_review', label: 'Under Review', tone: 'yellow' },
  { id: 'interview', label: 'Interview', tone: 'blue' },
  { id: 'final_interview', label: 'Final Interview', tone: 'blue' },
  { id: 'offer_received', label: 'Offer Received', tone: 'green' },
  { id: 'accepted', label: 'Accepted', tone: 'green' },
  { id: 'rejected', label: 'Rejected', tone: 'red' },
  { id: 'closed', label: 'Closed', tone: 'neutral' },
];

export function mapDbStatusToStage(status: string | null, bookmarked: boolean): OpportunityStage {
  if (!status && bookmarked) return 'saved';
  const map: Record<string, OpportunityStage> = {
    saved: 'saved',
    candidate: 'preparing',
    preparing: 'preparing',
    applied: 'applied',
    under_review: 'under_review',
    reviewing: 'under_review',
    interviewing: 'interview',
    interview: 'interview',
    final_interview: 'final_interview',
    offer_received: 'offer_received',
    offer: 'offer_received',
    accepted: 'accepted',
    rejected: 'rejected',
    closed: 'closed',
    completed: 'closed',
  };
  return (status && map[status]) || (bookmarked ? 'saved' : 'preparing');
}

export function mapStageToDbStatus(stage: OpportunityStage): string {
  return stage;
}

export function inferCategory(employmentType: string | null): OpportunityCategory {
  const t = (employmentType ?? 'internship').toLowerCase();
  if (t.includes('graduate')) return 'graduate';
  if (t.includes('part')) return 'part_time';
  if (t.includes('full')) return 'full_time';
  if (t.includes('freelance')) return 'freelance';
  if (t.includes('research')) return 'research';
  if (t.includes('startup')) return 'startup';
  return 'internship';
}

export function stageTone(stage: OpportunityStage): StatusTone {
  return OPPORTUNITY_STAGES.find((s) => s.id === stage)?.tone ?? 'neutral';
}

export function defaultNextAction(stage: OpportunityStage, deadline: string | null): string {
  switch (stage) {
    case 'saved':
      return 'Review role requirements and save prep notes';
    case 'preparing':
      return 'Finalize CV and submit application';
    case 'applied':
      return 'Follow up if no response in 7–10 days';
    case 'under_review':
      return 'Monitor status; prepare for potential interview';
    case 'interview':
      return 'Complete interview prep checklist';
    case 'final_interview':
      return 'Prepare case study / final round questions';
    case 'offer_received':
      return 'Evaluate offer vs career goals';
    case 'accepted':
      return 'Complete onboarding checklist';
    case 'rejected':
      return 'Review rejection insights and next matches';
    case 'closed':
      return 'Archive notes for future reference';
    default:
      if (deadline) return 'Meet application deadline';
      return 'Update pipeline status';
  }
}

export function interviewStatusLabel(
  stage: OpportunityStage,
  rounds: { round: number; date: string | null; status: string }[]
): string {
  if (stage === 'final_interview') return 'Final round scheduled';
  if (stage === 'interview') {
    const next = rounds.find((r) => r.status === 'scheduled');
    if (next?.date) return `Round ${next.round} · ${new Date(next.date).toLocaleDateString()}`;
    return rounds.length ? `${rounds.length} round(s) tracked` : 'Interview phase';
  }
  if (stage === 'under_review') return 'Awaiting recruiter response';
  if (stage === 'offer_received') return 'Offer stage';
  if (stage === 'rejected') return 'Closed';
  return '—';
}

export interface OpportunityRow {
  id: string;
  applicationId: string | null;
  companyName: string;
  companyLogoUrl: string | null;
  role: string;
  category: OpportunityCategory;
  applicationDate: string | null;
  stage: OpportunityStage;
  stageLabel: string;
  statusTone: StatusTone;
  compatibility: number;
  salaryRange: string | null;
  interviewStatus: string;
  nextAction: string;
  priority: boolean;
  notes: string | null;
  deadline: string | null;
  employmentType: string;
  department: string;
  href: string;
  aiPriorityScore: number;
  aiPriorityLabel: string;
  missingSkills: string[];
  isBookmarked: boolean;
  location: string | null;
}

export function buildOpportunityRow(
  card: InternshipCard,
  opts: {
    companyLogoUrl: string | null;
    priority: boolean;
    nextAction: string | null;
    notes: string | null;
    category: OpportunityCategory;
    interviewRounds: { round: number; date: string | null; status: string }[];
  }
): OpportunityRow {
  const bookmarked = card.isBookmarked;
  const stage = mapDbStatusToStage(card.applicationStatus, bookmarked);
  const stageMeta = OPPORTUNITY_STAGES.find((s) => s.id === stage)!;

  const ai = computeAiPriority(card, stage);

  return {
    id: card.id,
    applicationId: card.applicationId,
    companyName: card.companyName,
    companyLogoUrl: opts.companyLogoUrl,
    role: card.title,
    category: opts.category,
    applicationDate: card.appliedAt,
    stage,
    stageLabel: stageMeta.label,
    statusTone: stageMeta.tone,
    compatibility: card.compatibility,
    salaryRange: card.salaryLabel,
    interviewStatus: interviewStatusLabel(stage, opts.interviewRounds),
    nextAction: opts.nextAction ?? defaultNextAction(stage, card.deadline),
    priority: opts.priority,
    notes: opts.notes,
    deadline: card.deadline,
    employmentType: card.employmentType,
    department: card.department,
    href: `/student/career/opportunities/${card.id}`,
    aiPriorityScore: ai.score,
    aiPriorityLabel: ai.label,
    missingSkills: card.missingSkills.slice(0, 4).map((s) => s.name),
    isBookmarked: bookmarked,
    location: card.location,
  };
}

export function computeAiPriority(
  card: InternshipCard,
  stage: OpportunityStage
): { score: number; label: string } {
  let score = card.compatibility * 0.5 + card.profileCompletion * 0.2 + card.cvReadiness * 0.15;
  if (stage === 'interview' || stage === 'final_interview') score += 15;
  if (stage === 'offer_received') score += 20;
  if (stage === 'rejected') score = Math.max(10, score * 0.3);
  if (stage === 'saved' || stage === 'preparing') score += card.compatibility >= 75 ? 10 : 0;
  if (card.deadline) {
    const days = (new Date(card.deadline).getTime() - Date.now()) / 86400000;
    if (days >= 0 && days <= 5) score += 12;
  }
  score = Math.min(100, Math.round(score));

  let label = 'Monitor';
  if (score >= 82) label = 'High focus — strong fit & momentum';
  else if (score >= 65) label = 'Worth active pursuit';
  else if (stage === 'rejected') label = 'Low priority — learn & move on';
  else if (card.compatibility < 55) label = 'Low compatibility — deprioritize unless strategic';
  else label = 'Steady progress — maintain cadence';

  return { score, label };
}

export interface OpportunityNotification {
  id: string;
  text: string;
  type: 'deadline' | 'interview' | 'profile' | 'compatibility' | 'offer' | 'info';
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

export function buildOpportunityNotifications(rows: OpportunityRow[]): OpportunityNotification[] {
  const items: OpportunityNotification[] = [];
  const now = Date.now();

  for (const r of rows) {
    if (r.deadline) {
      const days = (new Date(r.deadline).getTime() - now) / 86400000;
      if (days >= 0 && days <= 3) {
        items.push({
          id: `dl-${r.id}`,
          text: `Deadline approaching: ${r.role} at ${r.companyName}`,
          type: 'deadline',
          href: r.href,
          urgency: 'high',
        });
      }
    }
    if (r.stage === 'interview' || r.stage === 'final_interview') {
      items.push({
        id: `int-${r.id}`,
        text: `Interview active: ${r.role} — ${r.interviewStatus}`,
        type: 'interview',
        href: r.href,
        urgency: 'high',
      });
    }
    if (r.compatibility >= 80 && (r.stage === 'saved' || r.stage === 'preparing')) {
      items.push({
        id: `match-${r.id}`,
        text: `High-match opportunity: ${r.role} (${r.compatibility}%)`,
        type: 'compatibility',
        href: r.href,
        urgency: 'medium',
      });
    }
    if (r.stage === 'offer_received') {
      items.push({
        id: `offer-${r.id}`,
        text: `Offer received: ${r.companyName}`,
        type: 'offer',
        href: r.href,
        urgency: 'high',
      });
    }
  }

  return items
    .sort((a, b) => (a.urgency === 'high' ? -1 : 0) - (b.urgency === 'high' ? -1 : 0))
    .slice(0, 10);
}

export interface RejectionInsight {
  summary: string;
  missingSkills: string[];
  suggestions: string[];
  strongerMatches: string[];
}

export function buildRejectionInsight(
  row: OpportunityRow,
  profile: StudentCareerProfile
): RejectionInsight {
  return {
    summary: `Rejection at ${row.companyName} is often linked to competition and skill fit — not a verdict on your potential.`,
    missingSkills: row.missingSkills.length ? row.missingSkills : ['Role-specific experience', 'Interview narrative'],
    suggestions: [
      profile.gradeAverage != null && profile.gradeAverage < 14
        ? 'Raise academic signals visible on your verified CV'
        : 'Strengthen quantified achievements on your CV',
      row.compatibility < 70
        ? 'Target roles above 75% compatibility in your pipeline'
        : 'Request informational interviews to improve culture fit signals',
      'Log interview reflections so AI can adapt prep priorities',
    ],
    strongerMatches: [
      'Roles with fewer missing skills in Skills Tracking',
      'Partnerships marked high compatibility in your feed',
      'Paths aligned with your primary Career Path target',
    ],
  };
}

export interface OpportunityAnalytics {
  applicationSuccessRate: number | null;
  interviewConversion: number | null;
  strongestSector: string | null;
  bestRole: string | null;
  compatibilityAverage: number;
  totalPipeline: number;
  activeCount: number;
}

export function buildOpportunityAnalytics(rows: OpportunityRow[]): OpportunityAnalytics {
  const applied = rows.filter((r) =>
    !['saved', 'preparing'].includes(r.stage)
  );
  const rejected = rows.filter((r) => r.stage === 'rejected').length;
  const interviews = rows.filter((r) =>
    ['interview', 'final_interview', 'offer_received'].includes(r.stage)
  ).length;
  const active = rows.filter((r) => !['rejected', 'closed', 'accepted'].includes(r.stage));

  const byDept = new Map<string, number>();
  for (const r of rows) {
    byDept.set(r.department, (byDept.get(r.department) ?? 0) + r.compatibility);
  }
  let strongestSector: string | null = null;
  let bestAvg = 0;
  for (const [d, sum] of byDept) {
    const avg = sum / rows.filter((r) => r.department === d).length;
    if (avg > bestAvg) {
      bestAvg = avg;
      strongestSector = d;
    }
  }

  const best = [...rows].sort((a, b) => b.compatibility - a.compatibility)[0];

  return {
    applicationSuccessRate:
      applied.length > 0 ? Math.round(((applied.length - rejected) / applied.length) * 100) : null,
    interviewConversion:
      applied.length > 0 ? Math.round((interviews / applied.length) * 100) : null,
    strongestSector,
    bestRole: best ? `${best.role} · ${best.companyName}` : null,
    compatibilityAverage:
      rows.length > 0 ? Math.round(rows.reduce((a, r) => a + r.compatibility, 0) / rows.length) : 0,
    totalPipeline: rows.length,
    activeCount: active.length,
  };
}

export function runOpportunityAdvisor(
  prompt: string,
  rows: OpportunityRow[],
  primaryRole: string | null
): string {
  const p = prompt.toLowerCase();
  const top = [...rows].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0];
  if (p.includes('priorit')) {
    return top
      ? `Focus on ${top.role} at ${top.companyName} (${top.aiPriorityLabel}). Compatibility ${top.compatibility}%.`
      : 'Save high-compatibility roles from Partnerships to build your pipeline.';
  }
  if (p.includes('reject')) {
    const rej = rows.find((r) => r.stage === 'rejected');
    return rej
      ? `Latest rejection: ${rej.companyName}. Review missing skills (${rej.missingSkills.join(', ') || 'see workspace'}) and pivot to higher-fit roles.`
      : 'No rejections tracked — keep building pipeline depth.';
  }
  if (primaryRole) {
    return `Pipeline aligned with ${primaryRole}: ${rows.length} opportunities tracked. ${rows.filter((r) => r.priority).length} marked priority.`;
  }
  return top
    ? `${top.aiPriorityLabel} — next: ${top.nextAction}`
    : 'Apply from Internships or Partnerships — applications sync here automatically.';
}

export function syncApplicationDocuments(profile: StudentCareerProfile): {
  name: string;
  submitted: boolean;
  source?: string;
  syncedAt: string;
}[] {
  const at = new Date().toISOString();
  const docs = [
    { name: 'CV / Resume', submitted: true, source: 'cv_builder', syncedAt: at },
    {
      name: 'Verified profile',
      submitted: profile.profileStrength >= 40,
      source: 'ecosystem',
      syncedAt: at,
    },
  ];
  if (profile.hasStartup) {
    docs.push({ name: 'Startup portfolio', submitted: true, source: 'startup_hub', syncedAt: at });
  }
  return docs;
}
