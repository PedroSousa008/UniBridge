import { prisma } from '@/lib/db';
import { ensureCompatibilityTables } from '@/lib/db/ensure-compatibility-schema';
import {
  assembleEmployabilityHub,
  type EmployabilityHubComputed,
  type EmployabilityRange,
} from '@/lib/career/employability-intelligence';
import { buildEcosystemSkills, skillsToProfileSlugs } from '@/lib/career/skills-intelligence';
import { computeCvAnalytics, importVerifiedEntries } from '@/lib/career/cv-intelligence';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export interface EmployabilityHub extends EmployabilityHubComputed {
  range: EmployabilityRange;
  ecosystemLinks: { label: string; href: string }[];
  serverTime: string;
}

export async function loadStudentEmployabilityHub(
  userId: string,
  range: EmployabilityRange = '1y'
): Promise<EmployabilityHub> {
  const dbReady = await ensureCompatibilityTables();

  const [profile, studentRow, pathsHub, assignmentsHub, startups] = await Promise.all([
    buildStudentProfile(userId),
    prisma.studentProfile.findUnique({ where: { userId } }),
    loadStudentCareerPathsHub(userId),
    loadStudentAssignmentsHub(userId).catch(() => ({ assignments: [], notifications: [], dbReady: false })),
    prisma.startup.findMany({ where: { founderId: userId }, take: 1 }),
  ]);

  const snapshots =
    dbReady
      ? await prisma.studentCompatibilitySnapshot
          .findMany({
            where: { studentId: userId },
            orderBy: { capturedAt: 'asc' },
            take: 48,
            select: { capturedAt: true, employabilityScore: true },
          })
          .catch(() => [])
      : [];

  const applications =
    studentRow
      ? await prisma.internshipApplication
          .findMany({
            where: { studentId: studentRow.id },
            include: {
              internship: {
                select: {
                  title: true,
                  companyUser: {
                    select: {
                      companyProfile: { select: { companyName: true } },
                      name: true,
                    },
                  },
                },
              },
            },
          })
          .catch(() => [])
      : [];

  const tracked = buildEcosystemSkills({
    profile,
    assignments: assignmentsHub.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      subjectName: a.subject.name,
      status: a.status,
      score: a.score,
      isGroup: a.isGroup,
    })),
    internships: applications.map((a) => ({
      title: a.internship.title,
      companyName:
        a.internship.companyUser.companyProfile?.companyName ??
        a.internship.companyUser.name ??
        'Company',
      status: a.status,
    })),
    startups: startups.map((s) => ({
      name: s.name,
      readinessScore: s.readinessScore,
      milestonesDone: 0,
    })),
    journals: 0,
    primaryRole: pathsHub.bestFit?.roleTitle ?? null,
    pathRequirements: {},
    selfReported: [],
  });

  const cvEntries = importVerifiedEntries({
    userName: 'Student',
    program: studentRow?.program ?? null,
    universityName: studentRow?.universityName ?? null,
    yearOfStudy: studentRow?.yearOfStudy ?? null,
    profile,
    internships: applications.map((a) => ({
      id: a.id,
      title: a.internship.title,
      companyName:
        a.internship.companyUser.companyProfile?.companyName ??
        a.internship.companyUser.name ??
        'Company',
      status: a.status,
      appliedAt: a.appliedAt?.toISOString() ?? null,
    })),
    startups: startups.map((s) => ({
      id: s.id,
      name: s.name,
      stage: s.stage,
      readinessScore: s.readinessScore,
      milestones: [],
    })),
    assignments: [],
    journals: [],
  });

  const cvAnalytics = computeCvAnalytics(cvEntries, profile, []);

  const primary = pathsHub.paths.find((p) => p.isPrimaryTarget) ?? pathsHub.bestFit;

  const computed = assembleEmployabilityHub({
    profile: { ...profile, inferredSkills: skillsToProfileSlugs(tracked) },
    range,
    snapshots,
    paths: pathsHub.paths.map((p) => ({
      roleTitle: p.roleTitle,
      industry: p.industry,
      compatibility: p.compatibility,
    })),
    applications: applications.map((a) => ({
      title: a.internship.title,
      companyName:
        a.internship.companyUser.companyProfile?.companyName ??
        a.internship.companyUser.name ??
        'Company',
      status: a.status,
      appliedAt: a.appliedAt,
    })),
    hasStartup: profile.hasStartup,
    startupName: startups[0]?.name ?? null,
    cvCompleteness: cvAnalytics.completeness,
    verifiedSkillsCount: tracked.filter((s) => s.verification === 'verified').length,
    primaryPath: primary?.roleTitle ?? null,
    engagementScore: profile.engagementScore,
  });

  return {
    ...computed,
    range,
    ecosystemLinks: [
      { label: 'Skills', href: '/student/career/skills' },
      { label: 'CV', href: '/student/career/cv' },
      { label: 'Opportunities', href: '/student/career/opportunities' },
      { label: 'Compatibility', href: '/student/career/compatibility' },
    ],
    serverTime: new Date().toISOString(),
  };
}
