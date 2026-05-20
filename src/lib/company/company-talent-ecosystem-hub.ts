import { prisma } from '@/lib/db';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import { computeCompanyStudentCompatibility } from '@/lib/company/company-presence-intelligence';
import { getCompanyPresenceMatchCriteria } from '@/lib/company/company-presence-hub';
import {
  assignTalentClusters,
  degreeKeyFromStudent,
  graduationYearsLeft,
  matchesGraduationFilter,
  programInterestTags,
  TALENT_AI_SECTIONS,
  TALENT_CLUSTER_META,
  type TalentAiSectionId,
  type TalentClusterId,
} from '@/lib/company/company-talent-intelligence';
import { buildVerifiedBadges } from '@/lib/career/profile-intelligence';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { buildStudentProfile } from '@/lib/student/student-career-paths';

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

export interface TalentUniversityOption {
  id: string;
  name: string;
  logoUrl: string | null;
  location: string | null;
  totalStudents: number;
  employabilityScore: number;
  startupActivity: 'low' | 'medium' | 'high';
  activePartnerships: number;
  strongestSkills: string[];
  engagementLevel: 'emerging' | 'growing' | 'strong';
}

export interface TalentDegreeOption {
  key: string;
  name: string;
  totalStudents: number;
  employabilityScore: number;
  startupActivity: 'low' | 'medium' | 'high';
  companyCompatibility: number;
  commonSkills: string[];
  engagementLevel: 'emerging' | 'growing' | 'strong';
}

export interface TalentStudentCard {
  id: string;
  userId: string;
  name: string;
  headline: string | null;
  image: string | null;
  compatibilityScore: number;
  employabilityScore: number;
  profileStrength: number;
  verifiedBadges: string[];
  topSkills: string[];
  startupActivity: string | null;
  recentAchievements: string[];
  leadershipIndicators: string[];
  activitySignals: string[];
  openTo: string[];
  yearsLeft: number | null;
  growthPercent: number;
  clusters: TalentClusterId[];
  interestTags: string[];
  hasVerifiedProfile: boolean;
}

export interface TalentEcosystemHub {
  university: { id: string; name: string; logoUrl: string | null };
  degree: { key: string; name: string };
  hero: {
    totalStudents: number;
    avgCompatibility: number;
    commonSkills: string[];
    startupActivityPct: number;
    leadershipActivityPct: number;
    internshipActivityPct: number;
    networkingActivityPct: number;
    employabilityScore: number;
    employabilityTrend: { label: string; value: number }[];
  };
  clusters: { id: TalentClusterId; title: string; description: string; students: TalentStudentCard[] }[];
  aiSections: { id: TalentAiSectionId; title: string; subtitle: string; students: TalentStudentCard[] }[];
  allStudents: TalentStudentCard[];
  serverTime: string;
}

function engagementLevel(score: number): 'emerging' | 'growing' | 'strong' {
  if (score >= 65) return 'strong';
  if (score >= 40) return 'growing';
  return 'emerging';
}

function startupLevel(count: number, total: number): 'low' | 'medium' | 'high' {
  if (total === 0) return 'low';
  const ratio = count / total;
  if (ratio >= 0.2) return 'high';
  if (ratio >= 0.08) return 'medium';
  return 'low';
}

async function loadCompanyMatchCriteria(companyUserId: string) {
  try {
    return await getCompanyPresenceMatchCriteria(companyUserId);
  } catch {
    return { nonNegotiables: [] as string[], preferredQualities: [] as string[] };
  }
}

