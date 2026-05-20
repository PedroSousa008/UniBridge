/** Validates and normalizes external startup websites for reliable "View Startup" links. */
export function resolveStartupWebsiteUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim();
  if (/^www\./i.test(url)) url = `https://${url}`;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || !host.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export const STARTUP_CATEGORY_CHIPS = [
  'AI',
  'SaaS',
  'Health',
  'Finance',
  'Education',
  'Marketplace',
  'Sustainability',
  'Consumer App',
] as const;

export const STARTUP_STAGE_OPTIONS = [
  { id: 'idea', label: 'Idea', match: ['idea'] },
  { id: 'mvp', label: 'MVP', match: ['mvp', 'prototype'] },
  { id: 'beta', label: 'Beta', match: ['beta', 'launched'] },
  { id: 'growing', label: 'Growing', match: ['growth', 'growing'] },
  { id: 'revenue', label: 'Revenue Generating', match: ['revenue'] },
  { id: 'scaling', label: 'Scaling', match: ['scale', 'scaling'] },
] as const;

export type PotentialIndicatorId =
  | 'market_potential'
  | 'problem_strength'
  | 'scalability'
  | 'innovation'
  | 'execution_complexity'
  | 'monetization'
  | 'differentiation'
  | 'investor_attractiveness'
  | 'early_traction';

export interface PotentialIndicator {
  id: PotentialIndicatorId;
  label: string;
  score: number;
  level: 'high' | 'medium' | 'low';
}

export interface AiPotentialAnalysis {
  indicators: PotentialIndicator[];
  whyPotential: string[];
  projection: {
    complexity: string;
    capitalIntensity: string;
    scalability: string;
    timeToMarket: string;
    longTermPotential: string;
    operationalDifficulty: string;
  };
  momentumScore: number;
  unicornSignals: string[];
}

export interface StartupHealthMetrics {
  teamActivity: number;
  founderEngagement: number;
  growthRate: number;
  networkingStrength: number;
  hiringActivity: number;
  productEvolution: number;
  eventParticipation: number;
}

export interface StartupActivityEvent {
  id: string;
  startupId: string;
  startupName: string;
  label: string;
  at: string;
  kind: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function textScore(text: string | null | undefined, weights: { min: number; bonus: number }) {
  const len = (text ?? '').trim().length;
  if (len < weights.min) return 35;
  return clamp(45 + len * weights.bonus);
}

function indicatorLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 72) return 'high';
  if (score >= 48) return 'medium';
  return 'low';
}

export interface StartupAiInput {
  name: string;
  problem: string | null;
  targetCustomer: string | null;
  solution: string | null;
  differentiator: string | null;
  businessModelText: string | null;
  targetMarket: string | null;
  marketSizeEstimate: string | null;
  competitors: string | null;
  stage: string | null;
  industry: string | null;
  revenueModels: string[];
  readinessScore: number;
  progressPercent: number;
  teamSize: number;
  followerCount: number;
  milestoneDone: number;
  milestoneTotal: number;
  founderProfileStrength: number;
  founderEmployability: number;
}

