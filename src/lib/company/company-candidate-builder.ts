import { prisma } from '@/lib/db';
import { buildVerifiedBadges, parseJsonArray } from '@/lib/career/profile-intelligence';
import { computeCompanyStudentCompatibility } from '@/lib/company/company-presence-intelligence';
import { getCompanyPresenceMatchCriteria } from '@/lib/company/company-presence-hub';
import {
  computePipelineAiLabels,
  type PipelineAiLabel,
  type PipelineTimelineEvent,
} from '@/lib/company/company-pipeline-intelligence';
import { programInterestTags } from '@/lib/company/company-talent-intelligence';
import { loadStudentCareerPathsHub, buildStudentProfile } from '@/lib/student/student-career-paths';

export interface CompanyCandidateCard {
  studentUserId: string;
  studentProfileId: string;
  name: string;
  image: string | null;
  headline: string | null;
  universityName: string;
  program: string | null;
  graduationYear: number | null;
  compatibilityScore: number | null;
  employabilityScore: number;
  profileStrength: number;
  verifiedBadges: string[];
  topSkills: string[];
  startupInvolvement: string | null;
  leadershipScore: number;
  languages: string[];
  recentActivity: string | null;
  availability: string[];
  aiLabels: PipelineAiLabel[];
}

export interface PipelineCandidateProfile extends CompanyCandidateCard {
  academicYear: string | null;
  growthPercent: number;
  networkingScore: number;
  interestTags: string[];
  ecosystemSignals: string[];
  eventParticipation: string[];
  timeline: PipelineTimelineEvent[];
}

function academicYearLabel(yearOfStudy: number | null): string | null {
  if (!yearOfStudy) return null;
  if (yearOfStudy <= 1) return '1st year';
  if (yearOfStudy === 2) return '2nd year';
  if (yearOfStudy === 3) return '3rd year';
  if (yearOfStudy === 4) return '4th year';
  return `${yearOfStudy}th year`;
}

