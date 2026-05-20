import { prisma } from '@/lib/db';
import { ensureCvTables } from '@/lib/db/ensure-cv-schema';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import {
  buildAchievementsFromEcosystem,
  buildActivityFeed,
  buildVerifiedBadges,
  computeProfileStrength,
  parseJsonArray,
  parseVisibilityField,
  studentAgeFromYear,
  VISIBILITY_OPTIONS,
  VISIBILITY_SECTION_KEYS,
  OPEN_TO_OPTIONS,
  type ActivityFeedItem,
  type CareerInterests,
  type ExperienceTimelineItem,
  type NetworkingOverview,
  type ProfileAchievement,
  type ProfileAnalytics,
  type ProfileProject,
  type ProfileQuickStat,
  type ProfileStrengthBreakdown,
  type ProfileVisibility,
  type SkillSnapshot,
  type VerifiedBadge,
} from '@/lib/career/profile-intelligence';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { loadStudentSkillsHub } from '@/lib/student/student-skills-hub';
import { loadStudentOpportunitiesHub } from '@/lib/student/student-opportunities-hub';

export interface ProfileHub {
  hero: {
    name: string;
    image: string | null;
    age: number;
    universityName: string;
    program: string;
    location: string;
    headline: string;
    bio: string;
    email: string;
    universitySynced: boolean;
  };
  strength: ProfileStrengthBreakdown;
  verified: VerifiedBadge[];
  quickStats: ProfileQuickStat[];
  skillsSnapshot: SkillSnapshot[];
  experienceTimeline: ExperienceTimelineItem[];
  projects: ProfileProject[];
  achievements: ProfileAchievement[];
  networking: NetworkingOverview;
  analytics: ProfileAnalytics;
  activityFeed: ActivityFeedItem[];
  careerInterests: CareerInterests;
  openTo: Record<string, boolean>;
  visibility: Record<string, ProfileVisibility[]>;
  visibilityOptions: typeof VISIBILITY_OPTIONS;
  visibilitySections: typeof VISIBILITY_SECTION_KEYS;
  openToOptions: typeof OPEN_TO_OPTIONS;
  editable: {
    name: string;
    age: number | null;
    bio: string;
    headline: string;
    email: string;
    linkedIn: string;
    portfolioUrl: string;
    phone: string;
    personalLocation: string;
    languages: string[];
    interests: string[];
  };
  ecosystemLinks: { label: string; href: string }[];
  dbReady: boolean;
  serverTime: string;
}

function mapProject(row: {
  id: string;
  title: string;
  description: string | null;
  linkUrl: string | null;
  fileUrl: string | null;
  tags: unknown;
  visible: boolean;
}): ProfileProject {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    linkUrl: row.linkUrl,
    fileUrl: row.fileUrl,
    tags: parseJsonArray(row.tags),
    visible: row.visible,
  };
}

