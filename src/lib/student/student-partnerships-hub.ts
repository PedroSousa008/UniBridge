import type { CareerPath, Internship } from '@prisma/client';
import { prisma } from '@/lib/db';
import { computePathCompatibility } from '@/lib/career/compatibility-engine';
import {
  computeBreakdown,
  whyScoreLines,
} from '@/lib/career/compatibility-intelligence';
import {
  alumniPlaceholder,
  formatSalary,
  hiringStatusLabel,
  improveCompatibilityTips,
  inferDepartment,
  jobAiInsight,
  normalizePartnershipTier,
  profileCompletionForJob,
  remoteLabel,
} from '@/lib/career/partnership-intelligence';
import { ensurePartnershipTables } from '@/lib/db/ensure-partnerships-schema';
import { buildStudentProfile } from '@/lib/student/student-career-paths';

export interface PartnershipJob {
  id: string;
  partnershipId: string;
  companyUserId: string;
  companyName: string;
  title: string;
  department: string;
  description: string | null;
  salaryLabel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: string;
  remoteLabel: string;
  employmentType: string;
  compatibility: number;
  requiredSkills: string[];
  missingSkills: { name: string; gapPercent: number; importance: number }[];
  matchedSkills: { name: string; score: number; matched: boolean }[];
  whyMatches: string[];
  improveTips: string[];
  aiInsight: string;
  breakdown: { id: string; label: string; score: number; status: string }[];
  deadline: string | null;
  availabilityStatus: 'available' | 'filled';
  candidateCount: number;
  isBookmarked: boolean;
  isCandidate: boolean;
  applicationStatus: string | null;
  profileCompletion: number;
  tags: string[];
  createdAt: string;
}

export interface PartnershipCompanyCard {
  id: string;
  companyUserId: string;
  name: string;
  industry: string | null;
  logoUrl: string | null;
  headquarters: string | null;
  partnershipTier: string;
  hiringStatus: string;
  openPositions: number;
  avgCompatibility: number;
  isBookmarked: boolean;
  website: string | null;
  href: string;
}

export interface CareerLadderStage {
  id: string;
  roleTitle: string;
  description: string | null;
  order: number;
}

export interface PartnershipCompanyDetail extends PartnershipCompanyCard {
  departments: { name: string; jobs: PartnershipJob[] }[];
  allJobs: PartnershipJob[];
  careerLadder: CareerLadderStage[];
  alumni: { roleTitle: string; note: string }[];
}

export interface PartnershipsHub {
  companies: PartnershipCompanyCard[];
  jobs: PartnershipJob[];
  savedJobIds: string[];
  savedCompanyIds: string[];
  hasCompanyData: boolean;
  serverTime: string;
}

type InternshipWithRelations = Internship & {
  careerPath: CareerPath | null;
  _count: { applications: number };
  applications?: { status: string }[];
};

function internshipToPath(
  internship: InternshipWithRelations,
  companyName: string,
  industry: string | null
): CareerPath {
  const linked = internship.careerPath;
  if (linked) return linked;

  return {
    id: internship.id,
    companyUserId: internship.companyUserId,
    universityId: internship.universityId,
    partnershipId: internship.partnershipId,
    roleTitle: internship.title,
    companyName,
    industry,
    description: internship.description,
    requiredSubjects: [],
    gradeRequirements: null,
    recommendedSkills: internship.recommendedSkills ?? [],
    recommendedInternships: [],
    salaryMin: internship.salaryMin,
    salaryMax: internship.salaryMax,
    compatibilityCriteria: internship.compatibilityCriteria,
    status: 'PUBLISHED',
    publishedAt: internship.createdAt,
    createdAt: internship.createdAt,
    updatedAt: internship.updatedAt,
  } as CareerPath;
}

function buildJob(
  internship: InternshipWithRelations,
  companyName: string,
  industry: string | null,
  partnershipId: string,
  profile: Awaited<ReturnType<typeof buildStudentProfile>>,
  bookmarked: Set<string>,
  studentApplication: { status: string } | null
): PartnershipJob {
  const path = internshipToPath(internship, companyName, industry);
  const result = computePathCompatibility(path, profile);
  const breakdown = computeBreakdown(profile, result);
  const department = internship.department ?? inferDepartment(internship.title, industry);

  return {
    id: internship.id,
    partnershipId,
    companyUserId: internship.companyUserId,
    companyName,
    title: internship.title,
    department,
    description: internship.description,
    salaryLabel: formatSalary(internship.salaryMin, internship.salaryMax),
    salaryMin: internship.salaryMin,
    salaryMax: internship.salaryMax,
    location: internship.location,
    remoteType: internship.remoteType ?? 'on_site',
    remoteLabel: remoteLabel(internship.remoteType),
    employmentType: internship.employmentType ?? 'internship',
    compatibility: result.compatibility,
    requiredSkills: path.recommendedSkills,
    missingSkills: result.missingSkills,
    matchedSkills: result.matchedSkills,
    whyMatches: whyScoreLines(result, breakdown),
    improveTips: improveCompatibilityTips(result, profile, breakdown),
    aiInsight: jobAiInsight(result, internship.title, profile),
    breakdown,
    deadline: internship.deadline?.toISOString() ?? null,
    availabilityStatus:
      (internship.availabilityStatus ?? 'available') === 'filled' ? 'filled' : 'available',
    candidateCount: internship._count.applications,
    isBookmarked: bookmarked.has(internship.id),
    isCandidate: studentApplication?.status === 'candidate',
    applicationStatus: studentApplication?.status ?? null,
    profileCompletion: profileCompletionForJob(profile, result),
    tags: result.tags,
    createdAt: internship.createdAt.toISOString(),
  };
}