export async function buildCompanyCandidateCard(
  studentUserId: string,
  companyUserId: string
): Promise<PipelineCandidateProfile | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    include: {
      user: { select: { name: true, headline: true, image: true } },
      university: { select: { name: true } },
      course: { select: { name: true } },
      identitySettings: true,
      reportedSkills: { take: 8 },
      profileAchievements: { orderBy: { earnedAt: 'desc' }, take: 4 },
    },
  });
  if (!student) return null;

  const companyEvents = await prisma.companyEvent.findMany({
    where: { companyUserId, status: 'approved' },
    select: { id: true, title: true },
    take: 20,
  });
  const eventIds = companyEvents.map((e) => e.id);

  const [paths, startups, recentApp, eventRsvps, recentAnalytics] = await Promise.all([
    loadStudentCareerPathsHub(studentUserId).catch(() => null),
    prisma.startup.findMany({
      where: { OR: [{ founderId: studentUserId }, { members: { some: { userId: studentUserId } } }] },
      take: 2,
      select: { name: true, stage: true, createdAt: true },
    }),
    prisma.internshipApplication.findFirst({
      where: { studentId: student.id, internship: { companyUserId } },
      orderBy: { updatedAt: 'desc' },
      include: { internship: { select: { title: true } } },
    }),
    eventIds.length > 0
      ? prisma.companyEventRsvp.findMany({
          where: { studentUserId, eventId: { in: eventIds }, status: 'rsvp' },
          take: 3,
        })
      : Promise.resolve([]),
    prisma.analyticsEvent.findMany({
      where: { userId: studentUserId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { event: true, createdAt: true },
    }),
  ]);

  let compatibilityScore =
    paths && paths.paths.length > 0
      ? Math.round(paths.paths.reduce((a, p) => a + p.compatibility, 0) / paths.paths.length)
      : null;

  try {
    const criteria = await getCompanyPresenceMatchCriteria(companyUserId);
    const profile = await buildStudentProfile(studentUserId);
    const c = computeCompanyStudentCompatibility(profile, {
      ...criteria,
      requiredSkills: student.reportedSkills.map((s) => s.skillId),
      preferredSkills: [],
    });
    compatibilityScore = c.overall;
  } catch {
    /* keep paths-based score */
  }

  const primary = paths?.paths.find((p) => p.isPrimaryTarget) ?? paths?.bestFit;
  const verified = buildVerifiedBadges({
    universityLinked: Boolean(student.universityId),
    verifiedInternships:
      recentApp && ['accepted', 'hired', 'completed'].includes(recentApp.status.toLowerCase()) ? 1 : 0,
    verifiedProjects: 0,
    verifiedCerts: student.profileAchievements.length,
    leadershipEntries: startups.length > 0 ? 1 : 0,
    platformValidated: student.profileStrength >= 55,
  });

  const settings = student.identitySettings;
  const availability: string[] = [];
  if (settings?.openToInternships) availability.push('Open to internships');
  if (settings?.openToFullTime) availability.push('Open to full-time');
  if (settings?.openToNetworking) availability.push('Open to networking');
  if (settings?.openToStartup) availability.push('Open to startup');

  const graduationYear = student.yearOfStudy
    ? new Date().getFullYear() + Math.max(0, 4 - student.yearOfStudy)
    : null;

  const growthPercent = Math.min(
    28,
    Math.round(student.engagementScore / 4 + student.profileStrength / 10 + (startups.length ? 6 : 0))
  );

  const networkingScore = Math.min(
    100,
    Math.round(
      (settings?.openToNetworking ? 25 : 0) +
        eventRsvps.length * 18 +
        student.engagementScore * 0.35
    )
  );

  const eventParticipation = eventRsvps.map((r) => {
    const ev = companyEvents.find((e) => e.id === r.eventId);
    return ev ? `Attended ${ev.title}` : 'Attended company event';
  });

  const ecosystemSignals: string[] = [];
  if (eventParticipation[0]) ecosystemSignals.push(eventParticipation[0]);
  if (startups[0]) ecosystemSignals.push(`Active in startup ${startups[0].name}`);
  if (growthPercent >= 10) ecosystemSignals.push(`Profile grew ${growthPercent}% this month`);
  if (student.profileAchievements[0]) {
    ecosystemSignals.push(`Added certification: ${student.profileAchievements[0].title}`);
  }
  if (settings?.openToNetworking) ecosystemSignals.push('Joined networking activity');
  if (recentApp) ecosystemSignals.push(`Application: ${recentApp.internship.title}`);

  const timeline: PipelineTimelineEvent[] = [];
  if (startups[0]) {
    timeline.push({
      id: `startup-${startups[0].name}`,
      type: 'startup',
      title: 'Startup involvement',
      detail: startups[0].name,
      at: startups[0].createdAt.toISOString(),
    });
  }
  for (const ev of eventRsvps.slice(0, 2)) {
    const meta = companyEvents.find((e) => e.id === ev.eventId);
    timeline.push({
      id: `event-${ev.eventId}`,
      type: 'event',
      title: 'Event participation',
      detail: meta?.title ?? 'Company event',
      at: ev.createdAt.toISOString(),
    });
  }
  if (compatibilityScore != null) {
    timeline.push({
      id: 'compat',
      type: 'compatibility',
      title: 'Compatibility updated',
      detail: `${compatibilityScore}% fit with your company`,
      at: new Date().toISOString(),
    });
  }
  if (student.profileAchievements[0]) {
    timeline.push({
      id: `ach-${student.profileAchievements[0].title}`,
      type: 'achievement',
      title: 'Achievement added',
      detail: student.profileAchievements[0].title,
      at: student.profileAchievements[0].earnedAt.toISOString(),
    });
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const base: CompanyCandidateCard = {
    studentUserId,
    studentProfileId: student.id,
    name: student.user.name ?? 'Student',
    image: student.user.image,
    headline: student.user.headline ?? primary?.roleTitle ?? null,
    universityName: student.university?.name ?? student.universityName ?? 'University',
    program: student.course?.name ?? student.program,
    graduationYear,
    compatibilityScore,
    employabilityScore: Math.round(student.employabilityScore),
    profileStrength: student.profileStrength,
    verifiedBadges: verified.filter((v) => v.verified).map((v) => v.label),
    topSkills: student.reportedSkills.map((s) => s.skillId),
    startupInvolvement: startups[0] ? `${startups[0].name} (${startups[0].stage ?? 'active'})` : null,
    leadershipScore: Math.min(100, student.profileStrength + (startups.length > 0 ? 18 : 0)),
    languages: parseJsonArray(settings?.languages),
    recentActivity: recentApp
      ? `Application ${recentApp.status} · ${recentApp.updatedAt.toLocaleDateString()}`
      : startups[0]
        ? `Startup: ${startups[0].name}`
        : eventParticipation[0] ?? null,
    availability,
    aiLabels: [],
  };

  base.aiLabels = computePipelineAiLabels(
    {
      compatibilityScore: base.compatibilityScore,
      profileStrength: base.profileStrength,
      employabilityScore: base.employabilityScore,
      leadershipScore: base.leadershipScore,
      networkingScore,
      startupInvolvement: base.startupInvolvement,
      availability: base.availability,
      growthPercent,
    },
    startups.length > 0
  );

  return {
    ...base,
    academicYear: academicYearLabel(student.yearOfStudy),
    growthPercent,
    networkingScore,
    interestTags: programInterestTags(student.course?.name ?? student.program, primary?.roleTitle ?? null),
    ecosystemSignals: ecosystemSignals.slice(0, 5),
    eventParticipation,
    timeline: timeline.slice(0, 8),
  };
}
