import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';
import {
  batchInternshipApplicationCounts,
  parsePositionHolder,
  roleStatusFromFilled,
  type PositionHolderData,
  type RoleStatus,
} from '@/lib/company/company-presence-shared';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import {
  computeCompanyStudentCompatibility,
  hiringActivityLabel,
  labelForRequirementTag,
  ROLE_TYPE_OPTIONS,
} from '@/lib/company/company-presence-intelligence';
import {
  getCompanyPresenceMatchCriteria,
  parseJsonArray,
  upsertCompanyRole,
} from '@/lib/company/company-presence-hub';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import { companyStageFromApplication, companyStageLabel } from '@/lib/company/company-intelligence';


export interface DepartmentRoleCard {
  id: string;
  title: string;
  roleType: string;
  roleTypeLabel: string;
  remoteType: string;
  location: string | null;
  isFilled: boolean;
  roleStatus: RoleStatus;
  status: string;
  avgCompatibility: number;
  applicationCount: number;
  hiringPriority: string;
  hiringPriorityLabel: string;
  topSkills: string[];
  positionHolder: PositionHolderData | null;
}

export interface DepartmentTeamMember {
  id: string;
  name: string;
  photoUrl: string | null;
  roleTitle: string | null;
  memberType: string;
  previousUniversity: string | null;
  degree: string | null;
  bio: string | null;
}

export interface CompanyDepartmentView {
  id: string;
  name: string;
  description: string | null;
  culture: string | null;
  expectations: string | null;
  leadershipStyle: string | null;
  growthPhilosophy: string | null;
  hiringActivity: string;
  hero: {
    totalRoles: number;
    openPositions: number;
    occupiedPositions: number;
    totalApplications: number;
    departmentGrowth: number;
    compatibilityAverage: number;
    topSkills: string[];
  };
  roles: DepartmentRoleCard[];
  team: DepartmentTeamMember[];
  allDepartments: { id: string; name: string }[];
  companyName: string;
}

export interface RoleVisibilitySettings {
  allStudents: boolean;
  universityIds: string[];
  degrees: string[];
  finalYearOnly: boolean;
}

export interface RoleApplicationSettings {
  cvOptional: boolean;
  videoIntroduction: boolean;
  startupPortfolio: boolean;
  customQuestions: string[];
  deadline: string | null;
}

export interface CompanyRoleIntelligenceView {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  title: string;
  roleType: string;
  remoteType: string;
  location: string | null;
  isFilled: boolean;
  roleStatus: RoleStatus;
  positionHolder: PositionHolderData | null;
  status: string;
  hiringPriority: string;
  description: string | null;
  responsibilities: string | null;
  expectations: string | null;
  growthOpportunities: string | null;
  requiredSkills: string[];
  nonNegotiables: string[];
  preferredQualities: string[];
  visibilitySettings: RoleVisibilitySettings;
  applicationSettings: RoleApplicationSettings;
  hero: {
    hiringStatus: string;
    avgCompatibility: number;
    applicationCount: number;
    strongestSkills: string[];
  };
  pipeline: { stage: string; label: string; count: number }[];
  topStudents: {
    userId: string;
    name: string;
    image: string | null;
    compatibility: number;
    headline: string | null;
  }[];
  aiInsights: string[];
  applications: {
    id: string;
    studentName: string;
    status: string;
    statusLabel: string;
    at: string;
  }[];
}

function parseVisibility(val: unknown): RoleVisibilitySettings {
  const o: Partial<RoleVisibilitySettings> =
    val && typeof val === 'object' ? (val as Partial<RoleVisibilitySettings>) : {};
  return {
    allStudents: o.allStudents !== false,
    universityIds: Array.isArray(o.universityIds) ? o.universityIds.map(String) : [],
    degrees: Array.isArray(o.degrees) ? o.degrees.map(String) : [],
    finalYearOnly: Boolean(o.finalYearOnly),
  };
}

