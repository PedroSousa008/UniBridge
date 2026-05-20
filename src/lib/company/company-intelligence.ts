import { parseVisibilityField } from '@/lib/career/profile-intelligence';
import { mapDbStatusToStage, stageTone, type OpportunityStage } from '@/lib/career/opportunities-intelligence';

export type CompanyAudience = 'student' | 'company';

export function isVisibleToCompanies(visibilityProfileRaw: string | null | undefined): boolean {
  const audiences = parseVisibilityField(visibilityProfileRaw, ['university']);
  if (audiences.includes('private')) return false;
  return audiences.includes('companies') || audiences.includes('public');
}

export function studentOpenToRecruiting(openTo: {
  openToInternships?: boolean;
  openToFullTime?: boolean;
  openToNetworking?: boolean;
}): boolean {
  return Boolean(openTo.openToInternships || openTo.openToFullTime || openTo.openToNetworking);
}

export function companyStageFromApplication(status: string): OpportunityStage {
  return mapDbStatusToStage(status, false);
}

export function companyStageLabel(stage: OpportunityStage): string {
  const labels: Record<OpportunityStage, string> = {
    saved: 'Saved',
    preparing: 'Preparing',
    applied: 'New application',
    under_review: 'Under review',
    interview: 'Interview',
    final_interview: 'Final interview',
    offer_received: 'Offer sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    closed: 'Closed',
  };
  return labels[stage] ?? stage;
}

export function companyStageColor(stage: OpportunityStage): string {
  const tone = stageTone(stage);
  if (tone === 'green') return 'text-emerald-600';
  if (tone === 'red') return 'text-rose-600';
  if (tone === 'blue') return 'text-sky-600';
  if (tone === 'yellow') return 'text-amber-600';
  return 'text-muted-foreground';
}

export const COMPANY_LOGIN_COPY = {
  student: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue building your future.',
    cta: 'Student sign in',
  },
  company: {
    title: 'Recruit with intelligence',
    subtitle: 'Access verified talent, live pipelines, and university partnerships.',
    cta: 'Company sign in',
  },
} as const;
