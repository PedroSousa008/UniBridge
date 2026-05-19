import { MILESTONE_TEMPLATES } from './constants';

type StartupForScore = {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  industry: string | null;
  stage: string | null;
  website: string | null;
  problem: string | null;
  targetCustomer: string | null;
  solution: string | null;
  differentiator: string | null;
  businessModelText: string | null;
  visionOneLiner: string | null;
  targetMarket: string | null;
  members: { length: number } | unknown[];
  media: { length: number } | unknown[];
  milestones: { status: string }[];
  tractionMetrics: { value: string | null }[];
  openings: { length: number } | unknown[];
};

export function computeStartupReadiness(startup: StartupForScore) {
  let score = 0;
  const checks: { label: string; done: boolean; weight: number }[] = [
    {
      label: 'Identity complete',
      done: !!(startup.name && startup.tagline && startup.industry && startup.stage),
      weight: 12,
    },
    {
      label: 'Visual brand',
      done: !!(startup.logoUrl || startup.coverUrl),
      weight: 8,
    },
    {
      label: 'Team listed',
      done: Array.isArray(startup.members) && startup.members.length >= 1,
      weight: 12,
    },
    {
      label: 'Problem & solution clear',
      done: !!(startup.problem && startup.solution && startup.targetCustomer),
      weight: 18,
    },
    {
      label: 'Differentiation',
      done: !!(startup.differentiator && startup.visionOneLiner),
      weight: 10,
    },
    {
      label: 'Pitch materials',
      done: Array.isArray(startup.media) && startup.media.length >= 1,
      weight: 15,
    },
    {
      label: 'Market clarity',
      done: !!(startup.targetMarket && startup.businessModelText),
      weight: 10,
    },
    {
      label: 'Traction data',
      done:
        Array.isArray(startup.tractionMetrics) &&
        startup.tractionMetrics.some((t) => t.value),
      weight: 10,
    },
    {
      label: 'Milestones progress',
      done:
        Array.isArray(startup.milestones) &&
        startup.milestones.filter((m) => m.status === 'completed').length >= 2,
      weight: 10,
    },
    {
      label: 'Open roles defined',
      done: Array.isArray(startup.openings) && startup.openings.length >= 1,
      weight: 5,
    },
  ];

  for (const c of checks) {
    if (c.done) score += c.weight;
  }

  const completedMilestones = Array.isArray(startup.milestones)
    ? startup.milestones.filter((m) => m.status === 'completed').length
    : 0;
  const progressPercent = Math.round(
    (completedMilestones / MILESTONE_TEMPLATES.length) * 100
  );

  return {
    readinessScore: Math.min(100, score),
    progressPercent,
    checks,
  };
}

export async function syncStartupScores(
  prisma: {
    startup: {
      update: (args: {
        where: { id: string };
        data: { readinessScore: number; progressPercent: number };
      }) => Promise<unknown>;
    };
  },
  startupId: string,
  data: StartupForScore
) {
  const { readinessScore, progressPercent } = computeStartupReadiness(data);
  await prisma.startup.update({
    where: { id: startupId },
    data: { readinessScore, progressPercent },
  });
  return { readinessScore, progressPercent };
}

export type StartupPayload = {
  identity?: Record<string, unknown>;
  pitch?: Record<string, unknown>;
  business?: Record<string, unknown>;
  market?: Record<string, unknown>;
  visibility?: Record<string, string>;
  media?: { type: string; title?: string; url: string }[];
  milestones?: {
    key: string;
    label: string;
    status: string;
    date?: string;
    proofUrl?: string;
    notes?: string;
  }[];
  traction?: { metricKey: string; label: string; value?: string; isPrivate?: boolean }[];
  openings?: {
    role: string;
    description?: string;
    skillsRequired?: string[];
    timeCommitment?: string;
    compensation?: string;
  }[];
  members?: {
    id?: string;
    userId?: string;
    email?: string;
    role: string;
    photoUrl?: string;
    course?: string;
    yearOfStudy?: number;
    linkedIn?: string;
    bio?: string;
    ownershipPercent?: number;
    ownershipPrivate?: boolean;
    isMainFounder?: boolean;
  }[];
};
