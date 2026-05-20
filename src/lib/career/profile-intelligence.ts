import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type ProfileVisibility = 'private' | 'university' | 'companies' | 'public' | 'peers';

export const VISIBILITY_OPTIONS: { id: ProfileVisibility; label: string; description: string }[] = [
  { id: 'private', label: 'Private', description: 'Only you' },
  { id: 'university', label: 'University only', description: 'Your institution' },
  { id: 'companies', label: 'Companies only', description: 'Partners & recruiters' },
  { id: 'peers', label: 'Students', description: 'UniBridge peers' },
  { id: 'public', label: 'Public', description: 'Discoverable profile' },
];

export const OPEN_TO_OPTIONS = [
  { id: 'openToInternships', label: 'Open to Internships' },
  { id: 'openToNetworking', label: 'Open to Networking' },
  { id: 'openToStartup', label: 'Open to Startup Projects' },
  { id: 'openToFullTime', label: 'Open to Full-Time Opportunities' },
] as const;

export interface ProfileStrengthBreakdown {
  total: number;
  items: { id: string; label: string; score: number; max: number; tip: string }[];
  nextActions: string[];
}

export interface VerifiedBadge {
  id: string;
  label: string;
  description: string;
  verified: boolean;
  verifiedBy: string | null;
}

export interface ProfileQuickStat {
  id: string;
  label: string;
  value: string | number;
  href?: string;
  trend?: 'up' | 'stable';
}

export interface SkillSnapshot {
  id: string;
  name: string;
  level: number;
  verified: boolean;
  growth: 'fast' | 'steady' | 'new';
}

export interface ExperienceTimelineItem {
  id: string;
  kind: 'internship' | 'startup' | 'project' | 'leadership' | 'certification' | 'competition';
  title: string;
  subtitle: string | null;
  period: string;
  verified: boolean;
  href?: string;
}

export interface ProfileProject {
  id: string;
  title: string;
  description: string | null;
  linkUrl: string | null;
  fileUrl: string | null;
  tags: string[];
  visible: boolean;
}

export interface ProfileAchievement {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  earnedAt: string;
  verified: boolean;
}

export interface NetworkingOverview {
  companiesInteracted: { name: string; count: number }[];
  eventsAttended: number;
  recruitersConnected: number;
  startupCollaborators: number;
}

export interface ProfileAnalytics {
  profileViews: number;
  recruiterViews: number;
  companyInteractions: number;
  cvDownloads: number;
  compatibilityTrend: { label: string; value: number }[];
}

export interface ActivityFeedItem {
  id: string;
  label: string;
  at: string;
  kind: string;
}

export interface CareerInterests {
  industries: string[];
  roles: string[];
  goals: string[];
  dreamCompanies: string[];
}

export function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x) => typeof x === 'string') as string[];
  return [];
}

export function computeProfileStrength(input: {
  profile: StudentCareerProfile;
  hasPhoto: boolean;
  hasHeadline: boolean;
  hasBio: boolean;
  cvEntryCount: number;
  verifiedCvCount: number;
  verifiedSkills: number;
  totalSkills: number;
  projectCount: number;
  applicationCount: number;
  acceptedInternships: number;
  startupCount: number;
  certificationCount: number;
  interestsFilled: boolean;
  linkedIn: boolean;
}): ProfileStrengthBreakdown {
  const items = [
    {
      id: 'cv',
      label: 'CV completeness',
      score: Math.min(100, input.cvEntryCount * 12 + input.verifiedCvCount * 5),
      max: 100,
      tip: 'Add verified experience entries in CV Builder',
    },
    {
      id: 'skills',
      label: 'Skills & verification',
      score: Math.min(100, input.totalSkills * 8 + input.verifiedSkills * 15),
      max: 100,
      tip: 'Track and verify skills in Skills Hub',
    },
    {
      id: 'projects',
      label: 'Projects & portfolio',
      score: Math.min(100, input.projectCount * 25),
      max: 100,
      tip: 'Showcase case studies and startup work',
    },
    {
      id: 'internships',
      label: 'Internships',
      score: Math.min(100, input.applicationCount * 10 + input.acceptedInternships * 30),
      max: 100,
      tip: 'Apply and complete internship journeys',
    },
    {
      id: 'startup',
      label: 'Startup Hub',
      score: input.startupCount > 0 ? Math.min(100, 40 + input.startupCount * 30) : 0,
      max: 100,
      tip: 'Launch or join a venture in Startup Hub',
    },
    {
      id: 'profile',
      label: 'Profile quality',
      score: Math.min(
        100,
        (input.hasPhoto ? 25 : 0) +
          (input.hasHeadline ? 25 : 0) +
          (input.hasBio ? 25 : 0) +
          (input.interestsFilled ? 15 : 0) +
          (input.linkedIn ? 10 : 0)
      ),
      max: 100,
      tip: 'Complete headline, bio, and career interests',
    },
    {
      id: 'certs',
      label: 'Certifications',
      score: Math.min(100, input.certificationCount * 35),
      max: 100,
      tip: 'Add certifications to your verified CV',
    },
  ];

  const total = Math.round(items.reduce((a, i) => a + i.score, 0) / items.length);
  const nextActions: string[] = [];
  const weakest = [...items].sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 60) nextActions.push(weakest.tip);
  if (input.verifiedSkills < 3) nextActions.push('Verify at least 3 core skills from ecosystem activity');
  if (!input.hasHeadline) nextActions.push('Write an ambitious professional headline');
  if (input.applicationCount === 0) nextActions.push('Send your first opportunity application');

  return { total, items, nextActions: nextActions.slice(0, 3) };
}

