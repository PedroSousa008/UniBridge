import type { OpportunityStage } from '@/lib/career/opportunities-intelligence';
import { mapDbStatusToStage } from '@/lib/career/opportunities-intelligence';
import type { PipelineStageId } from '@/lib/company/company-pipeline-intelligence';

export interface InsightMetricCard {
  id: string;
  label: string;
  value: number | string;
  changePercent: number | null;
  trend: 'up' | 'down' | 'steady';
  hint?: string;
}

export interface RecruitmentStageInsight {
  id: string;
  label: string;
  count: number;
  changeWeek: number;
  momentum: 'rising' | 'steady' | 'cooling';
}

export interface FunnelStageInsight {
  id: string;
  label: string;
  count: number;
  conversionFromPrev: number | null;
  avgCompatibility: number | null;
}

export interface UniversityPerformanceRow {
  universityId: string;
  name: string;
  compatibility: number;
  startupActivity: number;
  leadership: number;
  hiringSuccess: number;
  networking: number;
  employability: number;
  applicationQuality: number;
  eventEngagement: number;
  growthPercent: number;
  rank: number;
}

export interface DegreeInsightRow {
  name: string;
  studentCount: number;
  avgCompatibility: number;
  leadershipDensity: number;
  startupDensity: number;
  networkingScore: number;
  employability: number;
  growthPercent: number;
  tag: string;
}

export interface EventImpactRow {
  id: string;
  title: string;
  rsvpCount: number;
  applicationsGenerated: number;
  pipelineMovement: number;
  compatibilityLift: number;
  newFollows: number;
}

export const RECRUITMENT_STAGE_MAP: {
  id: string;
  label: string;
  appStages: OpportunityStage[];
  pipelineStages: PipelineStageId[];
}[] = [
  { id: 'applied', label: 'Applied', appStages: ['applied', 'preparing'], pipelineStages: [] },
  { id: 'under_review', label: 'Under Review', appStages: ['under_review'], pipelineStages: ['watching'] },
  {
    id: 'interview',
    label: 'Interview',
    appStages: ['interview', 'final_interview'],
    pipelineStages: ['interview'],
  },
  { id: 'shortlisted', label: 'Shortlisted', appStages: ['offer_received'], pipelineStages: ['shortlisted'] },
  { id: 'hired', label: 'Hired', appStages: ['accepted'], pipelineStages: ['hired'] },
  { id: 'archived', label: 'Archived', appStages: ['rejected', 'closed'], pipelineStages: ['archived'] },
  {
    id: 'future_potential',
    label: 'Future Potential',
    appStages: [],
    pipelineStages: ['future_potential'],
  },
];

export const TALENT_FUNNEL_STAGES = [
  { id: 'discovered', label: 'Discovered', pipelineStages: [] as PipelineStageId[] },
  { id: 'saved', label: 'Saved', pipelineStages: ['saved', 'watching'] as PipelineStageId[] },
  { id: 'contacted', label: 'Contacted', pipelineStages: ['contacted'] as PipelineStageId[] },
  { id: 'interviewed', label: 'Interviewed', pipelineStages: ['interview', 'shortlisted'] as PipelineStageId[] },
  { id: 'hired', label: 'Hired', pipelineStages: ['hired'] as PipelineStageId[] },
];

export function trendFromDelta(delta: number): 'up' | 'down' | 'steady' {
  if (delta > 2) return 'up';
  if (delta < -2) return 'down';
  return 'steady';
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function mapApplicationToRecruitmentBucket(status: string): string {
  const stage = mapDbStatusToStage(status, false);
  for (const row of RECRUITMENT_STAGE_MAP) {
    if (row.appStages.includes(stage)) return row.id;
  }
  return 'applied';
}

export function buildStrategicInsightCards(input: {
  topDegree: string | null;
  applicationsGrowth: number | null;
  leadershipGrowth: number | null;
  startupFounderPct: number;
  eventEngagement: number;
  topUniversity: string | null;
  avgCompatibility: number;
  networkingTrend: string;
}): string[] {
  const cards: string[] = [];
  if (input.applicationsGrowth != null && input.applicationsGrowth > 0) {
    cards.push(`Applications increased ${input.applicationsGrowth}% this month — hiring momentum is building.`);
  }
  if (input.leadershipGrowth != null && input.leadershipGrowth > 0) {
    cards.push(`Leadership density is rising ${input.leadershipGrowth}% among partner-university students.`);
  }
  if (input.topDegree) {
    cards.push(`${input.topDegree} students show the strongest compatibility with your opportunities.`);
  }
  if (input.startupFounderPct >= 15) {
    cards.push(`Startup founder density at ${input.startupFounderPct}% — entrepreneurial talent is active in your ecosystem.`);
  }
  if (input.eventEngagement > 0) {
    cards.push(`Students attending your events show higher pipeline conversion — ${input.eventEngagement} RSVPs this period.`);
  }
  if (input.topUniversity) {
    cards.push(`${input.topUniversity} leads partner-university performance across compatibility and engagement.`);
  }
  if (input.avgCompatibility >= 70) {
    cards.push(`Average applicant compatibility at ${input.avgCompatibility}% — strong talent-market fit indicators.`);
  }
  cards.push(input.networkingTrend);
  if (cards.length < 4) {
    cards.push('Ecosystem intelligence updates as students engage with opportunities, events, and Startup OS.');
  }
  return cards.slice(0, 8);
}

export function buildLongTermIndicators(input: {
  risingDegrees: string[];
  risingUniversities: string[];
  startupTrend: string;
  leadershipTrend: string;
  industryInterest: string;
}): { label: string; direction: string; confidence: 'indicator' | 'emerging' }[] {
  return [
    {
      label: 'Future degree momentum',
      direction: input.risingDegrees[0] ?? 'Monitoring partner programs',
      confidence: 'indicator',
    },
    {
      label: 'University ecosystem shift',
      direction: input.risingUniversities[0] ?? 'Stable partner performance',
      confidence: 'emerging',
    },
    {
      label: 'Startup ecosystem',
      direction: input.startupTrend,
      confidence: 'indicator',
    },
    {
      label: 'Leadership pipeline',
      direction: input.leadershipTrend,
      confidence: 'indicator',
    },
    {
      label: 'Student interest signals',
      direction: input.industryInterest,
      confidence: 'emerging',
    },
  ];
}