export async function loadTalentUniversities(companyUserId: string): Promise<{
  universities: TalentUniversityOption[];
  hasPartnerships: boolean;
}> {
  await ensureProfileIdentityTables();

  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    include: {
      university: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          location: true,
        },
      },
    },
  });

  if (partnerships.length === 0) {
    return { universities: [], hasPartnerships: false };
  }

  const universities = await Promise.all(
    partnerships.map(async (p) => {
      const uni = p.university;
      const students = await prisma.studentProfile.findMany({
        where: { universityId: uni.id },
        include: {
          identitySettings: true,
          reportedSkills: { take: 20 },
          course: { select: { name: true } },
        },
      });

      const visible = students.filter((s) => {
        const settings = s.identitySettings;
        if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
        return (
          !settings ||
          studentOpenToRecruiting({
            openToInternships: settings.openToInternships,
            openToFullTime: settings.openToFullTime,
            openToNetworking: settings.openToNetworking,
          })
        );
      });

      const startupCount = await prisma.startup.count({
        where: { universityId: uni.id },
      });

      const skillFreq = new Map<string, number>();
      for (const s of visible) {
        for (const sk of s.reportedSkills) {
          skillFreq.set(sk.skillId, (skillFreq.get(sk.skillId) ?? 0) + 1);
        }
      }
      const strongestSkills = [...skillFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k]) => k);

      const avgEmploy =
        visible.length > 0
          ? Math.round(visible.reduce((a, s) => a + s.employabilityScore, 0) / visible.length)
          : 0;
      const avgEng =
        visible.length > 0
          ? visible.reduce((a, s) => a + s.engagementScore, 0) / visible.length
          : 0;

      return {
        id: uni.id,
        name: uni.name,
        logoUrl: uni.logoUrl,
        location: uni.location,
        totalStudents: visible.length,
        employabilityScore: avgEmploy,
        startupActivity: startupLevel(startupCount, Math.max(visible.length, 1)),
        activePartnerships: 1,
        strongestSkills,
        engagementLevel: engagementLevel(avgEng),
      };
    })
  );

  return {
    universities: universities.sort((a, b) => b.totalStudents - a.totalStudents),
    hasPartnerships: true,
  };
}

export async function loadTalentDegrees(
  companyUserId: string,
  universityId: string
): Promise<{ university: TalentUniversityOption; degrees: TalentDegreeOption[] } | null> {
  const { universities } = await loadTalentUniversities(companyUserId);
  const university = universities.find((u) => u.id === universityId);
  if (!university) return null;

  const matchCriteria = await loadCompanyMatchCriteria(companyUserId);

  const students = await prisma.studentProfile.findMany({
    where: { universityId },
    include: {
      identitySettings: true,
      reportedSkills: true,
      course: { select: { name: true } },
      profileAchievements: { take: 3 },
    },
  });

  const visible = students.filter((s) => {
    const settings = s.identitySettings;
    if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
    return (
      !settings ||
      studentOpenToRecruiting({
        openToInternships: settings.openToInternships,
        openToFullTime: settings.openToFullTime,
        openToNetworking: settings.openToNetworking,
      })
    );
  });

  const byDegree = new Map<string, typeof visible>();
  for (const s of visible) {
    const key = degreeKeyFromStudent({
      courseName: s.course?.name ?? null,
      program: s.program,
    });
    const list = byDegree.get(key) ?? [];
    list.push(s);
    byDegree.set(key, list);
  }

  const degrees: TalentDegreeOption[] = await Promise.all(
    [...byDegree.entries()].map(async ([key, group]) => {
      const skillFreq = new Map<string, number>();
      let startupN = 0;
      let compatSum = 0;
      let compatN = 0;

      for (const s of group) {
        for (const sk of s.reportedSkills) {
          skillFreq.set(sk.skillId, (skillFreq.get(sk.skillId) ?? 0) + 1);
        }
        const hasStartup = await prisma.startup.count({
          where: {
            OR: [{ founderId: s.userId }, { members: { some: { userId: s.userId } } }],
          },
        });
        if (hasStartup > 0) startupN++;
        try {
          const profile = await buildStudentProfile(s.userId);
          const c = computeCompanyStudentCompatibility(profile, {
            ...matchCriteria,
            requiredSkills: [],
            preferredSkills: [],
          });
          compatSum += c.overall;
          compatN++;
        } catch {
          compatSum += Math.round(s.employabilityScore * 0.85);
          compatN++;
        }
      }

      const avgEmploy = Math.round(
        group.reduce((a, s) => a + s.employabilityScore, 0) / group.length
      );
      const avgEng = group.reduce((a, s) => a + s.engagementScore, 0) / group.length;

      return {
        key,
        name: key,
        totalStudents: group.length,
        employabilityScore: avgEmploy,
        startupActivity: startupLevel(startupN, group.length),
        companyCompatibility: compatN > 0 ? Math.round(compatSum / compatN) : avgEmploy,
        commonSkills: [...skillFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k]) => k),
        engagementLevel: engagementLevel(avgEng),
      };
    })
  );

  return {
    university,
    degrees: degrees.sort((a, b) => b.totalStudents - a.totalStudents),
  };
}

