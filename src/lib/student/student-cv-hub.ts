import { prisma } from '@/lib/db';
import { ensureCvTables } from '@/lib/db/ensure-cv-schema';
import {
  buildCareerTimeline,
  buildCvImprovements,
  buildRecruiterPreview,
  computeCvAnalytics,
  computeCvBadges,
  CV_VERSIONS,
  importVerifiedEntries,
  inferVerifiedSkills,
  orderEntriesForVersion,
  runCvAdvisor,
  type CareerJourneyEvent,
  type CvAnalytics,
  type CvBadge,
  type CvEntry,
  type CvImprovement,
  type CvVersion,
  type CvVisibility,
  type RecruiterPreview,
  type VerifiedSkill,
} from '@/lib/career/cv-intelligence';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export interface CvHub {
  user: { name: string; headline: string | null; image: string | null };
  program: string | null;
  universityName: string | null;
  yearOfStudy: number | null;
  visibility: CvVisibility;
  activeVersion: CvVersion;
  versions: typeof CV_VERSIONS;
  entries: CvEntry[];
  entriesBySection: Record<string, CvEntry[]>;
  verifiedEntries: CvEntry[];
  pendingEntries: CvEntry[];
  skills: VerifiedSkill[];
  badges: CvBadge[];
  analytics: CvAnalytics;
  improvements: CvImprovement[];
  timeline: CareerJourneyEvent[];
  recruiterPreview: RecruiterPreview;
  compatibility: {
    primaryRole: string | null;
    primaryCompatibility: number | null;
    ecosystemLinks: { label: string; href: string; score: number | null }[];
  };
  portfolioLinks: { label: string; href: string; verified: boolean }[];
  dbReady: boolean;
  serverTime: string;
}

function mapDbEntry(row: {
  id: string;
  section: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  verificationStatus: string;
  sourceType: string | null;
  sourceId: string | null;
  verifiedBy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  sortOrder: number;
  visible: boolean;
}): CvEntry {
  return {
    id: row.id,
    section: row.section as CvEntry['section'],
    title: row.title,
    subtitle: row.subtitle,
    body: row.body ?? '',
    aiBody: null,
    verificationStatus: row.verificationStatus as CvEntry['verificationStatus'],
    verifiedBy: row.verifiedBy,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    visible: row.visible,
    isManual: true,
  };
}

