import type { Internship } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { computePathCompatibility } from '@/lib/career/compatibility-engine';
import {
  alumniPlaceholder,
  hiringStatusLabel,
  normalizePartnershipTier,
} from '@/lib/career/partnership-intelligence';
import { ensurePartnershipTables } from '@/lib/db/ensure-partnerships-schema';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import {
  buildInternshipCard,
  type InternshipCard,
} from '@/lib/student/internship-job-builder';

export type PartnershipJob = InternshipCard;

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

export interface PartnershipCompanyPresenceSlice {
  cultureHeadline: string | null;
  compatibility: {
    overall: number;
    skillsMatch: number;
    leadership: number;
    communication: number;
    startupActivity: number;
    academicAlignment: number;
    recommendations: string[];
  };
  culture: {
    mission: string | null;
    vision: string | null;
    values: string[];
    leadershipStyles: string[];
    whatWeLookFor: string | null;
  };
  nonNegotiables: string[];
  preferredQualities: string[];
  team: {
    id: string;
    name: string;
    photoUrl: string | null;
    roleTitle: string | null;
    memberType: string;
    previousUniversity: string | null;
    degree: string | null;
    bio: string | null;
  }[];
  departmentTeams: { name: string; occupiedCount: number; openCount: number }[];
  attractivenessScore: number;
  whyJoin: { title: string; description: string }[];
  events: { id: string; title: string; startsAt: string }[];
  improveCompatibilityTips: string[];
}

export interface PartnershipCompanyDetail extends PartnershipCompanyCard {
  departments: { name: string; jobs: PartnershipJob[] }[];
  allJobs: PartnershipJob[];
  careerLadder: CareerLadderStage[];
  alumni: { roleTitle: string; note: string }[];
  presence?: PartnershipCompanyPresenceSlice;
}

export interface PartnershipsHub {
  companies: PartnershipCompanyCard[];
  jobs: PartnershipJob[];
  savedJobIds: string[];
  savedCompanyIds: string[];
  hasCompanyData: boolean;
  serverTime: string;
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
                        select: { id: true, status: true, appliedAt: true },
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

  async function positionHolderByInternshipId(ids: string[]) {
    const map = new Map<string, unknown>();
    if (ids.length === 0) return map;
    try {
      const rows = await prisma.$queryRaw<{ id: string; positionHolderJson: unknown }[]>`
        SELECT "id", "positionHolderJson" FROM "Internship" WHERE "id" IN (${Prisma.join(ids)})
      `;
      for (const r of rows) map.set(r.id, r.positionHolderJson);
    } catch {
      /* column may not exist yet */
    }
    return map;
  }