export function analyzeStartupPotential(input: StartupAiInput): AiPotentialAnalysis {
  const problemStrength = textScore(input.problem, { min: 40, bonus: 0.35 });
  const solutionClarity = textScore(input.solution, { min: 30, bonus: 0.3 });
  const differentiation = textScore(input.differentiator, { min: 25, bonus: 0.4 });
  const marketPotential = clamp(
    textScore(input.targetMarket, { min: 20, bonus: 0.25 }) * 0.5 +
      (input.marketSizeEstimate ? 68 : 42) +
      textScore(input.targetCustomer, { min: 20, bonus: 0.2 }) * 0.3
  );
  const monetization = clamp(
    input.revenueModels.length * 14 +
      textScore(input.businessModelText, { min: 15, bonus: 0.35 })
  );
  const scalability = clamp(
    (input.industry?.toLowerCase().includes('saas') ? 78 : 52) +
      (input.revenueModels.some((r) => /saas|subscription|marketplace/i.test(r)) ? 18 : 0) +
      solutionClarity * 0.2
  );
  const innovation = clamp(differentiation * 0.7 + solutionClarity * 0.3);
  const earlyStage = /idea|prototype|mvp/i.test(input.stage ?? '');
  const executionComplexity = clamp(
    earlyStage ? 72 - input.teamSize * 4 : 48 - input.teamSize * 2
  );
  const investorAttractiveness = clamp(
    marketPotential * 0.25 +
      monetization * 0.2 +
      differentiation * 0.2 +
      input.readinessScore * 0.25 +
      (input.milestoneDone / Math.max(1, input.milestoneTotal)) * 20
  );
  const earlyTraction = clamp(
    input.progressPercent * 0.4 +
      input.followerCount * 2 +
      (input.milestoneDone / Math.max(1, input.milestoneTotal)) * 35
  );

  const indicators: PotentialIndicator[] = [
    { id: 'market_potential', label: 'Market Potential', score: marketPotential, level: indicatorLevel(marketPotential) },
    { id: 'problem_strength', label: 'Problem Strength', score: problemStrength, level: indicatorLevel(problemStrength) },
    { id: 'scalability', label: 'Scalability', score: scalability, level: indicatorLevel(scalability) },
    { id: 'innovation', label: 'Innovation Score', score: innovation, level: indicatorLevel(innovation) },
    {
      id: 'execution_complexity',
      label: 'Execution Complexity',
      score: executionComplexity,
      level: indicatorLevel(100 - executionComplexity),
    },
    { id: 'monetization', label: 'Monetization Potential', score: monetization, level: indicatorLevel(monetization) },
    {
      id: 'differentiation',
      label: 'Competitive Differentiation',
      score: differentiation,
      level: indicatorLevel(differentiation),
    },
    {
      id: 'investor_attractiveness',
      label: 'Investor Attractiveness',
      score: investorAttractiveness,
      level: indicatorLevel(investorAttractiveness),
    },
    {
      id: 'early_traction',
      label: 'Early Traction Potential',
      score: earlyTraction,
      level: indicatorLevel(earlyTraction),
    },
  ];

  const whyPotential: string[] = [];
  if (problemStrength >= 65) whyPotential.push('Addresses a clearly articulated, high-frequency problem');
  if (differentiation >= 65) whyPotential.push('Strong differentiation vs. current alternatives');
  if (monetization >= 60) whyPotential.push('Clear monetization logic for early-stage revenue');
  if (marketPotential >= 65) whyPotential.push('Large or well-defined addressable market');
  if (input.teamSize >= 2) whyPotential.push('Multi-founder team improves execution capacity');
  if (input.founderProfileStrength >= 70) whyPotential.push('Strong founder-market fit signals on UniBridge');
  if (scalability >= 70) whyPotential.push('Strong early-stage scalability indicators');
  if (whyPotential.length === 0) {
    whyPotential.push('Early profile — potential strengthens as founders add traction and team depth');
  }

  const momentumScore = clamp(
    investorAttractiveness * 0.35 + earlyTraction * 0.35 + innovation * 0.3
  );

  const unicornSignals: string[] = [];
  if (input.followerCount >= 15 && earlyTraction >= 60) {
    unicornSignals.push('Rapid community traction relative to stage');
  }
  if (input.teamSize >= 3 && input.founderEmployability >= 75) {
    unicornSignals.push('Strong team composition for current stage');
  }
  if (input.milestoneDone >= 4 && input.progressPercent >= 50) {
    unicornSignals.push('Consistent product evolution milestones');
  }
  if (input.founderProfileStrength >= 80) {
    unicornSignals.push('Exceptional founder profile and networking signals');
  }
  if (differentiation >= 75 && marketPotential >= 70) {
    unicornSignals.push('Founder-market fit with differentiated positioning');
  }
  if (unicornSignals.length === 0) {
    unicornSignals.push('Monitoring early signals — engagement will unlock deeper AI insights');
  }

  return {
    indicators,
    whyPotential: whyPotential.slice(0, 5),
    projection: {
      complexity: earlyStage ? 'Moderate — validation-heavy phase' : 'Elevated — operational coordination required',
      capitalIntensity:
        monetization >= 65 ? 'Medium — revenue path may reduce burn' : 'Medium-high — likely needs early capital',
      scalability: scalability >= 70 ? 'High digital scalability potential' : 'Moderate — may need GTM iteration',
      timeToMarket: earlyStage ? '3–9 months to meaningful MVP traction' : '1–4 months to scale existing motion',
      longTermPotential:
        marketPotential >= 65 ? 'Strong if execution matches market thesis' : 'Conditional on market validation',
      operationalDifficulty:
        executionComplexity >= 65 ? 'Higher — team and process building critical' : 'Manageable at current maturity',
    },
    momentumScore,
    unicornSignals: unicornSignals.slice(0, 4),
  };
}

export function computeEcosystemScore(input: {
  followers: number;
  followersThisWeek: number;
  bookmarks: number;
  companyBookmarks: number;
  readinessScore: number;
  progressPercent: number;
  milestoneDone: number;
  teamSize: number;
  founderStrength: number;
  updatedAt: Date;
}): number {
  const recency =
    Date.now() - input.updatedAt.getTime() < 7 * 86400000
      ? 12
      : Date.now() - input.updatedAt.getTime() < 30 * 86400000
        ? 6
        : 0;
  return (
    input.followers * 2 +
    input.followersThisWeek * 8 +
    input.bookmarks * 3 +
    input.companyBookmarks * 10 +
    input.readinessScore * 0.45 +
    input.progressPercent * 0.2 +
    input.milestoneDone * 4 +
    input.teamSize * 3 +
    input.founderStrength * 0.15 +
    recency
  );
}