export async function loadStudentCvHub(
  userId: string,
  options?: { versionId?: string; visibility?: CvVisibility }
): Promise<CvHub> {
  const dbReady = await ensureCvTables();

  const [user, studentRow, profile, pathsHub, assignmentsHub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, headline: true, image: true },
    }),
    prisma.studentProfile.findUnique({ where: { userId } }),
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    loadStudentAssignmentsHub(userId).catch(() => ({ assignments: [], notifications: [], dbReady: false })),
  ]);

  const startups = await prisma.startup.findMany({
    where: { founderId: userId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  });

  let applications: { id: string; title: string; companyName: string; status: string; appliedAt: string | null }[] = [];
  let journals: { title: string; kind: string }[] = [];
  let manualEntries: CvEntry[] = [];
  let visibility: CvVisibility = 'private';
  let activeVersionSlug = options?.versionId ?? 'corporate';

  if (studentRow && dbReady) {
    const apps = await prisma.internshipApplication.findMany({
      where: { studentId: studentRow.id },
      include: {
        internship: {
          select: {
            title: true,
            companyUser: {
              select: {
                name: true,
                companyProfile: { select: { companyName: true } },
              },
            },
          },
        },
      },
    });
    applications = apps.map((a) => ({
      id: a.id,
      title: a.internship.title,
      companyName:
        a.internship.companyUser.companyProfile?.companyName ??
        a.internship.companyUser.name ??
        'Partner company',
      status: a.status,
      appliedAt: a.appliedAt?.toISOString() ?? null,
    }));

    journals = (
      await prisma.studentInternshipJournal.findMany({
        where: { studentId: studentRow.id },
        take: 5,
        orderBy: { createdAt: 'desc' },
      })
    ).map((j) => ({ title: j.title, kind: j.kind }));

    let cvProfile = await prisma.studentCvProfile.findUnique({
      where: { studentProfileId: studentRow.id },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!cvProfile) {
      cvProfile = await prisma.studentCvProfile.create({
        data: { studentProfileId: studentRow.id },
        include: { entries: true },
      });
    }

    visibility = (options?.visibility ?? cvProfile.visibility) as CvVisibility;
    activeVersionSlug = options?.versionId ?? cvProfile.activeVersion;
    manualEntries = cvProfile.entries.map(mapDbEntry);
  }

  const verified = importVerifiedEntries({
    userName: user?.name ?? 'Student',
    program: studentRow?.program ?? null,
    universityName: studentRow?.universityName ?? null,
    yearOfStudy: studentRow?.yearOfStudy ?? null,
    profile,
    internships: applications,
    startups: startups.map((s) => ({
      id: s.id,
      name: s.name,
      stage: s.stage,
      readinessScore: s.readinessScore,
      milestones: s.milestones.map((m) => ({ label: m.label, status: m.status })),
    })),
    assignments: assignmentsHub.assignments
      .filter((a) => a.status === 'GRADED')
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        title: a.title,
        subjectName: a.subject.name,
        status: a.status,
        score: a.score,
      })),
    journals,
  });

  const seen = new Set(verified.map((e) => `${e.sourceType}:${e.sourceId}`));
  const merged = [
    ...verified,
    ...manualEntries.filter((m) => !m.sourceId || !seen.has(`${m.sourceType}:${m.sourceId}`)),
  ];

  const activeVersion = CV_VERSIONS.find((v) => v.id === activeVersionSlug) ?? CV_VERSIONS[0]!;
  const entries = orderEntriesForVersion(merged, activeVersion);

  const compatibleRoles = pathsHub.paths
    .map((p) => ({ role: p.roleTitle, compatibility: p.compatibility }))
    .sort((a, b) => b.compatibility - a.compatibility);

  const primary = pathsHub.paths.find((p) => p.isPrimaryTarget) ?? pathsHub.bestFit;
  const analytics = computeCvAnalytics(entries, profile, compatibleRoles);
  const skills = inferVerifiedSkills(profile, entries);
  const badges = computeCvBadges(entries, profile);
  const improvements = buildCvImprovements(entries, analytics, activeVersion);
  const timeline = buildCareerTimeline(entries, studentRow?.yearOfStudy ?? null);
  const recruiterPreview = buildRecruiterPreview(
    entries,
    analytics,
    primary?.roleTitle ?? null,
    primary?.compatibility ?? null
  );

  const entriesBySection: Record<string, CvEntry[]> = {};
  for (const e of entries) {
    if (!entriesBySection[e.section]) entriesBySection[e.section] = [];
    entriesBySection[e.section]!.push(e);
  }

  const portfolioLinks: CvHub['portfolioLinks'] = [];
  if (profile.hasStartup && startups[0]) {
    portfolioLinks.push({
      label: startups[0].name,
      href: `/student/startup/${startups[0].id}`,
      verified: true,
    });
  }
  for (const a of assignmentsHub.assignments.filter((x) => x.status === 'GRADED').slice(0, 3)) {
    portfolioLinks.push({
      label: a.title,
      href: `/student/academics/assignments`,
      verified: true,
    });
  }

  return {
    user: {
      name: user?.name ?? 'Student',
      headline: user?.headline ?? null,
      image: user?.image ?? null,
    },
    program: studentRow?.program ?? null,
    universityName: studentRow?.universityName ?? null,
    yearOfStudy: studentRow?.yearOfStudy ?? null,
    visibility,
    activeVersion,
    versions: CV_VERSIONS,
    entries,
    entriesBySection,
    verifiedEntries: entries.filter((e) => e.verificationStatus === 'verified'),
    pendingEntries: entries.filter((e) => e.verificationStatus === 'pending'),
    skills,
    badges,
    analytics,
    improvements,
    timeline,
    recruiterPreview,
    compatibility: {
      primaryRole: primary?.roleTitle ?? null,
      primaryCompatibility: primary?.compatibility ?? null,
      ecosystemLinks: [
        { label: 'Compatibility Engine', href: '/student/career/compatibility', score: pathsHub.bestFit?.compatibility ?? null },
        { label: 'Career Paths', href: '/student/career/paths', score: primary?.compatibility ?? null },
        { label: 'Internships', href: '/student/career/internships', score: null },
        { label: 'AI Career Mentor', href: '/student/career/mentor', score: profile.employabilityScore },
      ],
    },
    portfolioLinks,
    dbReady,
    serverTime: new Date().toISOString(),
  };
}

