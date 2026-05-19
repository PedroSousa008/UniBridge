import { MILESTONE_TEMPLATES, TRACTION_METRICS } from './constants';
import type { BuilderState } from '@/components/startup/startup-builder-types';

type StartupFull = {
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  linkedIn: string | null;
  instagram: string | null;
  twitter: string | null;
  contactEmail: string | null;
  industry: string | null;
  stage: string | null;
  foundedAt: Date | null;
  problem: string | null;
  targetCustomer: string | null;
  solution: string | null;
  whyNow: string | null;
  differentiator: string | null;
  businessModelText: string | null;
  visionOneLiner: string | null;
  revenueModels: string[];
  expectedPricing: string | null;
  targetCustomersBm: string | null;
  revenueGoal: string | null;
  monetizationStage: string | null;
  targetMarket: string | null;
  marketSizeEstimate: string | null;
  competitors: string | null;
  currentAlternatives: string | null;
  sectionVisibility: unknown;
  readinessScore: number;
  members: {
    userId: string;
    role: string;
    photoUrl: string | null;
    course: string | null;
    yearOfStudy: number | null;
    linkedIn: string | null;
    bio: string | null;
    ownershipPercent: number | null;
    ownershipPrivate: boolean;
    isMainFounder: boolean;
    user: { name: string | null; email: string };
  }[];
  media: { type: string; title: string | null; url: string }[];
  milestones: {
    key: string;
    label: string;
    status: string;
    date: Date | null;
    proofUrl: string | null;
    notes: string | null;
  }[];
  tractionMetrics: {
    metricKey: string;
    label: string;
    value: string | null;
    isPrivate: boolean;
  }[];
  openings: {
    role: string;
    description: string | null;
    skillsRequired: string[];
    timeCommitment: string | null;
    compensation: string | null;
  }[];
};

export function mapStartupToBuilder(startup: StartupFull): Partial<BuilderState> {
  const visibility =
    startup.sectionVisibility && typeof startup.sectionVisibility === 'object'
      ? (startup.sectionVisibility as Record<string, string>)
      : {};

  return {
    identity: {
      name: startup.name,
      tagline: startup.tagline ?? '',
      logoUrl: startup.logoUrl ?? '',
      coverUrl: startup.coverUrl ?? '',
      website: startup.website ?? '',
      linkedIn: startup.linkedIn ?? '',
      instagram: startup.instagram ?? '',
      twitter: startup.twitter ?? '',
      contactEmail: startup.contactEmail ?? '',
      industry: startup.industry ?? '',
      stage: startup.stage ?? 'Idea',
      foundedAt: startup.foundedAt
        ? startup.foundedAt.toISOString().slice(0, 10)
        : '',
    },
    pitch: {
      problem: startup.problem ?? '',
      targetCustomer: startup.targetCustomer ?? '',
      solution: startup.solution ?? '',
      whyNow: startup.whyNow ?? '',
      differentiator: startup.differentiator ?? '',
      businessModel: startup.businessModelText ?? '',
      vision: startup.visionOneLiner ?? '',
    },
    business: {
      revenueModels: startup.revenueModels ?? [],
      expectedPricing: startup.expectedPricing ?? '',
      targetCustomers: startup.targetCustomersBm ?? '',
      revenueGoal: startup.revenueGoal ?? '',
      monetizationStage: startup.monetizationStage ?? '',
    },
    market: {
      targetMarket: startup.targetMarket ?? '',
      marketSize: startup.marketSizeEstimate ?? '',
      competitors: startup.competitors ?? '',
      alternatives: startup.currentAlternatives ?? '',
    },
    visibility: { default: 'PUBLIC', traction: 'TEAM', ...visibility },
    media: startup.media.map((m) => ({
      type: m.type,
      title: m.title ?? '',
      url: m.url,
    })),
    milestones:
      startup.milestones.length > 0
        ? startup.milestones.map((m) => ({
            key: m.key,
            label: m.label,
            status: m.status,
            date: m.date ? m.date.toISOString().slice(0, 10) : '',
            proofUrl: m.proofUrl ?? '',
            notes: m.notes ?? '',
          }))
        : MILESTONE_TEMPLATES.map((m) => ({
            key: m.key,
            label: m.label,
            status: 'pending',
            date: '',
            proofUrl: '',
            notes: '',
          })),
    traction:
      startup.tractionMetrics.length > 0
        ? startup.tractionMetrics.map((t) => ({
            metricKey: t.metricKey,
            label: t.label,
            value: t.value ?? '',
            isPrivate: t.isPrivate,
          }))
        : TRACTION_METRICS.map((m) => ({
            metricKey: m.key,
            label: m.label,
            value: '',
            isPrivate: ['revenue', 'mrr'].includes(m.key),
          })),
    openings: startup.openings.map((o) => ({
      role: o.role,
      description: o.description ?? '',
      skillsRequired: o.skillsRequired.join(', '),
      timeCommitment: o.timeCommitment ?? '',
      compensation: o.compensation ?? '',
    })),
    members: startup.members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name ?? undefined,
      role: m.role,
      photoUrl: m.photoUrl ?? undefined,
      course: m.course ?? undefined,
      yearOfStudy: m.yearOfStudy ?? undefined,
      linkedIn: m.linkedIn ?? undefined,
      bio: m.bio ?? undefined,
      ownershipPercent: m.ownershipPercent ?? undefined,
      ownershipPrivate: m.ownershipPrivate,
      isMainFounder: m.isMainFounder,
    })),
    readinessScore: startup.readinessScore,
  };
}