  for (const p of partnerships) {
    const cp = p.companyUser.companyProfile;
    const name = cp?.companyName ?? 'Partner company';
    const holderMap = await positionHolderByInternshipId(p.internships.map((i) => i.id));
    const partnershipJobs = p.internships.map((i) => {
      const row = i as typeof i & {
        applications?: { id: string; status: string; appliedAt: Date | null }[];
        positionHolderJson?: unknown;
      };
      row.positionHolderJson = holderMap.get(i.id);
      const app = row.applications?.[0];
      return buildInternshipCard(
        row,
        name,
        cp?.industry ?? null,
        profile,
        bookmarkedJobs,
        app ? { id: app.id, status: app.status, appliedAt: app.appliedAt ?? null } : null
      );
    });
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
                  select: { id: true, status: true, appliedAt: true },
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

  const internshipIds = partnership.internships.map((i) => i.id);
  let holderMap = new Map<string, unknown>();
  if (internshipIds.length > 0) {
    try {
      const rows = await prisma.$queryRaw<{ id: string; positionHolderJson: unknown }[]>`
        SELECT "id", "positionHolderJson" FROM "Internship" WHERE "id" IN (${Prisma.join(internshipIds)})
      `;
      holderMap = new Map(rows.map((r) => [r.id, r.positionHolderJson]));
    } catch {
      /* */
    }
  }

  const allJobs = partnership.internships.map((i) => {
    const row = i as typeof i & {
      applications?: { id: string; status: string; appliedAt: Date | null }[];
      positionHolderJson?: unknown;
    };
    row.positionHolderJson = holderMap.get(i.id);
    const app = row.applications?.[0];
    return buildInternshipCard(
      row,
      name,
      cp?.industry ?? null,
      profile,
      bookmarkedJobs,
      app ? { id: app.id, status: app.status, appliedAt: app.appliedAt ?? null } : null
    );
  });

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

  let presence: PartnershipCompanyPresenceSlice | undefined;
  try {
    const { loadCompanyPresenceForStudent, parseJsonArray } = await import('@/lib/company/company-presence-hub');
    const {
      buildStudentRoleFitGaps,
      migrateLegacyToStructured,
      parseStructuredRequirements,
    } = await import('@/lib/company/company-role-requirements');
    const { labelForRequirementTag } = await import('@/lib/company/company-presence-intelligence');
    const p = await loadCompanyPresenceForStudent(partnership.companyUserId, userId);

    const roleRows = await prisma.$queryRaw<
      { structuredRequirements: unknown; nonNegotiables: unknown; preferredQualities: unknown; requiredSkills: unknown }[]
    >`
      SELECT "structuredRequirements", "nonNegotiables", "preferredQualities", "requiredSkills"
      FROM "CompanyRole"
      WHERE "companyUserId" = ${partnership.companyUserId} AND "status" != 'archived'
    `;
    const mergedReqs = roleRows.flatMap((row) => {
      let structured = parseStructuredRequirements(row.structuredRequirements);
      if (structured.length === 0) {
        structured = migrateLegacyToStructured({
          nonNegotiables: parseJsonArray(row.nonNegotiables).map(labelForRequirementTag),
          preferredQualities: parseJsonArray(row.preferredQualities).map(labelForRequirementTag),
          requiredSkills: parseJsonArray(row.requiredSkills).map(labelForRequirementTag),
        });
      }
      return structured.filter((r) => r.status === 'active');
    });

    const improveCompatibilityTips = buildStudentRoleFitGaps(profile, name, mergedReqs);

    presence = {
      cultureHeadline: p.hero.cultureHeadline,
      compatibility: p.compatibility,
      culture: {
        mission: p.culture.mission,
        vision: p.culture.vision,
        values: p.culture.values,
        leadershipStyles: p.culture.leadershipStyles,
        whatWeLookFor: p.culture.whatWeLookFor,
      },
      nonNegotiables: p.nonNegotiables,
      preferredQualities: p.preferredQualities,
      team: p.team,
      departmentTeams: p.departments.map((d) => ({
        name: d.name,
        occupiedCount: d.occupiedCount,
        openCount: d.openCount,
      })),
      attractivenessScore: p.attractiveness.score,
      whyJoin: p.whyJoin,
      events: p.events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt })),
      improveCompatibilityTips,
    };
  } catch {
    /* presence tables optional */
  }

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
    presence,
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
      status: 'preparing',
    },
    update: {
      status: 'preparing',
    },
  });
  return { status: app.status };
}

export async function applyToJob(userId: string, internshipId: string) {
  const { syncApplicationDocuments } = await import('@/lib/career/opportunities-intelligence');
  const { ensureOpportunityTables } = await import('@/lib/db/ensure-opportunities-schema');

  await ensureOpportunityTables();

  const studentProfileId = await getStudentProfileId(userId);
  if (!studentProfileId) {
    throw new Error('Student profile required');
  }

  const [profile, internship, studentUser] = await Promise.all([
    buildStudentProfile(userId),
    prisma.internship.findUnique({
      where: { id: internshipId },
      select: { title: true, companyUserId: true, employmentType: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ]);

  if (!internship) throw new Error('Role not found');

  const documentsJson = syncApplicationDocuments(profile);
  const interactionHistory = [
    {
      type: 'submitted',
      label: 'Application submitted with synced CV & materials',
      at: new Date().toISOString(),
    },
  ];

  const app = await prisma.internshipApplication.upsert({
    where: {
      internshipId_studentId: { internshipId, studentId: studentProfileId },
    },
    create: {
      internshipId,
      studentId: studentProfileId,
      status: 'applied',
      appliedAt: new Date(),
      documentsJson: documentsJson as object,
      interactionHistory: interactionHistory as object,
      nextAction: 'Monitor application status in Opportunities pipeline',
      category: internship.employmentType ?? 'internship',
    },
    update: {
      status: 'applied',
      appliedAt: new Date(),
      documentsJson: documentsJson as object,
      interactionHistory: interactionHistory as object,
      nextAction: 'Monitor application status in Opportunities pipeline',
    },
  });

  try {
    await prisma.notification.create({
      data: {
        userId: internship.companyUserId,
        type: 'CAREER',
        title: 'New application received',
        message: `${studentUser?.name ?? 'A student'} applied to ${internship.title}. Materials synced via UniBridge.`,
        link: '/company/home',
      },
    });
  } catch {
    /* notifications optional */
  }

  return {
    status: app.status,
    applicationId: app.id,
    opportunitiesHref: `/student/career/opportunities/${internshipId}`,
    syncedDocuments: documentsJson,
  };
}