export async function upsertCvSettings(
  userId: string,
  data: { visibility?: CvVisibility; activeVersion?: string; headline?: string; summary?: string }
) {
  await ensureCvTables();
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) return null;

  return prisma.studentCvProfile.upsert({
    where: { studentProfileId: student.id },
    create: {
      studentProfileId: student.id,
      visibility: data.visibility ?? 'private',
      activeVersion: data.activeVersion ?? 'corporate',
      headline: data.headline,
      summary: data.summary,
    },
    update: {
      ...(data.visibility ? { visibility: data.visibility } : {}),
      ...(data.activeVersion ? { activeVersion: data.activeVersion } : {}),
      ...(data.headline !== undefined ? { headline: data.headline } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
    },
  });
}

export async function addPendingCvEntry(
  userId: string,
  entry: {
    section: string;
    title: string;
    subtitle?: string;
    body?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  await ensureCvTables();
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) return null;

  const profile = await prisma.studentCvProfile.upsert({
    where: { studentProfileId: student.id },
    create: { studentProfileId: student.id },
    update: {},
  });

  const maxOrder = await prisma.cvEntry.aggregate({
    where: { profileId: profile.id },
    _max: { sortOrder: true },
  });

  return prisma.cvEntry.create({
    data: {
      profileId: profile.id,
      section: entry.section,
      title: entry.title,
      subtitle: entry.subtitle,
      body: entry.body,
      verificationStatus: 'pending',
      verifiedBy: null,
      sourceType: 'manual',
      sourceId: null,
      startDate: entry.startDate ? new Date(entry.startDate) : null,
      endDate: entry.endDate ? new Date(entry.endDate) : null,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      visible: true,
    },
  });
}

export function runCvAdvisorFromHub(prompt: string, hub: CvHub): string {
  return runCvAdvisor(prompt, {
    analytics: hub.analytics,
    activeVersion: hub.activeVersion,
    improvements: hub.improvements,
    primaryRole: hub.compatibility.primaryRole,
  });
}

export function getExportHtml(hub: CvHub): string {
  const lines = hub.entries
    .filter((e) => e.visible)
    .map(
      (e) => `
    <div class="entry">
      <h3>${e.title}</h3>
      ${e.subtitle ? `<p class="sub">${e.subtitle}</p>` : ''}
      <p>${e.aiBody ?? e.body}</p>
      ${e.verificationStatus === 'verified' ? '<span class="badge">✓ Verified</span>' : '<span class="badge pending">Pending verification</span>'}
    </div>`
    )
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${hub.user.name} — ${hub.activeVersion.title}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;color:#111;padding:0 24px}
h1{font-size:28px;margin-bottom:4px}h2{font-size:14px;color:#666;font-weight:500;margin-top:0}
.entry{margin-bottom:20px;border-left:3px solid #4f46e5;padding-left:16px}
.entry h3{margin:0 0 4px;font-size:16px}.sub{color:#555;font-size:13px;margin:0 0 6px}
.badge{display:inline-block;font-size:10px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px;margin-top:6px}
.badge.pending{background:#fef3c7;color:#92400e}
.skills{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.skill{background:#f1f5f9;padding:6px 12px;border-radius:8px;font-size:12px}
</style></head><body>
<h1>${hub.user.name}</h1>
<h2>${hub.activeVersion.title} · ${hub.program ?? 'UniBridge Verified Profile'}</h2>
<p style="color:#444">${hub.user.headline ?? ''}</p>
${lines}
<div class="skills">${hub.skills.map((s) => `<span class="skill">${s.name}${s.verified ? ' ✓' : ''}</span>`).join('')}</div>
<p style="margin-top:40px;font-size:10px;color:#888">Exported from UniBridge · ${hub.analytics.verifiedRatio}% verified</p>
</body></html>`;
}