function parseApplicationSettings(val: unknown): RoleApplicationSettings {
  const o: Partial<RoleApplicationSettings> =
    val && typeof val === 'object' ? (val as Partial<RoleApplicationSettings>) : {};
  return {
    cvOptional: Boolean(o.cvOptional),
    videoIntroduction: Boolean(o.videoIntroduction),
    startupPortfolio: Boolean(o.startupPortfolio),
    customQuestions: Array.isArray(o.customQuestions) ? o.customQuestions.map(String) : [],
    deadline: typeof o.deadline === 'string' ? o.deadline : null,
  };
}

async function loadRoleRow(companyUserId: string, roleId: string) {
  const rows = await prisma.$queryRaw<
    Record<string, unknown>[]
  >`
    SELECT * FROM "CompanyRole" WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function estimateRoleCompatibility(
  companyUserId: string,
  input: {
    nonNegotiables: string[];
    preferredQualities: string[];
    requiredSkills: string[];
    visibilitySettings?: RoleVisibilitySettings;
  }
): Promise<{ strongMatches: number; potentialMatches: number }> {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId);
  if (uniIds.length === 0) return { strongMatches: 0, potentialMatches: 0 };

  const students = await prisma.studentProfile.findMany({
    where: { universityId: { in: uniIds } },
    include: { identitySettings: true },
    take: 120,
  });

  const visible = students.filter((s) => {
    const settings = s.identitySettings;
    if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
    if (
      settings &&
      !studentOpenToRecruiting({
        openToInternships: settings.openToInternships,
        openToFullTime: settings.openToFullTime,
        openToNetworking: settings.openToNetworking,
      })
    ) {
      return false;
    }
    if (input.visibilitySettings?.finalYearOnly && (s.yearOfStudy ?? 0) < 3) return false;
    return true;
  });

  const criteria = await getCompanyPresenceMatchCriteria(companyUserId);
  let strong = 0;
  let potential = 0;

  for (const s of visible.slice(0, 80)) {
    try {
      const profile = await buildStudentProfile(s.userId);
      const c = computeCompanyStudentCompatibility(profile, {
        nonNegotiables: [...criteria.nonNegotiables, ...input.nonNegotiables.map(labelForRequirementTag)],
        preferredQualities: [...criteria.preferredQualities, ...input.preferredQualities.map(labelForRequirementTag)],
        requiredSkills: input.requiredSkills,
        preferredSkills: [],
      });
      if (c.overall >= 75) strong++;
      else if (c.overall >= 58) potential++;
    } catch {
      potential++;
    }
  }

  return { strongMatches: strong, potentialMatches: strong + potential };
}

export async function loadCompanyDepartmentView(
  companyUserId: string,
  departmentId: string
): Promise<CompanyDepartmentView | null> {
  await ensureCompanyPresenceTables();

  const deptRows = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      culture: string | null;
      expectations: string | null;
      leadershipStyle: string | null;
      growthPhilosophy: string | null;
      hiringActivity: string | null;
    }[]
  >`
    SELECT "id", "name", "description", "culture", "expectations", "leadershipStyle",
           "growthPhilosophy", "hiringActivity"
    FROM "CompanyDepartment"
    WHERE "id" = ${departmentId} AND "companyUserId" = ${companyUserId}
  `;
  const dept = deptRows[0];
  if (!dept) return null;

  const [profile, rolesRaw, teamRows, allDepts] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: { companyName: true },
    }),
    prisma.$queryRaw<
      {
        id: string;
        title: string;
        roleType: string;
        remoteType: string;
        location: string | null;
        isFilled: boolean;
        status: string;
        hiringPriority: string | null;
        requiredSkills: unknown;
        internshipId: string | null;
        positionHolderId: string | null;
      }[]
    >`
      SELECT "id", "title", "roleType", "remoteType", "location", "isFilled", "status",
             "hiringPriority", "requiredSkills", "internshipId", "positionHolderId"
      FROM "CompanyRole"
      WHERE "departmentId" = ${departmentId} AND "companyUserId" = ${companyUserId}
        AND "status" != 'archived'
      ORDER BY "sortOrder" ASC, "title" ASC
    `,
    prisma.$queryRaw<DepartmentTeamMember[]>`
      SELECT "id", "name", "photoUrl", "roleTitle", "memberType",
             "previousUniversity", "degree", "bio"
      FROM "CompanyTeamMember"
      WHERE "companyUserId" = ${companyUserId}
        AND ("departmentId" = ${departmentId} OR "departmentId" IS NULL)
      ORDER BY "sortOrder" ASC
      LIMIT 24
    `,
    prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT "id", "name" FROM "CompanyDepartment" WHERE "companyUserId" = ${companyUserId}
    `,
  ]);

  const holderIds = rolesRaw
    .map((r) => r.positionHolderId)
    .filter((id): id is string => Boolean(id));
  const holdersById = new Map<string, PositionHolderData>();
  if (holderIds.length > 0) {
    let holderRows: {
      id: string;
      name: string;
      photoUrl: string | null;
      age: number | null;
      roleTitle: string | null;
      previousUniversity: string | null;
      degree: string | null;
      bio: string | null;
      graduationYear: string | null;
      linkedInUrl: string | null;
      portfolioUrl: string | null;
      startedAt: Date | null;
      careerPath: string | null;
      mentoringAvailable: boolean | null;
      messagesAvailable: boolean | null;
      departmentId: string | null;
    }[] = [];
    try {
      holderRows = await prisma.$queryRaw`
        SELECT "id", "name", "photoUrl", "age", "roleTitle", "previousUniversity", "degree", "bio",
               "graduationYear", "linkedInUrl", "portfolioUrl", "startedAt", "careerPath",
               "mentoringAvailable", "messagesAvailable", "departmentId"
        FROM "CompanyTeamMember"
        WHERE "id" IN (${Prisma.join(holderIds)})
      `;
    } catch {
      holderRows = [];
    }

    for (const h of holderRows) {
      const deptName = h.departmentId
        ? allDepts.find((d) => d.id === h.departmentId)?.name ?? dept.name
        : dept.name;
      holdersById.set(h.id, {
        id: h.id,
        photoUrl: h.photoUrl,
        name: h.name,
        age: h.age,
        roleTitle: h.roleTitle ?? '',
        departmentName: deptName,
        previousUniversity: h.previousUniversity,
        degree: h.degree,
        graduationYear: h.graduationYear,
        bio: h.bio,
        linkedInUrl: h.linkedInUrl ?? h.portfolioUrl,
        startedAt: h.startedAt?.toISOString() ?? null,
        careerPath: h.careerPath,
        mentoringAvailable: Boolean(h.mentoringAvailable),
        messagesAvailable: Boolean(h.messagesAvailable),
      });
    }
  }

  const internshipIds = rolesRaw.map((r) => r.internshipId).filter(Boolean) as string[];
  const appCounts = await batchInternshipApplicationCounts(internshipIds);

  const roles: DepartmentRoleCard[] = rolesRaw.map((r) => {
    const applicationCount = r.internshipId ? (appCounts.get(r.internshipId) ?? 0) : 0;
    const skills = parseJsonArray(r.requiredSkills);
    const skillBoost = Math.min(12, skills.length * 2);
    const appBoost = Math.min(8, applicationCount);
    const avgCompatibility = r.isFilled ? 70 + skillBoost : 68 + skillBoost + appBoost;
    const priority = r.hiringPriority ?? 'normal';
    const positionHolder = r.positionHolderId
      ? (holdersById.get(r.positionHolderId) ?? null)
      : null;

    return {
      id: r.id,
      title: r.title,
      roleType: r.roleType,
      roleTypeLabel: ROLE_TYPE_OPTIONS.find((t) => t.id === r.roleType)?.label ?? r.roleType,
      remoteType: r.remoteType,
      location: r.location,
      isFilled: r.isFilled,
      roleStatus: roleStatusFromFilled(r.isFilled),
      status: r.status,
      avgCompatibility,
      applicationCount,
      hiringPriority: priority,
      hiringPriorityLabel:
        priority === 'high' ? 'High priority hiring' : priority === 'low' ? 'Standard' : 'Active hiring',
      topSkills: skills.slice(0, 4).map(labelForRequirementTag),
      positionHolder,
    };
  });

  const skillFreq = new Map<string, number>();
  for (const r of roles) {
    for (const sk of r.topSkills) skillFreq.set(sk, (skillFreq.get(sk) ?? 0) + 1);
  }

  const openPositions = roles.filter((r) => !r.isFilled).length;
  const occupiedPositions = roles.filter((r) => r.isFilled).length;
  const totalApplications = roles.reduce((a, r) => a + r.applicationCount, 0);
  const compatAvg =
    roles.length > 0
      ? Math.round(roles.reduce((a, r) => a + r.avgCompatibility, 0) / roles.length)
      : 70;

  return {
    id: dept.id,
    name: dept.name,
    description: dept.description,
    culture: dept.culture,
    expectations: dept.expectations,
    leadershipStyle: dept.leadershipStyle,
    growthPhilosophy: dept.growthPhilosophy,
    hiringActivity: hiringActivityLabel(dept.hiringActivity ?? 'active'),
    hero: {
      totalRoles: roles.length,
      openPositions,
      occupiedPositions,
      totalApplications,
      departmentGrowth: Math.min(28, openPositions * 4 + totalApplications),
      compatibilityAverage: compatAvg,
      topSkills: [...skillFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k),
    },
    roles,
    team: teamRows,
    allDepartments: allDepts,
    companyName: profile?.companyName ?? 'Your company',
  };
}