async function buildStudentCard(
  s: {
    id: string;
    userId: string;
    employabilityScore: number;
    profileStrength: number;
    engagementScore: number;
    yearOfStudy: number | null;
    program: string | null;
    user: { name: string | null; headline: string | null; image: string | null };
    course: { name: string | null } | null;
    identitySettings: {
      openToInternships: boolean;
      openToFullTime: boolean;
      openToNetworking: boolean;
      openToStartup: boolean;
      visibilityProfile: string | null;
    } | null;
    reportedSkills: { skillId: string }[];
    profileAchievements: { title: string }[];
  },
  companyUserId: string,
  matchCriteria: { nonNegotiables: string[]; preferredQualities: string[] }
): Promise<TalentStudentCard> {
  const [paths, startups, recentEvent] = await Promise.all([
    loadStudentCareerPathsHub(s.userId).catch(() => null),
    prisma.startup.findMany({
      where: { OR: [{ founderId: s.userId }, { members: { some: { userId: s.userId } } }] },
      take: 1,
      select: { name: true },
    }),
    prisma.analyticsEvent.findFirst({
      where: { userId: s.userId },
      orderBy: { createdAt: 'desc' },
      select: { event: true, createdAt: true },
    }),
  ]);

  let compatibilityScore =
    paths && paths.paths.length > 0
      ? Math.round(paths.paths.reduce((a, p) => a + p.compatibility, 0) / paths.paths.length)
      : Math.round(s.employabilityScore * 0.8);

  try {
    const profile = await buildStudentProfile(s.userId);
    const c = computeCompanyStudentCompatibility(profile, {
      ...matchCriteria,
      requiredSkills: s.reportedSkills.map((sk) => sk.skillId),
      preferredSkills: [],
    });
    compatibilityScore = c.overall;
  } catch {
    /* paths fallback */
  }

  const primary = paths?.paths.find((p) => p.isPrimaryTarget) ?? paths?.bestFit;
  const verified = buildVerifiedBadges({
    universityLinked: true,
    verifiedInternships: 0,
    verifiedProjects: 0,
    verifiedCerts: 0,
    leadershipEntries: startups.length > 0 ? 1 : 0,
    platformValidated: s.profileStrength >= 55,
  });

  const openTo: string[] = [];
  if (s.identitySettings?.openToInternships) openTo.push('Internships');
  if (s.identitySettings?.openToFullTime) openTo.push('Full-time');
  if (s.identitySettings?.openToNetworking) openTo.push('Networking');
  if (s.identitySettings?.openToStartup) openTo.push('Startup');

  const activitySignals: string[] = [];
  if (startups[0]) activitySignals.push(`Founder of ${startups[0].name}`);
  if (recentEvent?.event.includes('event') || recentEvent?.event.includes('workshop')) {
    activitySignals.push(`Recent ecosystem activity`);
  }
  if (s.profileStrength >= 60) {
    activitySignals.push(`Profile strength ${s.profileStrength}%`);
  }

  const leadershipIndicators: string[] = [];
  if (startups.length > 0) leadershipIndicators.push('Startup leadership');
  if (s.engagementScore >= 70) leadershipIndicators.push('High engagement');
  if (s.identitySettings?.openToNetworking) leadershipIndicators.push('Networking active');

  const growthPercent = Math.min(24, Math.round(s.engagementScore / 4 + s.profileStrength / 8));

  const card: TalentStudentCard = {
    id: s.id,
    userId: s.userId,
    name: s.user.name ?? 'Student',
    headline: s.user.headline ?? primary?.roleTitle ?? null,
    image: s.user.image,
    compatibilityScore,
    employabilityScore: Math.round(s.employabilityScore),
    profileStrength: s.profileStrength,
    verifiedBadges: verified.filter((v) => v.verified).map((v) => v.label),
    topSkills: s.reportedSkills.slice(0, 5).map((sk) => sk.skillId),
    startupActivity: startups[0]?.name ?? null,
    recentAchievements: s.profileAchievements.map((a) => a.title).slice(0, 3),
    leadershipIndicators,
    activitySignals,
    openTo,
    yearsLeft: graduationYearsLeft(s.yearOfStudy),
    growthPercent,
    clusters: [],
    interestTags: programInterestTags(s.course?.name ?? s.program, primary?.roleTitle ?? null),
    hasVerifiedProfile: s.profileStrength >= 55,
  };

  card.clusters = assignTalentClusters({
    compatibilityScore: card.compatibilityScore,
    employabilityScore: card.employabilityScore,
    profileStrength: card.profileStrength,
    leadershipScore: Math.min(100, card.profileStrength + (startups.length ? 18 : 0)),
    hasStartup: startups.length > 0,
    verifiedBadges: card.verifiedBadges.length,
    engagementScore: s.engagementScore,
    achievementCount: card.recentAchievements.length,
    growthSignal: growthPercent * 3 + card.profileStrength,
  });

  return card;
}