export async function loadStudentProfileHub(userId: string): Promise<ProfileHub> {
  const dbReady = await ensureProfileIdentityTables();
  const cvReady = await ensureCvTables();

  const [user, studentRow, pathsHub, skillsHub, opportunitiesHub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, headline: true, bio: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        university: { select: { name: true, location: true } },
        course: { select: { name: true, degreeType: true } },
      },
    }),
    loadStudentCareerPathsHub(userId),
    loadStudentSkillsHub(userId).catch(() => null),
    loadStudentOpportunitiesHub(userId).catch(() => null),
  ]);

  const profile = await buildStudentProfile(userId);

  let settings: {
    age: number | null;
    personalLocation: string | null;
    linkedIn: string | null;
    portfolioUrl: string | null;
    phone: string | null;
    languages: unknown;
    interests: unknown;
    careerIndustries: unknown;
    careerRoles: unknown;
    careerGoals: unknown;
    dreamCompanies: unknown;
    openToInternships: boolean;
    openToNetworking: boolean;
    openToStartup: boolean;
    openToFullTime: boolean;
    visibilityProfile: string;
    visibilityCv: string;
    visibilityProjects: string;
    visibilityNetworking: string;
    visibilityAchievements: string;
    visibilityOpportunities: string;
  } | null = null;

  let projects: ProfileProject[] = [];
  let achievements: ProfileAchievement[] = [];

  if (studentRow && dbReady) {
    const [s, projs, ach] = await Promise.all([
      prisma.studentIdentitySettings.findUnique({ where: { studentProfileId: studentRow.id } }),
      prisma.studentProfileProject.findMany({
        where: { studentProfileId: studentRow.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.studentProfileAchievement.findMany({
        where: { studentProfileId: studentRow.id },
        orderBy: { earnedAt: 'desc' },
        take: 20,
      }),
    ]);
    settings = s;
    projects = projs.map(mapProject);
    achievements = ach.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      description: a.description,
      earnedAt: a.earnedAt.toISOString(),
      verified: a.verified,
    }));
  }

  const startups = await prisma.startup.findMany({
    where: { founderId: userId },
    include: { milestones: true, _count: { select: { members: true } } },
  });

  let cvEntries: { section: string; verificationStatus: string }[] = [];
  if (studentRow && cvReady) {
    const cv = await prisma.studentCvProfile.findUnique({
      where: { studentProfileId: studentRow.id },
      include: { entries: { select: { section: true, verificationStatus: true } } },
    });
    cvEntries = cv?.entries ?? [];
  }

  const applications =
    studentRow && dbReady
      ? await prisma.internshipApplication.findMany({
          where: { studentId: studentRow.id },
          include: {
            internship: {
              select: {
                title: true,
                companyUser: { select: { companyProfile: { select: { companyName: true } } } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

  const targets = await prisma.careerTarget.findMany({ where: { userId } });

  const universityName =
    studentRow?.university?.name ?? studentRow?.universityName ?? 'Your University';
  const program =
    studentRow?.course?.name ?? studentRow?.program ?? 'Your program';
  const location =
    studentRow?.university?.location ?? settings?.personalLocation ?? 'Portugal';

  const age = studentAgeFromYear(studentRow?.yearOfStudy ?? null, settings?.age ?? null);

  const careerInterests: CareerInterests = {
    industries:
      parseJsonArray(settings?.careerIndustries).length > 0
        ? parseJsonArray(settings?.careerIndustries)
        : pathsHub.paths.slice(0, 3).map((p) => p.industry ?? 'General').filter(Boolean),
    roles:
      parseJsonArray(settings?.careerRoles).length > 0
        ? parseJsonArray(settings?.careerRoles)
        : targets.map((t) => t.roleTitle).slice(0, 5),
    goals: parseJsonArray(settings?.careerGoals),
    dreamCompanies:
      parseJsonArray(settings?.dreamCompanies).length > 0
        ? parseJsonArray(settings?.dreamCompanies)
        : targets.map((t) => t.companyName).filter(Boolean) as string[],
  };

  const verifiedCv = cvEntries.filter((e) => e.verificationStatus === 'verified').length;
  const certCount = cvEntries.filter((e) => e.section === 'certification').length;
  const leadershipCount = cvEntries.filter((e) => e.section === 'leadership').length;
  const acceptedApps = applications.filter((a) =>
    ['accepted', 'offer', 'hired', 'completed'].includes(a.status.toLowerCase())
  ).length;

  const strength = computeProfileStrength({
    profile,
    hasPhoto: Boolean(user?.image),
    hasHeadline: Boolean(user?.headline?.trim()),
    hasBio: Boolean(user?.bio?.trim()),
    cvEntryCount: cvEntries.length,
    verifiedCvCount: verifiedCv,
    verifiedSkills: skillsHub?.verifiedSkills.length ?? 0,
    totalSkills: skillsHub?.stats.totalSkills ?? 0,
    projectCount: projects.length + startups.length,
    applicationCount: applications.length,
    acceptedInternships: acceptedApps,
    startupCount: startups.length,
    certificationCount: certCount,
    interestsFilled: careerInterests.industries.length + careerInterests.roles.length > 0,
    linkedIn: Boolean(settings?.linkedIn),
  });

  if (studentRow && strength.total !== studentRow.profileStrength) {
    await prisma.studentProfile.update({
      where: { id: studentRow.id },
      data: { profileStrength: strength.total },
    });
  }

  const verified = buildVerifiedBadges({
    universityLinked: Boolean(studentRow?.universityId),
    verifiedInternships: acceptedApps,
    verifiedProjects: projects.length + startups.length,
    verifiedCerts: certCount,
    leadershipEntries: leadershipCount,
    platformValidated: strength.total >= 55,
  });

  const compatibilityAvg =
    pathsHub.paths.length > 0
      ? Math.round(pathsHub.paths.reduce((a, p) => a + p.compatibility, 0) / pathsHub.paths.length)
      : null;

  const quickStats: ProfileQuickStat[] = [
    {
      id: 'employability',
      label: 'Employability',
      value: `${Math.round(studentRow?.employabilityScore ?? profile.employabilityScore)}%`,
      href: '/student/career/employability',
    },
    {
      id: 'compatibility',
      label: 'Compatibility avg',
      value: compatibilityAvg != null ? `${compatibilityAvg}%` : '—',
      href: '/student/career/compatibility',
    },
    {
      id: 'skills',
      label: 'Verified skills',
      value: skillsHub?.stats.verifiedCount ?? 0,
      href: '/student/career/skills',
    },
    {
      id: 'applications',
      label: 'Applications',
      value: applications.length,
      href: '/student/career/opportunities',
    },
    {
      id: 'startups',
      label: 'Startup projects',
      value: startups.length,
      href: '/student/startup',
    },
    {
      id: 'certs',
      label: 'Certifications',
      value: certCount,
      href: '/student/career/cv',
    },
  ];

  const skillsSnapshot: SkillSnapshot[] = (skillsHub?.verifiedSkills ?? skillsHub?.skills ?? [])
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      name: s.name,
      level: s.xp,
      verified: s.verification === 'verified',
      growth: s.trend === 'up' ? 'fast' : s.trend === 'new' ? 'new' : 'steady',
    }));

  const experienceTimeline: ExperienceTimelineItem[] = [];

  for (const app of applications.slice(0, 6)) {
    const company = app.internship.companyUser.companyProfile?.companyName ?? 'Company';
    experienceTimeline.push({
      id: `app-${app.id}`,
      kind: 'internship',
      title: app.internship.title,
      subtitle: company,
      period: (app.appliedAt ?? app.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
      verified: ['accepted', 'offer', 'hired', 'completed'].includes(app.status.toLowerCase()),
      href: '/student/career/opportunities',
    });
  }

  for (const s of startups) {
    experienceTimeline.push({
      id: `startup-${s.id}`,
      kind: 'startup',
      title: s.name,
      subtitle: `Founder · ${s.stage}`,
      period: s.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }),
      verified: true,
      href: `/student/startup/${s.id}`,
    });
  }

  for (const p of projects.slice(0, 4)) {
    experienceTimeline.push({
      id: `proj-${p.id}`,
      kind: 'project',
      title: p.title,
      subtitle: p.tags.join(' · ') || 'Portfolio',
      period: 'Portfolio',
      verified: false,
    });
  }

  const companyMap = new Map<string, number>();
  for (const app of applications) {
    const n = app.internship.companyUser.companyProfile?.companyName ?? 'Partner';
    companyMap.set(n, (companyMap.get(n) ?? 0) + 1);
  }

  const networking: NetworkingOverview = {
    companiesInteracted: [...companyMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    eventsAttended: opportunitiesHub?.networking.filter((n) => n.kind === 'event').length ?? 0,
    recruitersConnected: opportunitiesHub?.networking.filter((n) => n.kind === 'recruiter').length ?? 0,
    startupCollaborators: startups.reduce((a, s) => a + s._count.members, 0) || startups.length,
  };

  const analyticsEvents = await prisma.analyticsEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const profileViews = analyticsEvents.filter((e) => e.event === 'profile_view').length;
  const recruiterViews = analyticsEvents.filter((e) => e.event === 'recruiter_view').length;
  const cvDownloads = analyticsEvents.filter((e) => e.event === 'cv_download').length;

  const snapshots = await prisma.studentCompatibilitySnapshot.findMany({
    where: { studentId: userId },
    orderBy: { capturedAt: 'asc' },
    take: 8,
    select: { overallScore: true, capturedAt: true },
  });

  const analytics: ProfileAnalytics = {
    profileViews: profileViews || Math.max(1, applications.length * 2),
    recruiterViews: recruiterViews || Math.floor(applications.length * 0.6),
    companyInteractions: applications.length + (opportunitiesHub?.pipeline.length ?? 0),
    cvDownloads: cvDownloads || Math.floor(strength.total / 15),
    compatibilityTrend:
      snapshots.length > 0
        ? snapshots.map((s) => ({
            label: new Date(s.capturedAt).toLocaleDateString(undefined, { month: 'short' }),
            value: s.overallScore,
          }))
        : pathsHub.paths.slice(0, 4).map((p, i) => ({ label: `Path ${i + 1}`, value: p.compatibility })),
  };

  const activityEvents: { label: string; at: Date; kind: string }[] = [];
  for (const app of applications.slice(0, 3)) {
    activityEvents.push({
      label: `Applied to ${app.internship.title}`,
      at: app.appliedAt ?? app.createdAt,
      kind: 'application',
    });
  }
  for (const s of startups.slice(0, 2)) {
    activityEvents.push({ label: `Startup activity: ${s.name}`, at: s.updatedAt, kind: 'startup' });
  }
  if (skillsHub?.liveActivity[0]) {
    activityEvents.push({
      label: skillsHub.liveActivity[0].label,
      at: new Date(skillsHub.liveActivity[0].at),
      kind: 'skills',
    });
  }

  const achievementsMerged = buildAchievementsFromEcosystem({
    firstApplication: applications.length > 0,
    startupCreated: startups.length > 0,
    leadershipCount,
    verifiedSkillCount: skillsHub?.stats.verifiedCount ?? 0,
    networkingCount: opportunitiesHub?.networking.length ?? 0,
    existing: achievements,
  });

  const defaultHeadline =
    user?.headline ??
    (careerInterests.roles[0]
      ? `Aspiring ${careerInterests.roles[0]}`
      : 'Building my professional identity on UniBridge');

  return {
    hero: {
      name: user?.name ?? 'Student',
      image: user?.image ?? null,
      age,
      universityName,
      program,
      location,
      headline: defaultHeadline,
      bio: user?.bio ?? '',
      email: user?.email ?? '',
      universitySynced: Boolean(studentRow?.universityId),
    },
    strength,
    verified,
    quickStats,
    skillsSnapshot,
    experienceTimeline: experienceTimeline.slice(0, 12),
    projects,
    achievements: achievementsMerged,
    networking,
    analytics,
    activityFeed: buildActivityFeed(activityEvents),
    careerInterests,
    openTo: {
      openToInternships: settings?.openToInternships ?? true,
      openToNetworking: settings?.openToNetworking ?? false,
      openToStartup: settings?.openToStartup ?? false,
      openToFullTime: settings?.openToFullTime ?? false,
    },
    visibility: {
      visibilityProfile: parseVisibilityField(settings?.visibilityProfile, ['university']),
      visibilityCv: parseVisibilityField(settings?.visibilityCv, ['private']),
      visibilityProjects: parseVisibilityField(settings?.visibilityProjects, ['companies']),
      visibilityNetworking: parseVisibilityField(settings?.visibilityNetworking, ['private']),
      visibilityAchievements: parseVisibilityField(settings?.visibilityAchievements, ['public']),
      visibilityOpportunities: parseVisibilityField(settings?.visibilityOpportunities, ['companies']),
    },
    visibilityOptions: VISIBILITY_OPTIONS,
    visibilitySections: VISIBILITY_SECTION_KEYS,
    openToOptions: OPEN_TO_OPTIONS,
    editable: {
      name: user?.name ?? '',
      age: settings?.age ?? null,
      bio: user?.bio ?? '',
      headline: user?.headline ?? '',
      email: user?.email ?? '',
      linkedIn: settings?.linkedIn ?? '',
      portfolioUrl: settings?.portfolioUrl ?? '',
      phone: settings?.phone ?? '',
      personalLocation: settings?.personalLocation ?? '',
      languages: parseJsonArray(settings?.languages),
      interests: parseJsonArray(settings?.interests),
    },
    ecosystemLinks: [
      { label: 'Career paths', href: '/student/career/paths' },
      { label: 'Compatibility', href: '/student/career/compatibility' },
      { label: 'AI Mentor', href: '/student/career/mentor' },
      { label: 'Opportunities', href: '/student/career/opportunities' },
      { label: 'CV Builder', href: '/student/career/cv' },
      { label: 'Skills', href: '/student/career/skills' },
    ],
    dbReady,
    serverTime: new Date().toISOString(),
  };
}

export function getProfileExportHtml(hub: ProfileHub): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const stats = hub.quickStats.map((s) => `<li><strong>${esc(s.label)}:</strong> ${esc(String(s.value))}</li>`).join('');
  const timeline = hub.experienceTimeline
    .map((t) => `<li><strong>${esc(t.title)}</strong> — ${esc(t.subtitle ?? '')} (${esc(t.period)})</li>`)
    .join('');
  const skills = hub.skillsSnapshot.map((s) => `<li>${esc(s.name)} (${s.level}%)</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(hub.hero.name)} — UniBridge Profile</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; color: #111; line-height: 1.5; }
    h1 { font-size: 28px; font-weight: 600; margin-bottom: 4px; }
    .headline { color: #555; font-size: 16px; margin-bottom: 24px; }
    .meta { font-size: 14px; color: #666; margin-bottom: 32px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-top: 32px; }
    ul { padding-left: 20px; }
    .strength { font-size: 14px; background: #f4f4f5; padding: 12px 16px; border-radius: 8px; }
    footer { margin-top: 48px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <h1>${esc(hub.hero.name)}</h1>
  <p class="headline">${esc(hub.hero.headline)}</p>
  <p class="meta">${esc(hub.hero.program)} · ${esc(hub.hero.universityName)} · ${esc(hub.hero.location)}</p>
  ${hub.hero.bio ? `<p>${esc(hub.hero.bio)}</p>` : ''}
  <p class="strength">Profile strength ${hub.strength.total}%</p>
  <h2>Quick stats</h2>
  <ul>${stats}</ul>
  <h2>Skills</h2>
  <ul>${skills || '<li>—</li>'}</ul>
  <h2>Experience</h2>
  <ul>${timeline || '<li>—</li>'}</ul>
  <footer>Exported from UniBridge · ${new Date().toLocaleDateString()}</footer>
</body>
</html>`;
}