export function buildVerifiedBadges(input: {
  universityLinked: boolean;
  verifiedInternships: number;
  verifiedProjects: number;
  verifiedCerts: number;
  leadershipEntries: number;
  platformValidated: boolean;
}): VerifiedBadge[] {
  return [
    {
      id: 'student',
      label: 'Verified student',
      description: 'Identity linked to your university record',
      verified: input.universityLinked,
      verifiedBy: input.universityLinked ? 'University' : null,
    },
    {
      id: 'internships',
      label: 'Verified internships',
      description: 'Completed or confirmed internship experiences',
      verified: input.verifiedInternships > 0,
      verifiedBy: input.verifiedInternships > 0 ? 'Company / Platform' : null,
    },
    {
      id: 'projects',
      label: 'Verified projects',
      description: 'Ecosystem-backed project proof',
      verified: input.verifiedProjects > 0,
      verifiedBy: input.verifiedProjects > 0 ? 'UniBridge' : null,
    },
    {
      id: 'certs',
      label: 'Verified certifications',
      description: 'Academic or professional credentials',
      verified: input.verifiedCerts > 0,
      verifiedBy: input.verifiedCerts > 0 ? 'Professor / Institution' : null,
    },
    {
      id: 'leadership',
      label: 'Verified leadership',
      description: 'Leadership roles with institutional validation',
      verified: input.leadershipEntries > 0,
      verifiedBy: input.leadershipEntries > 0 ? 'University' : null,
    },
    {
      id: 'platform',
      label: 'Platform validated',
      description: 'Active, credible UniBridge identity',
      verified: input.platformValidated,
      verifiedBy: input.platformValidated ? 'UniBridge' : null,
    },
  ];
}

export function buildAchievementsFromEcosystem(input: {
  firstApplication: boolean;
  startupCreated: boolean;
  leadershipCount: number;
  verifiedSkillCount: number;
  networkingCount: number;
  existing: ProfileAchievement[];
}): ProfileAchievement[] {
  const auto: ProfileAchievement[] = [];
  if (input.firstApplication) {
    auto.push({
      id: 'auto-first-app',
      kind: 'milestone',
      title: 'First application',
      description: 'You entered the professional pipeline',
      earnedAt: new Date().toISOString(),
      verified: true,
    });
  }
  if (input.startupCreated) {
    auto.push({
      id: 'auto-startup',
      kind: 'milestone',
      title: 'Startup created',
      description: 'Founder journey started in Startup Hub',
      earnedAt: new Date().toISOString(),
      verified: true,
    });
  }
  if (input.leadershipCount > 0) {
    auto.push({
      id: 'auto-leadership',
      kind: 'leadership',
      title: 'Leadership role',
      description: 'Demonstrated leadership in your ecosystem',
      earnedAt: new Date().toISOString(),
      verified: true,
    });
  }
  if (input.verifiedSkillCount >= 5) {
    auto.push({
      id: 'auto-skills',
      kind: 'skills',
      title: 'Verified skill cluster',
      description: 'Five or more verified skills',
      earnedAt: new Date().toISOString(),
      verified: true,
    });
  }
  if (input.networkingCount >= 3) {
    auto.push({
      id: 'auto-network',
      kind: 'networking',
      title: 'Networking milestone',
      description: 'Growing professional network',
      earnedAt: new Date().toISOString(),
      verified: true,
    });
  }

  const seen = new Set(input.existing.map((e) => e.title));
  return [...input.existing, ...auto.filter((a) => !seen.has(a.title))];
}

export function buildActivityFeed(events: {
  label: string;
  at: Date;
  kind: string;
}[]): ActivityFeedItem[] {
  return events
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)
    .map((e, i) => ({
      id: `act-${i}`,
      label: e.label,
      at: e.at.toISOString(),
      kind: e.kind,
    }));
}

export function studentAgeFromYear(yearOfStudy: number | null, overrideAge: number | null): number {
  if (overrideAge != null && overrideAge >= 16 && overrideAge <= 40) return overrideAge;
  return Math.min(28, Math.max(18, 18 + (yearOfStudy ?? 2)));
}
