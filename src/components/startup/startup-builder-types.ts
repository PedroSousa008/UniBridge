import { MILESTONE_TEMPLATES, TRACTION_METRICS } from '@/lib/startups/constants';

export interface BuilderMember {
  userId?: string;
  email?: string;
  name?: string;
  role: string;
  photoUrl?: string;
  course?: string;
  yearOfStudy?: number;
  linkedIn?: string;
  bio?: string;
  ownershipPercent?: number;
  ownershipPrivate?: boolean;
  isMainFounder?: boolean;
}

export interface BuilderState {
  identity: {
    name: string;
    tagline: string;
    logoUrl: string;
    coverUrl: string;
    website: string;
    linkedIn: string;
    instagram: string;
    twitter: string;
    contactEmail: string;
    industry: string;
    stage: string;
    foundedAt: string;
  };
  pitch: {
    problem: string;
    targetCustomer: string;
    solution: string;
    whyNow: string;
    differentiator: string;
    businessModel: string;
    vision: string;
  };
  business: {
    revenueModels: string[];
    expectedPricing: string;
    targetCustomers: string;
    revenueGoal: string;
    monetizationStage: string;
  };
  market: {
    targetMarket: string;
    marketSize: string;
    competitors: string;
    alternatives: string;
  };
  visibility: Record<string, string>;
  media: { type: string; title: string; url: string }[];
  milestones: {
    key: string;
    label: string;
    status: string;
    date: string;
    proofUrl: string;
    notes: string;
  }[];
  traction: {
    metricKey: string;
    label: string;
    value: string;
    isPrivate: boolean;
  }[];
  openings: {
    role: string;
    description: string;
    skillsRequired: string;
    timeCommitment: string;
    compensation: string;
  }[];
  members: BuilderMember[];
  readinessScore: number;
}

export function defaultBuilderState(partial?: Partial<BuilderState>): BuilderState {
  return {
    identity: {
      name: '',
      tagline: '',
      logoUrl: '',
      coverUrl: '',
      website: '',
      linkedIn: '',
      instagram: '',
      twitter: '',
      contactEmail: '',
      industry: '',
      stage: 'Idea',
      foundedAt: '',
      ...partial?.identity,
    },
    pitch: {
      problem: '',
      targetCustomer: '',
      solution: '',
      whyNow: '',
      differentiator: '',
      businessModel: '',
      vision: '',
      ...partial?.pitch,
    },
    business: {
      revenueModels: [],
      expectedPricing: '',
      targetCustomers: '',
      revenueGoal: '',
      monetizationStage: '',
      ...partial?.business,
    },
    market: {
      targetMarket: '',
      marketSize: '',
      competitors: '',
      alternatives: '',
      ...partial?.market,
    },
    visibility: { default: 'PUBLIC', traction: 'TEAM', ...partial?.visibility },
    media: partial?.media ?? [],
    milestones:
      partial?.milestones ??
      MILESTONE_TEMPLATES.map((m) => ({
        key: m.key,
        label: m.label,
        status: 'pending',
        date: '',
        proofUrl: '',
        notes: '',
      })),
    traction:
      partial?.traction ??
      TRACTION_METRICS.map((m) => ({
        metricKey: m.key,
        label: m.label,
        value: '',
        isPrivate: ['revenue', 'mrr'].includes(m.key),
      })),
    openings: partial?.openings ?? [],
    members: partial?.members ?? [],
    readinessScore: partial?.readinessScore ?? 0,
  };
}