async function getStudentProfileId(userId: string): Promise<string | null> {
  const sp = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return sp?.id ?? null;
}

export async function loadStudentPartnershipsHub(userId: string): Promise<PartnershipsHub> {
  await ensurePartnershipTables();
  const dbReady = await ensurePartnershipTables();

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const universityId = studentProfile?.universityId ?? null;
  const profile = await buildStudentProfile(userId);
  const studentProfileId = studentProfile?.id ?? null;

  const [partnerships, jobBookmarks, companyBookmarks] = await Promise.all([
    universityId
      ? prisma.companyPartnership.findMany({
          where: { universityId, status: 'ACTIVE' },
          include: {
            companyUser: { include: { companyProfile: true } },
            careerPaths: { where: { status: 'PUBLISHED' }, orderBy: { roleTitle: 'asc' } },
            internships: {
              where: { status: { in: ['ACTIVE', 'PUBLISHED'] } },
              include: {
                careerPath: true,
                _count: { select: { applications: true } },
                ...(studentProfileId
                  ? {
                      applications: {
                        where: { studentId: studentProfileId },
                        select: { status: true },
                        take: 1,
                      },
                    }
                  : {}),
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    dbReady
      ? prisma.internshipBookmark.findMany({ where: { userId }, select: { internshipId: true } })
      : Promise.resolve([]),
    dbReady
      ? prisma.companyPartnershipBookmark.findMany({
          where: { userId },
          select: { partnershipId: true },
        })
      : Promise.resolve([]),
  ]);

  const bookmarkedJobs = new Set(jobBookmarks.map((b) => b.internshipId));
  const bookmarkedCompanies = new Set(companyBookmarks.map((b) => b.partnershipId));

  const companies: PartnershipCompanyCard[] = [];
  const jobs: PartnershipJob[] = [];

  for (const p of partnerships) {
    const cp = p.companyUser.companyProfile;
    const name = cp?.companyName ?? 'Partner company';
    const partnershipJobs = p.internships.map((i) =>
      buildJob(
        i as InternshipWithRelations,
        name,
        cp?.industry ?? null,
        p.id,
        profile,
        bookmarkedJobs,
        (i as InternshipWithRelations).applications?.[0] ?? null
      )
    );
    jobs.push(...partnershipJobs);

    const avgCompat =
      partnershipJobs.length > 0
        ? Math.round(partnershipJobs.reduce((a, j) => a + j.compatibility, 0) / partnershipJobs.length)
        : p.careerPaths.length > 0
          ? Math.round(
              p.careerPaths.reduce((a, path) => {
                return a + computePathCompatibility(path, profile).compatibility;
              }, 0) / p.careerPaths.length
            )
          : Math.round(profile.employabilityScore * 0.7 + profile.profileStrength * 0.3);

    companies.push({
      id: p.id,
      companyUserId: p.companyUserId,
      name,
      industry: cp?.industry ?? null,
      logoUrl: cp?.logoUrl ?? null,
      headquarters: cp?.headquarters ?? null,
      partnershipTier: normalizePartnershipTier(p.partnershipType, p.partnershipTier),
      hiringStatus: hiringStatusLabel(p.hiringStatus),
      openPositions: partnershipJobs.filter((j) => j.availabilityStatus === 'available').length,
      avgCompatibility: avgCompat,
      isBookmarked: bookmarkedCompanies.has(p.id),
      website: cp?.website ?? null,
      href: `/student/career/partnerships/${p.id}`,
    });
  }

  jobs.sort((a, b) => b.compatibility - a.compatibility);

  return {
    companies,
    jobs,
    savedJobIds: [...bookmarkedJobs],
    savedCompanyIds: [...bookmarkedCompanies],
    hasCompanyData: companies.length > 0,
    serverTime: new Date().toISOString(),
  };
}

export async function loadPartnershipCompanyDetail(
  userId: string,
  partnershipId: string
): Promise<PartnershipCompanyDetail | null> {
  await ensurePartnershipTables();
  const dbReady = await ensurePartnershipTables();

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const profile = await buildStudentProfile(userId);
  const studentProfileId = studentProfile?.id ?? null;

  const partnership = await prisma.companyPartnership.findFirst({
    where: {
      id: partnershipId,
      status: 'ACTIVE',
      ...(studentProfile?.universityId ? { universityId: studentProfile.universityId } : {}),
    },
    include: {
      companyUser: { include: { companyProfile: true } },
      careerPaths: { where: { status: 'PUBLISHED' }, orderBy: { roleTitle: 'asc' } },
      internships: {
        where: { status: { in: ['ACTIVE', 'PUBLISHED'] } },
        include: {
          careerPath: true,
          _count: { select: { applications: true } },
          ...(studentProfileId
            ? {
                applications: {
                  where: { studentId: studentProfileId },
                  select: { status: true },
                  take: 1,
                },
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!partnership) return null;

  const [jobBookmarks, companyBookmarks] = await Promise.all([
    dbReady
      ? prisma.internshipBookmark.findMany({ where: { userId }, select: { internshipId: true } })
      : Promise.resolve([]),
    dbReady
      ? prisma.companyPartnershipBookmark.findMany({
          where: { userId },
          select: { partnershipId: true },
        })
      : Promise.resolve([]),
  ]);

  const bookmarkedJobs = new Set(jobBookmarks.map((b) => b.internshipId));
  const cp = partnership.companyUser.companyProfile;
  const name = cp?.companyName ?? 'Partner company';

  const allJobs = partnership.internships.map((i) =>
    buildJob(
      i as InternshipWithRelations,
      name,
      cp?.industry ?? null,
      partnership.id,
      profile,
      bookmarkedJobs,
      (i as InternshipWithRelations).applications?.[0] ?? null
    )
  );

  const deptMap = new Map<string, PartnershipJob[]>();
  for (const job of allJobs) {
    const list = deptMap.get(job.department) ?? [];
    list.push(job);
    deptMap.set(job.department, list);
  }

  const departments = [...deptMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([deptName, deptJobs]) => ({
      name: deptName,
      jobs: deptJobs.sort((a, b) => b.compatibility - a.compatibility),
    }));

  const careerLadder: CareerLadderStage[] = partnership.careerPaths.map((path, index) => ({
    id: path.id,
    roleTitle: path.roleTitle,
    description: path.description,
    order: index,
  }));

  const openPositions = allJobs.filter((j) => j.availabilityStatus === 'available').length;
  const avgCompat =
    allJobs.length > 0
      ? Math.round(allJobs.reduce((a, j) => a + j.compatibility, 0) / allJobs.length)
      : careerLadder.length > 0
        ? Math.round(
            partnership.careerPaths.reduce(
              (a, path) => a + computePathCompatibility(path, profile).compatibility,
              0
            ) / partnership.careerPaths.length
          )
        : 0;

  return {
    id: partnership.id,
    companyUserId: partnership.companyUserId,
    name,
    industry: cp?.industry ?? null,
    logoUrl: cp?.logoUrl ?? null,
    headquarters: cp?.headquarters ?? null,
    partnershipTier: normalizePartnershipTier(partnership.partnershipType, partnership.partnershipTier),
    hiringStatus: hiringStatusLabel(partnership.hiringStatus),
    openPositions,
    avgCompatibility: avgCompat,
    isBookmarked: companyBookmarks.some((b) => b.partnershipId === partnership.id),
    website: cp?.website ?? null,
    href: `/student/career/partnerships/${partnership.id}`,
    departments,
    allJobs,
    careerLadder,
    alumni: alumniPlaceholder(name),
  };
}

export async function togglePartnershipBookmark(userId: string, partnershipId: string) {
  await ensurePartnershipTables();
  const existing = await prisma.companyPartnershipBookmark.findUnique({
    where: { userId_partnershipId: { userId, partnershipId } },
  });
  if (existing) {
    await prisma.companyPartnershipBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.companyPartnershipBookmark.create({ data: { userId, partnershipId } });
  return { bookmarked: true };
}

export async function toggleJobBookmark(userId: string, internshipId: string) {
  await ensurePartnershipTables();
  const existing = await prisma.internshipBookmark.findUnique({
    where: { userId_internshipId: { userId, internshipId } },
  });
  if (existing) {
    await prisma.internshipBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.internshipBookmark.create({ data: { userId, internshipId } });
  return { bookmarked: true };
}

export async function becomeJobCandidate(userId: string, internshipId: string) {
  const studentProfileId = await getStudentProfileId(userId);
  if (!studentProfileId) {
    throw new Error('Student profile required');
  }
  const app = await prisma.internshipApplication.upsert({
    where: {
      internshipId_studentId: { internshipId, studentId: studentProfileId },
    },
    create: {
      internshipId,
      studentId: studentProfileId,
      status: 'candidate',
    },
    update: {
      status: 'candidate',
    },
  });
  return { status: app.status };
}

export async function applyToJob(userId: string, internshipId: string) {
  const studentProfileId = await getStudentProfileId(userId);
  if (!studentProfileId) {
    throw new Error('Student profile required');
  }
  const app = await prisma.internshipApplication.upsert({
    where: {
      internshipId_studentId: { internshipId, studentId: studentProfileId },
    },
    create: {
      internshipId,
      studentId: studentProfileId,
      status: 'applied',
    },
    update: {
      status: 'applied',
    },
  });
  return { status: app.status };
}