export async function saveCompanyDepartment(
  companyUserId: string,
  departmentId: string,
  data: Record<string, unknown>
) {
  const existing = await prisma.$queryRaw<{ name: string }[]>`
    SELECT "name" FROM "CompanyDepartment" WHERE "id" = ${departmentId} LIMIT 1
  `;
  const name = typeof data.name === 'string' ? data.name : existing[0]?.name ?? 'Department';
  await prisma.$executeRaw`
    UPDATE "CompanyDepartment" SET
      "name" = ${name},
      "description" = ${typeof data.description === 'string' ? data.description : null},
      "culture" = ${typeof data.culture === 'string' ? data.culture : null},
      "expectations" = ${typeof data.expectations === 'string' ? data.expectations : null},
      "leadershipStyle" = ${typeof data.leadershipStyle === 'string' ? data.leadershipStyle : null},
      "growthPhilosophy" = ${typeof data.growthPhilosophy === 'string' ? data.growthPhilosophy : null},
      "hiringActivity" = ${typeof data.hiringActivity === 'string' ? data.hiringActivity : 'active'},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${departmentId} AND "companyUserId" = ${companyUserId}
  `;
}

export async function archiveCompanyRole(companyUserId: string, roleId: string) {
  await prisma.$executeRaw`
    UPDATE "CompanyRole" SET "status" = 'archived', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
  const row = await loadRoleRow(companyUserId, roleId);
  const internshipId = row?.internshipId as string | undefined;
  if (internshipId) {
    try {
      await prisma.internship.update({
        where: { id: internshipId },
        data: { status: 'ARCHIVED' },
      });
    } catch {
      /* */
    }
  }
}

export async function duplicateCompanyRole(companyUserId: string, roleId: string) {
  const intel = await loadCompanyRoleIntelligence(companyUserId, roleId);
  if (!intel) return null;
  const row = await loadRoleRow(companyUserId, roleId);
  const { parseStructuredRequirements, migrateLegacyToStructured } = await import(
    '@/lib/company/company-role-requirements'
  );
  let structured = parseStructuredRequirements(row?.structuredRequirements);
  if (structured.length === 0) {
    structured = migrateLegacyToStructured({
      nonNegotiables: intel.nonNegotiables,
      preferredQualities: intel.preferredQualities,
      requiredSkills: intel.requiredSkills,
    });
  }
  const copiedStructured = structured.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
  }));
  return upsertCompanyRole(companyUserId, {
    departmentId: intel.departmentId,
    title: `${intel.title} (copy)`,
    roleType: intel.roleType,
    description: intel.description,
    responsibilities: intel.responsibilities,
    expectations: intel.expectations,
    growthOpportunities: intel.growthOpportunities,
    remoteType: intel.remoteType,
    location: intel.location,
    isFilled: false,
    status: 'published',
    nonNegotiables: intel.nonNegotiables,
    preferredQualities: intel.preferredQualities,
    requiredSkills: intel.requiredSkills,
    visibilitySettings: intel.visibilitySettings,
    applicationSettings: intel.applicationSettings,
    hiringPriority: intel.hiringPriority,
    structuredRequirements: copiedStructured,
  });
}

export async function deleteCompanyDepartment(
  companyUserId: string,
  departmentId: string,
  mode: 'move' | 'archive_roles' | 'delete_all',
  targetDepartmentId?: string
) {
  const roles = await prisma.$queryRaw<{ id: string; internshipId: string | null }[]>`
    SELECT "id", "internshipId" FROM "CompanyRole" WHERE "departmentId" = ${departmentId} AND "companyUserId" = ${companyUserId}
  `;

  if (mode === 'move' && targetDepartmentId) {
    for (const r of roles) {
      await prisma.$executeRaw`
        UPDATE "CompanyRole" SET "departmentId" = ${targetDepartmentId} WHERE "id" = ${r.id}
      `;
    }
  } else if (mode === 'archive_roles') {
    for (const r of roles) {
      await archiveCompanyRole(companyUserId, r.id);
    }
  } else {
    for (const r of roles) {
      await prisma.$executeRaw`DELETE FROM "CompanyRole" WHERE "id" = ${r.id}`;
      if (r.internshipId) {
        try {
          await prisma.internship.update({
            where: { id: r.internshipId },
            data: { status: 'ARCHIVED' },
          });
        } catch {
          /* */
        }
      }
    }
  }

  await prisma.$executeRaw`
    DELETE FROM "CompanyDepartment" WHERE "id" = ${departmentId} AND "companyUserId" = ${companyUserId}
  `;
}

export async function loadCompanyRoleIntelligence(
  companyUserId: string,
  roleId: string
): Promise<CompanyRoleIntelligenceView | null> {
  await ensureCompanyPresenceTables();
  const row = await loadRoleRow(companyUserId, roleId);
  if (!row) return null;

  const title = String(row.title);
  const internshipId = row.internshipId as string | null;
  const departmentId = row.departmentId as string | null;
  let departmentName: string | null = null;
  if (departmentId) {
    const d = await prisma.$queryRaw<{ name: string }[]>`
      SELECT "name" FROM "CompanyDepartment" WHERE "id" = ${departmentId} LIMIT 1
    `;
    departmentName = d[0]?.name ?? null;
  }

  const requiredSkills = parseJsonArray(row.requiredSkills).map(labelForRequirementTag);
  const nonNegotiables = parseJsonArray(row.nonNegotiables).map(labelForRequirementTag);
  const preferredQualities = parseJsonArray(row.preferredQualities).map(labelForRequirementTag);

  const [applications, est] = await Promise.all([
    internshipId
      ? prisma.internshipApplication.findMany({
          where: { internshipId },
          include: {
            student: { include: { user: { select: { id: true, name: true, image: true, headline: true } } } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    estimateRoleCompatibility(companyUserId, {
      nonNegotiables,
      preferredQualities,
      requiredSkills: parseJsonArray(row.requiredSkills),
    }),
  ]);

  const topStudents = await Promise.all(
    applications.slice(0, 6).map(async (app) => {
      let compat = 70;
      try {
        const profile = await buildStudentProfile(app.student.userId);
        const c = computeCompanyStudentCompatibility(profile, {
          nonNegotiables,
          preferredQualities,
          requiredSkills: parseJsonArray(row.requiredSkills),
          preferredSkills: parseJsonArray(row.preferredSkills),
        });
        compat = c.overall;
      } catch {
        /* */
      }
      return {
        userId: app.student.userId,
        name: app.student.user.name ?? 'Student',
        image: app.student.user.image,
        compatibility: compat,
        headline: app.student.user.headline,
      };
    })
  );

  topStudents.sort((a, b) => b.compatibility - a.compatibility);

  const stageCounts = new Map<string, number>();
  for (const app of applications) {
    const stage = companyStageFromApplication(app.status);
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  }

  const pipeline = [
    { stage: 'applied', label: 'Applied', count: stageCounts.get('applied') ?? 0 },
    { stage: 'reviewing', label: 'Reviewing', count: stageCounts.get('under_review') ?? 0 },
    { stage: 'interview', label: 'Interview', count: (stageCounts.get('interview') ?? 0) + (stageCounts.get('final_interview') ?? 0) },
    { stage: 'shortlisted', label: 'Shortlisted', count: stageCounts.get('offer_received') ?? 0 },
    { stage: 'hired', label: 'Hired', count: stageCounts.get('accepted') ?? 0 },
  ];

  const insights: string[] = [];
  if (est.strongMatches >= 20) {
    insights.push(`${est.strongMatches} strong matches in your partner universities for this role.`);
  }
  if (topStudents.some((s) => s.compatibility >= 80)) {
    insights.push('High compatibility among applicants — prioritize outreach to top matches.');
  }
  if (applications.length === 0) {
    insights.push('No applications yet — open roles with filled=false improve student apply rates.');
  }
  if (nonNegotiables.some((n) => /leadership/i.test(n)) && topStudents.filter((s) => s.compatibility < 65).length > 2) {
    insights.push('Most candidates lack leadership indicators — consider workshops or lowering thresholds.');
  }
  if (departmentName) {
    insights.push(`Strong concentration from ${departmentName} ecosystem partners.`);
  }

  const priority = String(row.hiringPriority ?? 'normal');
  const isFilled = Boolean(row.isFilled);
  let positionHolder: PositionHolderData | null = null;
  const holderId = row.positionHolderId as string | null;
  if (holderId) {
    try {
      const rows = await prisma.$queryRaw<
        {
          id: string;
          name: string;
          photoUrl: string | null;
          age: number | null;
          roleTitle: string | null;
          previousUniversity: string | null;
          degree: string | null;
          bio: string | null;
          graduationYear: string | null;
          linkedInUrl: string | null;
          portfolioUrl: string | null;
          startedAt: Date | null;
          careerPath: string | null;
          mentoringAvailable: boolean | null;
          messagesAvailable: boolean | null;
        }[]
      >`
        SELECT "id", "name", "photoUrl", "age", "roleTitle", "previousUniversity", "degree", "bio",
               "graduationYear", "linkedInUrl", "portfolioUrl", "startedAt", "careerPath",
               "mentoringAvailable", "messagesAvailable"
        FROM "CompanyTeamMember" WHERE "id" = ${holderId} LIMIT 1
      `;
      const h = rows[0];
      if (h) {
        positionHolder = {
          id: h.id,
          photoUrl: h.photoUrl,
          name: h.name,
          age: h.age,
          roleTitle: h.roleTitle ?? title,
          departmentName: departmentName ?? 'Department',
          previousUniversity: h.previousUniversity,
          degree: h.degree,
          graduationYear: h.graduationYear,
          bio: h.bio,
          linkedInUrl: h.linkedInUrl ?? h.portfolioUrl,
          startedAt: h.startedAt?.toISOString() ?? null,
          careerPath: h.careerPath,
          mentoringAvailable: Boolean(h.mentoringAvailable),
          messagesAvailable: Boolean(h.messagesAvailable),
        };
      }
    } catch {
      positionHolder = null;
    }
  }

  return {
    id: roleId,
    departmentId,
    departmentName,
    title,
    roleType: String(row.roleType),
    remoteType: String(row.remoteType ?? 'hybrid'),
    location: row.location as string | null,
    isFilled,
    roleStatus: roleStatusFromFilled(isFilled),
    positionHolder,
    status: String(row.status ?? 'published'),
    hiringPriority: priority,
    description: row.description as string | null,
    responsibilities: row.responsibilities as string | null,
    expectations: row.expectations as string | null,
    growthOpportunities: row.growthOpportunities as string | null,
    requiredSkills,
    nonNegotiables,
    preferredQualities,
    visibilitySettings: parseVisibility(row.visibilitySettings),
    applicationSettings: parseApplicationSettings(row.applicationSettings),
    hero: {
      hiringStatus: isFilled
        ? 'Position filled — still accepting applications'
        : priority === 'high'
          ? 'Hiring actively'
          : 'Open for applications',
      avgCompatibility: topStudents.length
        ? Math.round(topStudents.reduce((a, s) => a + s.compatibility, 0) / topStudents.length)
        : est.strongMatches > 0
          ? 76
          : 65,
      applicationCount: applications.length,
      strongestSkills: requiredSkills.slice(0, 5),
    },
    pipeline,
    topStudents: topStudents.slice(0, 8),
    aiInsights: insights.slice(0, 4),
    applications: applications.map((app) => ({
      id: app.id,
      studentName: app.student.user.name ?? 'Student',
      status: app.status,
      statusLabel: companyStageLabel(companyStageFromApplication(app.status)),
      at: (app.appliedAt ?? app.updatedAt).toISOString(),
    })),
  };
}

/** Instant department UI from presence hub data (no extra API wait). */
export function buildDepartmentSnapshot(
  dept: {
    id: string;
    name: string;
    description: string | null;
    occupiedCount: number;
    openCount: number;
    roles: {
      id: string;
      title: string;
      roleType: string;
      remoteType: string;
      location: string | null;
      isFilled: boolean;
      applicationCount: number;
      requiredSkills: string[];
      hiringPriority?: string | null;
    }[];
  },
  companyName: string,
  allDepartments: { id: string; name: string }[]
): CompanyDepartmentView {
  const roles: DepartmentRoleCard[] = dept.roles.map((r) => {
    const skills = r.requiredSkills;
    const skillBoost = Math.min(12, skills.length * 2);
    const appBoost = Math.min(8, r.applicationCount);
    const priority = r.hiringPriority ?? 'normal';
    return {
      id: r.id,
      title: r.title,
      roleType: r.roleType,
      roleTypeLabel: ROLE_TYPE_OPTIONS.find((t) => t.id === r.roleType)?.label ?? r.roleType,
      remoteType: r.remoteType,
      location: r.location,
      isFilled: r.isFilled,
      roleStatus: roleStatusFromFilled(r.isFilled),
      status: 'published',
      avgCompatibility: r.isFilled ? 70 + skillBoost : 68 + skillBoost + appBoost,
      applicationCount: r.applicationCount,
      hiringPriority: priority,
      hiringPriorityLabel:
        priority === 'high' ? 'High priority hiring' : priority === 'low' ? 'Standard' : 'Active hiring',
      topSkills: skills.slice(0, 4).map(labelForRequirementTag),
      positionHolder: null,
    };
  });

  const openPositions = roles.filter((r) => !r.isFilled).length;
  const occupiedPositions = roles.filter((r) => r.isFilled).length;
  const totalApplications = roles.reduce((a, r) => a + r.applicationCount, 0);
  const compatAvg =
    roles.length > 0
      ? Math.round(roles.reduce((a, r) => a + r.avgCompatibility, 0) / roles.length)
      : 70;

  const skillFreq = new Map<string, number>();
  for (const r of roles) {
    for (const sk of r.topSkills) skillFreq.set(sk, (skillFreq.get(sk) ?? 0) + 1);
  }

  return {
    id: dept.id,
    name: dept.name,
    description: dept.description,
    culture: null,
    expectations: null,
    leadershipStyle: null,
    growthPhilosophy: null,
    hiringActivity: hiringActivityLabel('active'),
    hero: {
      totalRoles: roles.length,
      openPositions,
      occupiedPositions,
      totalApplications,
      departmentGrowth: Math.min(28, openPositions * 4 + totalApplications),
      compatibilityAverage: compatAvg,
      topSkills: [...skillFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k),
    },
    roles,
    team: [],
    allDepartments,
    companyName,
  };
}