export function computeTrendingScore(input: {
  followersThisWeek: number;
  profileViewsEst: number;
  bookmarksThisWeek: number;
  openings: number;
  founderNetworking: number;
  progressDelta: number;
}): number {
  return (
    input.followersThisWeek * 10 +
    input.profileViewsEst * 0.5 +
    input.bookmarksThisWeek * 12 +
    input.openings * 4 +
    input.founderNetworking * 0.3 +
    input.progressDelta * 2
  );
}

export function buildHealthMetrics(input: {
  teamSize: number;
  milestoneDone: number;
  milestoneTotal: number;
  progressPercent: number;
  followerCount: number;
  openings: number;
  founderStrength: number;
  founderNetworking: number;
  updatedRecently: boolean;
}): StartupHealthMetrics {
  const milestoneRatio = input.milestoneTotal > 0 ? input.milestoneDone / input.milestoneTotal : 0;
  return {
    teamActivity: clamp(input.teamSize * 18 + milestoneRatio * 40),
    founderEngagement: clamp(input.founderStrength * 0.85 + (input.updatedRecently ? 12 : 0)),
    growthRate: clamp(input.progressPercent * 0.6 + input.followerCount * 2),
    networkingStrength: clamp(input.founderNetworking * 0.7 + input.followerCount),
    hiringActivity: clamp(input.openings * 22),
    productEvolution: clamp(milestoneRatio * 100),
    eventParticipation: clamp(input.founderNetworking * 0.4 + (input.updatedRecently ? 15 : 5)),
  };
}

export function normalizeStageLabel(stage: string | null): string {
  if (!stage) return 'Idea';
  const s = stage.toLowerCase();
  if (s.includes('revenue')) return 'Revenue Generating';
  if (s.includes('growth') || s.includes('scale')) return 'Scaling';
  if (s.includes('launch') || s.includes('beta')) return 'Beta';
  if (s.includes('mvp') || s.includes('prototype')) return 'MVP';
  if (s.includes('idea')) return 'Idea';
  return stage;
}

export function buildInterestSignals(input: {
  companyBookmarkCount: number;
  companyFollowed: boolean;
  totalBookmarks: number;
  totalFollowers: number;
  openings: number;
  mentorInterestEst: number;
}): string[] {
  const signals: string[] = [];
  if (input.companyBookmarkCount >= 3) {
    signals.push(`Saved by ${input.companyBookmarkCount} companies`);
  } else if (input.companyBookmarkCount >= 1) {
    signals.push(`${input.companyBookmarkCount} company interested`);
  }
  if (input.totalBookmarks >= 5) {
    signals.push(`Saved by ${input.totalBookmarks} ecosystem members`);
  }
  if (input.mentorInterestEst > 0) {
    signals.push(`${input.mentorInterestEst} mentor${input.mentorInterestEst > 1 ? 's' : ''} requested contact`);
  }
  if (input.totalFollowers >= 10) {
    signals.push(`${input.totalFollowers} followers tracking progress`);
  }
  if (input.openings > 0) {
    signals.push(`Actively recruiting · ${input.openings} open role${input.openings > 1 ? 's' : ''}`);
  }
  if (signals.length === 0) {
    signals.push('Early interest — follow to track momentum');
  }
  return signals.slice(0, 4);
}

export function buildActivityFeedFromStartup(
  startup: {
    id: string;
    name: string;
    updatedAt: Date;
    milestones: { label: string; status: string; date: Date | null }[];
    members: { createdAt: Date; user: { name: string | null } }[];
    openings: { createdAt: Date; role: string }[];
  },
  since: Date
): StartupActivityEvent[] {
  const events: StartupActivityEvent[] = [];
  for (const m of startup.milestones) {
    if (m.status === 'done' && m.date && m.date >= since) {
      events.push({
        id: `${startup.id}-m-${m.label}`,
        startupId: startup.id,
        startupName: startup.name,
        label: `Completed milestone: ${m.label}`,
        at: m.date.toISOString(),
        kind: 'milestone',
      });
    }
  }
  for (const mem of startup.members) {
    if (mem.createdAt >= since && !events.some((e) => e.label.includes(mem.user.name ?? ''))) {
      events.push({
        id: `${startup.id}-mem-${mem.createdAt.toISOString()}`,
        startupId: startup.id,
        startupName: startup.name,
        label: `Added team member ${mem.user.name ?? 'Founder'}`,
        at: mem.createdAt.toISOString(),
        kind: 'team',
      });
    }
  }
  for (const o of startup.openings) {
    if (o.createdAt >= since) {
      events.push({
        id: `${startup.id}-open-${o.role}`,
        startupId: startup.id,
        startupName: startup.name,
        label: `Recruiting: ${o.role}`,
        at: o.createdAt.toISOString(),
        kind: 'hiring',
      });
    }
  }
  if (startup.updatedAt >= since && events.length === 0) {
    events.push({
      id: `${startup.id}-update`,
      startupId: startup.id,
      startupName: startup.name,
      label: 'Updated startup profile and traction',
      at: startup.updatedAt.toISOString(),
      kind: 'update',
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