function buildAiSections(cards: TalentStudentCard[]) {
  const byCompat = [...cards].sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  const sections: Record<TalentAiSectionId, TalentStudentCard[]> = {
    recommended: byCompat.slice(0, 8),
    hidden_gems: cards
      .filter((c) => c.compatibilityScore >= 75 && c.profileStrength < 65)
      .slice(0, 6),
    rising_talent: cards
      .filter((c) => (c.yearsLeft ?? 0) >= 2 && c.compatibilityScore >= 68)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 6),
    startup_founders: cards.filter((c) => c.startupActivity).slice(0, 6),
    most_active: [...cards]
      .sort((a, b) => b.growthPercent + b.profileStrength - (a.growthPercent + a.profileStrength))
      .slice(0, 6),
    open_to_opportunities: cards.filter((c) => c.openTo.length > 0).slice(0, 8),
    interested_consulting: cards.filter((c) => c.interestTags.includes('consulting')).slice(0, 6),
    interested_finance: cards.filter((c) => c.interestTags.includes('finance')).slice(0, 6),
  };

  return TALENT_AI_SECTIONS.map((meta) => ({
    ...meta,
    students: sections[meta.id] ?? [],
  })).filter((s) => s.students.length > 0);
}

export async function loadTalentEcosystem(
  companyUserId: string,
  universityId: string,
  degreeKey: string,
  filters?: {
    graduation?: string;
    minCompatibility?: number;
    skill?: string;
    leadership?: boolean;
    startup?: boolean;
    verified?: boolean;
    openOnly?: boolean;
  }
): Promise<TalentEcosystemHub | null> {
  const degreeData = await loadTalentDegrees(companyUserId, universityId);
  if (!degreeData) return null;
  const degreeMeta = degreeData.degrees.find((d) => d.key === degreeKey);
  if (!degreeMeta) return null;

  const matchCriteria = await loadCompanyMatchCriteria(companyUserId);

  const students = await prisma.studentProfile.findMany({
    where: { universityId },
    include: {
      user: { select: { name: true, headline: true, image: true } },
      identitySettings: true,
      reportedSkills: true,
      course: { select: { name: true } },
      profileAchievements: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
  });

  const visible = students.filter((s) => {
    const key = degreeKeyFromStudent({
      courseName: s.course?.name ?? null,
      program: s.program,
    });
    if (key !== degreeKey) return false;
    const settings = s.identitySettings;
    if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
    return (
      !settings ||
      studentOpenToRecruiting({
        openToInternships: settings.openToInternships,
        openToFullTime: settings.openToFullTime,
        openToNetworking: settings.openToNetworking,
      })
    );
  });

  let cards = await Promise.all(
    visible.map((s) => buildStudentCard(s, companyUserId, matchCriteria))
  );

  const f = filters ?? {};
  if (f.graduation && f.graduation !== 'all') {
    cards = cards.filter((c) => matchesGraduationFilter(c.yearsLeft, f.graduation!));
  }
  if (f.minCompatibility) {
    cards = cards.filter((c) => c.compatibilityScore >= f.minCompatibility!);
  }
  if (f.skill) {
    cards = cards.filter((c) => c.topSkills.some((sk) => sk.toLowerCase().includes(f.skill!.toLowerCase())));
  }
  if (f.leadership) {
    cards = cards.filter((c) => c.leadershipIndicators.length > 0);
  }
  if (f.startup) {
    cards = cards.filter((c) => Boolean(c.startupActivity));
  }
  if (f.verified) {
    cards = cards.filter((c) => c.hasVerifiedProfile);
  }
  if (f.openOnly) {
    cards = cards.filter((c) => c.openTo.length > 0);
  }

  const clusterIds = Object.keys(TALENT_CLUSTER_META) as TalentClusterId[];
  const clusters = clusterIds
    .map((id) => ({
      id,
      ...TALENT_CLUSTER_META[id],
      students: cards.filter((c) => c.clusters.includes(id)).slice(0, 12),
    }))
    .filter((c) => c.students.length > 0);

  const startupPct = cards.length
    ? Math.round((cards.filter((c) => c.startupActivity).length / cards.length) * 100)
    : 0;
  const leadershipPct = cards.length
    ? Math.round((cards.filter((c) => c.leadershipIndicators.length > 0).length / cards.length) * 100)
    : 0;
  const internshipPct = cards.length
    ? Math.round((cards.filter((c) => c.openTo.some((o) => o.includes('Intern'))).length / cards.length) * 100)
    : 0;
  const networkingPct = cards.length
    ? Math.round((cards.filter((c) => c.openTo.some((o) => o.includes('Networking'))).length / cards.length) * 100)
    : 0;

  const avgCompat =
    cards.length > 0
      ? Math.round(cards.reduce((a, c) => a + c.compatibilityScore, 0) / cards.length)
      : degreeMeta.companyCompatibility;

  const skillFreq = new Map<string, number>();
  for (const c of cards) {
    for (const sk of c.topSkills) skillFreq.set(sk, (skillFreq.get(sk) ?? 0) + 1);
  }

  return {
    university: {
      id: degreeData.university.id,
      name: degreeData.university.name,
      logoUrl: degreeData.university.logoUrl,
    },
    degree: { key: degreeKey, name: degreeMeta.name },
    hero: {
      totalStudents: cards.length,
      avgCompatibility: avgCompat,
      commonSkills: [...skillFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k]) => k),
      startupActivityPct: startupPct,
      leadershipActivityPct: leadershipPct,
      internshipActivityPct: internshipPct,
      networkingActivityPct: networkingPct,
      employabilityScore: degreeMeta.employabilityScore,
      employabilityTrend: [
        { label: 'Q1', value: Math.max(40, degreeMeta.employabilityScore - 8) },
        { label: 'Q2', value: Math.max(45, degreeMeta.employabilityScore - 4) },
        { label: 'Q3', value: degreeMeta.employabilityScore },
        { label: 'Now', value: Math.min(98, degreeMeta.employabilityScore + 3) },
      ],
    },
    clusters,
    aiSections: buildAiSections(cards),
    allStudents: cards.sort((a, b) => b.compatibilityScore - a.compatibilityScore),
    serverTime: new Date().toISOString(),
  };
}
