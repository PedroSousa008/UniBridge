import { prisma } from '@/lib/db';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';
import {
  batchInternshipApplicationCounts,
  parseCurrentlyHiring,
  type PositionHolderData,
} from '@/lib/company/company-presence-shared';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import {
  computeAttractivenessScore,
  computeCompanyStudentCompatibility,
  hiringActivityLabel,
  type CompanyCompatibilityBreakdown,
} from '@/lib/company/company-presence-intelligence';
import {
  isRealPersonName,
  loadDisplayableTeamMembers,
  prunePositionHolderAfterRoleUnfilled,
  pruneTeamMembersExclusiveToRole,
  type CompanyPresenceTeamMemberCard,
} from '@/lib/company/company-presence-people';

function newId() {
  return crypto.randomUUID();
}

export function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

function parseWhyJoin(val: unknown): { title: string; description: string }[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as { title?: string; description?: string };
      return {
        title: String(o.title ?? ''),
        description: String(o.description ?? ''),
      };
    })
    .filter((x) => x.title);
}

export interface CompanyPresenceRole {
  id: string;
  departmentId: string | null;
  departmentName: string | null;
  title: string;
  roleType: string;
  description: string | null;
  responsibilities: string | null;
  expectations: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  nonNegotiables: string[];
  preferredQualities: string[];
  growthOpportunities: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  remoteType: string;
  location: string | null;
  startDate: string | null;
  isFilled: boolean;
  currentlyHiring: boolean;
  status: string;
  hiringPriority: string;
  internshipId: string | null;
  applicationCount: number;
}

export interface CompanyPresenceDepartment {
  id: string;
  name: string;
  description: string | null;
  occupiedCount: number;
  openCount: number;
  roles: CompanyPresenceRole[];
}

export type CompanyPresenceTeamMember = CompanyPresenceTeamMemberCard;

export interface CompanyPresenceEvent {
  id: string;
  title: string;
  startsAt: string;
  status: string;
  location: string | null;
}

export interface CompanyPresenceHub {
  hero: {
    logoUrl: string | null;
    companyName: string;
    ownerName: string | null;
    industry: string | null;
    headquarters: string | null;
    totalEmployees: number | null;
    partnerships: number;
    startupCollaborations: number;
    activeOpportunities: number;
    hiringActivity: string;
    cultureHeadline: string | null;
  };
  culture: {
    mission: string | null;
    vision: string | null;
    values: string[];
    workPhilosophy: string | null;
    whatWeLookFor: string | null;
    growthCulture: string | null;
    leadershipStyles: string[];
  };
  nonNegotiables: string[];
  preferredQualities: string[];
  departments: CompanyPresenceDepartment[];
  roles: CompanyPresenceRole[];
  team: CompanyPresenceTeamMember[];
  events: CompanyPresenceEvent[];
  startupSection: {
    collaborations: number;
    mentorshipOffers: string | null;
    challengeCount: number;
  };
  attractiveness: {
    score: number;
    studentInterest: number;
    applicationGrowth: number;
    eventEngagement: number;
    responseSpeed: number;
    hiringSatisfaction: number;
    mentorshipActivity: number;
  };
  whyJoin: { title: string; description: string }[];
  compatibilityPreview: CompanyCompatibilityBreakdown;
  previewStudentLabel: string;
  serverTime: string;
}

type PresenceRow = {
  cultureHeadline: string | null;
  ownerName: string | null;
  totalEmployees: number | null;
  hiringActivity: string | null;
  mission: string | null;
  vision: string | null;
  valuesJson: unknown;
  workPhilosophy: string | null;
  whatWeLookFor: string | null;
  growthCulture: string | null;
  leadershipStyles: unknown;
  nonNegotiables: unknown;
  preferredQualities: unknown;
  whyJoinJson: unknown;
  startupCollaboration: string | null;
};

export async function getCompanyPresenceMatchCriteria(companyUserId: string): Promise<{
  nonNegotiables: string[];
  preferredQualities: string[];
}> {
  const presence = await getOrCreatePresence(companyUserId);
  return {
    nonNegotiables: parseJsonArray(presence.nonNegotiables),
    preferredQualities: parseJsonArray(presence.preferredQualities),
  };
}

async function getOrCreatePresence(companyUserId: string): Promise<PresenceRow> {
  await ensureCompanyPresenceTables();
  const rows = await prisma.$queryRaw<PresenceRow[]>`
    SELECT "cultureHeadline", "ownerName", "totalEmployees", "hiringActivity",
           "mission", "vision", "valuesJson", "workPhilosophy", "whatWeLookFor",
           "growthCulture", "leadershipStyles", "nonNegotiables", "preferredQualities",
           "whyJoinJson", "startupCollaboration"
    FROM "CompanyPresenceProfile"
    WHERE "companyUserId" = ${companyUserId}
    LIMIT 1
  `;
  if (rows[0]) return rows[0];

  const id = newId();
  await prisma.$executeRaw`
    INSERT INTO "CompanyPresenceProfile" ("id", "companyUserId")
    VALUES (${id}, ${companyUserId})
  `;
  return {
    cultureHeadline: null,
    ownerName: null,
    totalEmployees: null,
    hiringActivity: 'actively_hiring',
    mission: null,
    vision: null,
    valuesJson: [],
    workPhilosophy: null,
    whatWeLookFor: null,
    growthCulture: null,
    leadershipStyles: [],
    nonNegotiables: [],
    preferredQualities: [],
    whyJoinJson: [],
    startupCollaboration: null,
  };
}

async function loadDepartmentsAndRoles(companyUserId: string) {
  await ensureCompanyPresenceTables();
  const [departments, roles] = await Promise.all([
    prisma.$queryRaw<
      { id: string; name: string; description: string | null; occupiedCount: number; openCount: number }[]
    >`
      SELECT "id", "name", "description", "occupiedCount", "openCount"
      FROM "CompanyDepartment"
      WHERE "companyUserId" = ${companyUserId}
      ORDER BY "sortOrder" ASC, "name" ASC
    `,
    prisma.$queryRaw<
      {
        id: string;
        departmentId: string | null;
        title: string;
        roleType: string;
        description: string | null;
        responsibilities: string | null;
        expectations: string | null;
        requiredSkills: unknown;
        preferredSkills: unknown;
        nonNegotiables: unknown;
        preferredQualities: unknown;
        growthOpportunities: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        remoteType: string;
        location: string | null;
        startDate: Date | null;
        isFilled: boolean;
        currentlyHiring: boolean | null;
        status: string;
        hiringPriority: string | null;
        internshipId: string | null;
      }[]
    >`
      SELECT "id", "departmentId", "title", "roleType", "description", "responsibilities",
             "expectations", "requiredSkills", "preferredSkills", "nonNegotiables",
             "preferredQualities", "growthOpportunities", "salaryMin", "salaryMax",
             "remoteType", "location", "startDate", "isFilled", "currentlyHiring", "status", "hiringPriority", "internshipId"
      FROM "CompanyRole"
      WHERE "companyUserId" = ${companyUserId} AND "status" != 'archived'
      ORDER BY "sortOrder" ASC, "title" ASC
    `,
  ]);

  const deptMap = new Map(departments.map((d) => [d.id, d.name]));
  const internshipIds = roles.map((r) => r.internshipId).filter(Boolean) as string[];
  const appCounts = await batchInternshipApplicationCounts(internshipIds);

  const mappedRoles: CompanyPresenceRole[] = roles.map((r) => ({
    id: r.id,
    departmentId: r.departmentId,
    departmentName: r.departmentId ? (deptMap.get(r.departmentId) ?? null) : null,
    title: r.title,
    roleType: r.roleType,
    description: r.description,
    responsibilities: r.responsibilities,
    expectations: r.expectations,
    requiredSkills: parseJsonArray(r.requiredSkills),
    preferredSkills: parseJsonArray(r.preferredSkills),
    nonNegotiables: parseJsonArray(r.nonNegotiables),
    preferredQualities: parseJsonArray(r.preferredQualities),
    growthOpportunities: r.growthOpportunities,
    salaryMin: r.salaryMin,
    salaryMax: r.salaryMax,
    remoteType: r.remoteType,
    location: r.location,
    startDate: r.startDate?.toISOString() ?? null,
    isFilled: r.isFilled,
    currentlyHiring: parseCurrentlyHiring(r.currentlyHiring, r.isFilled),
    status: r.status,
    hiringPriority: r.hiringPriority ?? 'normal',
    internshipId: r.internshipId,
    applicationCount: r.internshipId ? (appCounts.get(r.internshipId) ?? 0) : 0,
  }));

  const deptGroups: CompanyPresenceDepartment[] = departments.map((d) => {
    const deptRoles = mappedRoles.filter((r) => r.departmentId === d.id);
    const open = deptRoles.filter((r) => !r.isFilled).length;
    const occupied = deptRoles.filter((r) => r.isFilled).length;
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      occupiedCount: occupied || d.occupiedCount,
      openCount: open || d.openCount,
      roles: deptRoles,
    };
  });

  const unassigned = mappedRoles.filter((r) => !r.departmentId);
  if (unassigned.length > 0) {
    deptGroups.push({
      id: '_general',
      name: 'General',
      description: null,
      occupiedCount: unassigned.filter((r) => r.isFilled).length,
      openCount: unassigned.filter((r) => !r.isFilled).length,
      roles: unassigned,
    });
  }

  return { departments: deptGroups, roles: mappedRoles };
}

export async function loadCompanyPresenceHub(companyUserId: string): Promise<CompanyPresenceHub> {
  await ensureCompanyPresenceTables();

  const [user, profile, presence, partnerships, internships, events, pipelineCount, startupFollows, team] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: companyUserId }, select: { name: true } }),
      prisma.companyProfile.findUnique({ where: { userId: companyUserId } }),
      getOrCreatePresence(companyUserId),
      prisma.companyPartnership.count({ where: { companyUserId, status: 'ACTIVE' } }),
      prisma.internship.count({ where: { companyUserId } }),
      prisma.companyEvent.findMany({
        where: { companyUserId },
        orderBy: { startsAt: 'asc' },
        take: 6,
        select: { id: true, title: true, startsAt: true, status: true, location: true },
      }),
      prisma.companyPipelineCandidate.count({ where: { companyUserId } }),
      prisma.startupFollower.count({ where: { userId: companyUserId } }),
      loadDisplayableTeamMembers(companyUserId),
    ]);

  const { departments, roles } = await loadDepartmentsAndRoles(companyUserId);

  const openRoles = roles.filter((r) => !r.isFilled).length;
  const appsLast30 = await prisma.internshipApplication.count({
    where: {
      internship: { companyUserId },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  const appsPrior = await prisma.internshipApplication.count({
    where: {
      internship: { companyUserId },
      createdAt: {
        gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });
  const applicationGrowth = appsPrior > 0 ? Math.min(100, Math.round((appsLast30 / appsPrior) * 50)) : appsLast30 > 0 ? 72 : 45;

  const attractiveness = computeAttractivenessScore({
    studentInterest: Math.min(100, partnerships * 12 + openRoles * 5),
    applicationGrowth,
    eventEngagement: Math.min(100, events.length * 14),
    responseSpeed: pipelineCount > 5 ? 78 : 62,
    hiringSatisfaction: partnerships > 0 ? 80 : 55,
    mentorshipActivity: Math.min(100, startupFollows * 8 + (team.filter((t) => t.memberType === 'mentor').length) * 15),
  });

  const nonNegotiables = parseJsonArray(presence.nonNegotiables);
  const preferredQualities = parseJsonArray(presence.preferredQualities);
  const allRequired = roles.flatMap((r) => r.requiredSkills);
  const allPreferred = roles.flatMap((r) => r.preferredSkills);

  let compatibilityPreview = computeCompanyStudentCompatibility(
    {
      profileStrength: 72,
      employabilityScore: 68,
      engagementScore: 65,
      gradeAverage: 14.2,
      attendanceAverage: 88,
      subjects: [],
      hasStartup: true,
      startupReadiness: 70,
      assignmentCompletionRate: 0.85,
      inferredSkills: ['analytical', 'communication', 'leadership'],
    },
    {
      nonNegotiables,
      preferredQualities,
      requiredSkills: allRequired,
      preferredSkills: allPreferred,
    }
  );

  try {
    const sampleStudent = await prisma.studentProfile.findFirst({
      where: {
        university: {
          partnerships: { some: { companyUserId, status: 'ACTIVE' } },
        },
      },
      select: { userId: true },
    });
    if (sampleStudent?.userId) {
      const sp = await buildStudentProfile(sampleStudent.userId);
      compatibilityPreview = computeCompanyStudentCompatibility(sp, {
        nonNegotiables,
        preferredQualities,
        requiredSkills: allRequired,
        preferredSkills: allPreferred,
      });
    }
  } catch {
    /* preview fallback */
  }

  const defaultWhyJoin = [
    { title: 'Growth opportunities', description: 'Structured paths from internship to full-time roles.' },
    { title: 'Mentorship', description: 'Learn directly from practitioners across the business.' },
    { title: 'Innovation culture', description: 'Work on real projects with measurable impact.' },
  ];
  const whyJoin = parseWhyJoin(presence.whyJoinJson);
  if (whyJoin.length === 0 && !presence.mission) {
    /* keep defaults for empty state */
  }

  return {
    hero: {
      logoUrl: profile?.logoUrl ?? null,
      companyName: profile?.companyName ?? user?.name ?? 'Your company',
      ownerName: presence.ownerName ?? user?.name ?? null,
      industry: profile?.industry ?? null,
      headquarters: profile?.headquarters ?? null,
      totalEmployees: presence.totalEmployees,
      partnerships,
      startupCollaborations: startupFollows,
      activeOpportunities: openRoles || internships,
      hiringActivity: hiringActivityLabel(presence.hiringActivity),
      cultureHeadline:
        presence.cultureHeadline ??
        'Designing technology for the next generation.',
    },
    culture: {
      mission: presence.mission,
      vision: presence.vision,
      values: parseJsonArray(presence.valuesJson),
      workPhilosophy: presence.workPhilosophy,
      whatWeLookFor: presence.whatWeLookFor,
      growthCulture: presence.growthCulture,
      leadershipStyles: parseJsonArray(presence.leadershipStyles),
    },
    nonNegotiables,
    preferredQualities,
    departments,
    roles,
    team,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      startsAt: e.startsAt.toISOString(),
      status: e.status,
      location: e.location,
    })),
    startupSection: {
      collaborations: startupFollows,
      mentorshipOffers: presence.startupCollaboration,
      challengeCount: await prisma.companyChallenge.count({ where: { companyUserId } }),
    },
    attractiveness: {
      score: attractiveness,
      studentInterest: Math.min(100, partnerships * 12 + openRoles * 5),
      applicationGrowth,
      eventEngagement: Math.min(100, events.length * 14),
      responseSpeed: pipelineCount > 5 ? 78 : 62,
      hiringSatisfaction: partnerships > 0 ? 80 : 55,
      mentorshipActivity: Math.min(100, startupFollows * 8),
    },
    whyJoin: whyJoin.length > 0 ? whyJoin : defaultWhyJoin,
    compatibilityPreview,
    previewStudentLabel: 'Ecosystem student preview',
    serverTime: new Date().toISOString(),
  };
}

export async function saveCompanyPresenceProfile(
  companyUserId: string,
  data: Record<string, unknown>
) {
  await getOrCreatePresence(companyUserId);
  await prisma.$executeRaw`
    UPDATE "CompanyPresenceProfile"
    SET
      "cultureHeadline" = ${typeof data.cultureHeadline === 'string' ? data.cultureHeadline : null},
      "ownerName" = ${typeof data.ownerName === 'string' ? data.ownerName : null},
      "totalEmployees" = ${typeof data.totalEmployees === 'number' ? data.totalEmployees : null},
      "hiringActivity" = ${typeof data.hiringActivity === 'string' ? data.hiringActivity : 'actively_hiring'},
      "mission" = ${typeof data.mission === 'string' ? data.mission : null},
      "vision" = ${typeof data.vision === 'string' ? data.vision : null},
      "valuesJson" = ${JSON.stringify(data.values ?? [])}::jsonb,
      "workPhilosophy" = ${typeof data.workPhilosophy === 'string' ? data.workPhilosophy : null},
      "whatWeLookFor" = ${typeof data.whatWeLookFor === 'string' ? data.whatWeLookFor : null},
      "growthCulture" = ${typeof data.growthCulture === 'string' ? data.growthCulture : null},
      "leadershipStyles" = ${JSON.stringify(data.leadershipStyles ?? [])}::jsonb,
      "nonNegotiables" = ${JSON.stringify(data.nonNegotiables ?? [])}::jsonb,
      "preferredQualities" = ${JSON.stringify(data.preferredQualities ?? [])}::jsonb,
      "whyJoinJson" = ${JSON.stringify(data.whyJoin ?? [])}::jsonb,
      "startupCollaboration" = ${typeof data.startupCollaboration === 'string' ? data.startupCollaboration : null},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "companyUserId" = ${companyUserId}
  `;
}

async function loadPositionHolderSnapshot(
  positionHolderId: string | null,
  departmentName: string
): Promise<PositionHolderData | null> {
  if (!positionHolderId) return null;
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
      FROM "CompanyTeamMember" WHERE "id" = ${positionHolderId} LIMIT 1
    `;
    const h = rows[0];
    if (!h) return null;
    return {
      id: h.id,
      photoUrl: h.photoUrl,
      name: h.name,
      age: h.age,
      roleTitle: h.roleTitle ?? '',
      departmentName,
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
  } catch {
    return null;
  }
}

async function syncRoleToInternship(companyUserId: string, roleId: string) {
  const rows = await prisma.$queryRaw<
    {
      title: string;
      description: string | null;
      departmentId: string | null;
      remoteType: string;
      location: string | null;
      salaryMin: number | null;
      salaryMax: number | null;
      requiredSkills: unknown;
      isFilled: boolean;
      currentlyHiring: boolean | null;
      internshipId: string | null;
      roleType: string;
      positionHolderId: string | null;
    }[]
  >`
    SELECT "title", "description", "departmentId", "remoteType", "location",
           "salaryMin", "salaryMax", "requiredSkills", "isFilled", "currentlyHiring", "internshipId", "roleType",
           "positionHolderId"
    FROM "CompanyRole" WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
  const role = rows[0];
  if (!role) return;

  const skills = parseJsonArray(role.requiredSkills);
  let departmentName = 'General';
  if (role.departmentId) {
    const deptRows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT "name" FROM "CompanyDepartment" WHERE "id" = ${role.departmentId} LIMIT 1
    `;
    departmentName = deptRows[0]?.name ?? 'General';
  }
  const partnership = await prisma.companyPartnership.findFirst({
    where: { companyUserId, status: 'ACTIVE' },
    select: { id: true, universityId: true },
  });

  const statusRow = await prisma.$queryRaw<{ status: string }[]>`
    SELECT "status" FROM "CompanyRole" WHERE "id" = ${roleId} LIMIT 1
  `;
  if (statusRow[0]?.status === 'archived') {
    if (role.internshipId) {
      await prisma.internship.update({
        where: { id: role.internshipId },
        data: { status: 'ARCHIVED' },
      });
    }
    return;
  }

  const availability = role.isFilled ? 'filled' : 'available';
  const activelyHiring = parseCurrentlyHiring(role.currentlyHiring, role.isFilled);
  const positionHolder = await loadPositionHolderSnapshot(
    role.positionHolderId as string | null,
    departmentName
  );
  const positionHolderJson = positionHolder ? JSON.stringify(positionHolder) : null;
  const payload = {
    title: role.title,
    description: role.description,
    department: departmentName,
    remoteType: role.remoteType,
    location: role.location,
    salaryMin: role.salaryMin,
    salaryMax: role.salaryMax,
    recommendedSkills: skills,
    availabilityStatus: availability,
    employmentType: role.roleType,
    universityId: partnership?.universityId ?? null,
    partnershipId: partnership?.id ?? null,
    status: 'ACTIVE' as const,
  };

  if (role.internshipId) {
    await prisma.internship.update({
      where: { id: role.internshipId },
      data: payload,
    });
    await prisma.$executeRaw`
      UPDATE "Internship" SET "currentlyHiring" = ${activelyHiring} WHERE "id" = ${role.internshipId}
    `;
    if (positionHolderJson != null) {
      await prisma.$executeRaw`
        UPDATE "Internship" SET "positionHolderJson" = ${positionHolderJson}::jsonb
        WHERE "id" = ${role.internshipId}
      `;
    }
  } else {
    const internship = await prisma.internship.create({
      data: {
        companyUserId,
        ...payload,
        department: departmentName,
      },
    });
    await prisma.$executeRaw`
      UPDATE "Internship" SET "currentlyHiring" = ${activelyHiring} WHERE "id" = ${internship.id}
    `;
    await prisma.$executeRaw`
      UPDATE "CompanyRole" SET "internshipId" = ${internship.id} WHERE "id" = ${roleId}
    `;
    if (positionHolderJson != null) {
      await prisma.$executeRaw`
        UPDATE "Internship" SET "positionHolderJson" = ${positionHolderJson}::jsonb
        WHERE "id" = ${internship.id}
      `;
    }
  }
}

export async function syncRolePositionHolder(
  companyUserId: string,
  roleId: string,
  departmentId: string | null,
  departmentName: string,
  roleTitle: string,
  holder: Record<string, unknown>
) {
  await ensureCompanyPresenceTables();
  const holderName = String(holder.name ?? '').trim();
  if (!isRealPersonName(holderName)) return null;
  const memberId = await upsertCompanyTeamMember(companyUserId, {
    id: typeof holder.id === 'string' ? holder.id : undefined,
    name: holderName,
    photoUrl: typeof holder.photoUrl === 'string' ? holder.photoUrl : null,
    age: typeof holder.age === 'number' ? holder.age : holder.age ? Number(holder.age) : null,
    roleTitle,
    departmentId,
    memberType: 'position_holder',
    previousUniversity:
      typeof holder.previousUniversity === 'string' ? holder.previousUniversity : null,
    degree: typeof holder.degree === 'string' ? holder.degree : null,
    graduationYear: typeof holder.graduationYear === 'string' ? holder.graduationYear : null,
    bio: typeof holder.bio === 'string' ? holder.bio : null,
    linkedInUrl: typeof holder.linkedInUrl === 'string' ? holder.linkedInUrl : null,
    portfolioUrl: typeof holder.linkedInUrl === 'string' ? holder.linkedInUrl : null,
    startedAt: typeof holder.startedAt === 'string' ? holder.startedAt : null,
    careerPath: typeof holder.careerPath === 'string' ? holder.careerPath : null,
    mentoringAvailable: Boolean(holder.mentoringAvailable),
    messagesAvailable: Boolean(holder.messagesAvailable),
    companyRoleId: roleId,
  });
  await prisma.$executeRaw`
    UPDATE "CompanyRole" SET "positionHolderId" = ${memberId}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
  return memberId;
}

export async function upsertCompanyRole(
  companyUserId: string,
  role: Record<string, unknown> & { id?: string }
) {
  await ensureCompanyPresenceTables();
  const id = typeof role.id === 'string' ? role.id : newId();
  const exists = typeof role.id === 'string';
  const roleStatus = role.roleStatus === 'filled' || role.roleStatus === 'hiring' ? role.roleStatus : null;
  const isFilled =
    roleStatus === 'filled' ? true : roleStatus === 'hiring' ? false : Boolean(role.isFilled);
  const currentlyHiring = parseCurrentlyHiring(role.currentlyHiring, isFilled);

  const sql = exists
    ? prisma.$executeRaw`
        UPDATE "CompanyRole" SET
          "departmentId" = ${typeof role.departmentId === 'string' ? role.departmentId : null},
          "title" = ${String(role.title ?? 'Role')},
          "roleType" = ${String(role.roleType ?? 'internship')},
          "description" = ${typeof role.description === 'string' ? role.description : null},
          "responsibilities" = ${typeof role.responsibilities === 'string' ? role.responsibilities : null},
          "expectations" = ${typeof role.expectations === 'string' ? role.expectations : null},
          "requiredSkills" = ${JSON.stringify(role.requiredSkills ?? [])}::jsonb,
          "preferredSkills" = ${JSON.stringify(role.preferredSkills ?? [])}::jsonb,
          "nonNegotiables" = ${JSON.stringify(role.nonNegotiables ?? [])}::jsonb,
          "preferredQualities" = ${JSON.stringify(role.preferredQualities ?? [])}::jsonb,
          "growthOpportunities" = ${typeof role.growthOpportunities === 'string' ? role.growthOpportunities : null},
          "salaryMin" = ${typeof role.salaryMin === 'number' ? role.salaryMin : null},
          "salaryMax" = ${typeof role.salaryMax === 'number' ? role.salaryMax : null},
          "remoteType" = ${String(role.remoteType ?? 'hybrid')},
          "location" = ${typeof role.location === 'string' ? role.location : null},
          "startDate" = ${role.startDate ? new Date(String(role.startDate)) : null},
          "isFilled" = ${isFilled},
          "currentlyHiring" = ${currentlyHiring},
          "status" = ${String(role.status ?? 'published')},
          "hiringPriority" = ${String(role.hiringPriority ?? 'normal')},
          "visibilitySettings" = ${JSON.stringify(role.visibilitySettings ?? { allStudents: true })}::jsonb,
          "applicationSettings" = ${JSON.stringify(role.applicationSettings ?? {})}::jsonb,
          "structuredRequirements" = ${JSON.stringify(role.structuredRequirements ?? [])}::jsonb,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "companyUserId" = ${companyUserId}
      `
    : prisma.$executeRaw`
        INSERT INTO "CompanyRole" (
          "id", "companyUserId", "departmentId", "title", "roleType", "description",
          "responsibilities", "expectations", "requiredSkills", "preferredSkills",
          "nonNegotiables", "preferredQualities", "growthOpportunities",
          "salaryMin", "salaryMax", "remoteType", "location", "startDate", "isFilled", "currentlyHiring", "status",
          "hiringPriority", "visibilitySettings", "applicationSettings", "structuredRequirements"
        ) VALUES (
          ${id}, ${companyUserId},
          ${typeof role.departmentId === 'string' ? role.departmentId : null},
          ${String(role.title ?? 'New role')},
          ${String(role.roleType ?? 'internship')},
          ${typeof role.description === 'string' ? role.description : null},
          ${typeof role.responsibilities === 'string' ? role.responsibilities : null},
          ${typeof role.expectations === 'string' ? role.expectations : null},
          ${JSON.stringify(role.requiredSkills ?? [])}::jsonb,
          ${JSON.stringify(role.preferredSkills ?? [])}::jsonb,
          ${JSON.stringify(role.nonNegotiables ?? [])}::jsonb,
          ${JSON.stringify(role.preferredQualities ?? [])}::jsonb,
          ${typeof role.growthOpportunities === 'string' ? role.growthOpportunities : null},
          ${typeof role.salaryMin === 'number' ? role.salaryMin : null},
          ${typeof role.salaryMax === 'number' ? role.salaryMax : null},
          ${String(role.remoteType ?? 'hybrid')},
          ${typeof role.location === 'string' ? role.location : null},
          ${role.startDate ? new Date(String(role.startDate)) : null},
          ${isFilled},
          ${currentlyHiring},
          ${String(role.status ?? 'published')},
          ${String(role.hiringPriority ?? 'normal')},
          ${JSON.stringify(role.visibilitySettings ?? { allStudents: true })}::jsonb,
          ${JSON.stringify(role.applicationSettings ?? {})}::jsonb,
          ${JSON.stringify(role.structuredRequirements ?? [])}::jsonb
        )
      `;

  await sql;

  if (isFilled && role.positionHolder && typeof role.positionHolder === 'object') {
    const deptId = typeof role.departmentId === 'string' ? role.departmentId : null;
    let departmentName = 'General';
    if (deptId) {
      const d = await prisma.$queryRaw<{ name: string }[]>`
        SELECT "name" FROM "CompanyDepartment" WHERE "id" = ${deptId} LIMIT 1
      `;
      departmentName = d[0]?.name ?? departmentName;
    }
    await syncRolePositionHolder(
      companyUserId,
      id,
      deptId,
      departmentName,
      String(role.title ?? 'Role'),
      role.positionHolder as Record<string, unknown>
    );
  } else if (!isFilled) {
    const prevHolder = await prisma.$queryRaw<{ positionHolderId: string | null }[]>`
      SELECT "positionHolderId" FROM "CompanyRole" WHERE "id" = ${id} AND "companyUserId" = ${companyUserId} LIMIT 1
    `;
    const previousHolderId = prevHolder[0]?.positionHolderId ?? null;
    await prisma.$executeRaw`
      UPDATE "CompanyRole" SET "positionHolderId" = NULL WHERE "id" = ${id}
    `;
    if (previousHolderId) {
      await prunePositionHolderAfterRoleUnfilled(companyUserId, id, previousHolderId);
    }
  }

  await syncRoleToInternship(companyUserId, id);
  return id;
}

/** Keep linked internships aligned with role recruitment flags (fixes stale Opportunities labels). */
export async function syncCompanyRoleHiringToInternships(companyUserId: string): Promise<void> {
  await ensureCompanyPresenceTables();
  const rows = await prisma.$queryRaw<
    { internshipId: string; currentlyHiring: boolean | null; isFilled: boolean }[]
  >`
    SELECT "internshipId", "currentlyHiring", "isFilled"
    FROM "CompanyRole"
    WHERE "companyUserId" = ${companyUserId}
      AND "internshipId" IS NOT NULL
      AND "status" != 'archived'
  `;
  for (const row of rows) {
    const flag = parseCurrentlyHiring(row.currentlyHiring, row.isFilled);
    await prisma.$executeRaw`
      UPDATE "Internship"
      SET "currentlyHiring" = ${flag}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${row.internshipId}
    `;
  }
}

export async function setCompanyRoleCurrentlyHiring(
  companyUserId: string,
  roleId: string,
  currentlyHiring: boolean
) {
  await ensureCompanyPresenceTables();
  await prisma.$executeRaw`
    UPDATE "CompanyRole"
    SET "currentlyHiring" = ${currentlyHiring}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId} AND "isFilled" = false
  `;
  await syncRoleToInternship(companyUserId, roleId);
}

export async function deleteCompanyRole(companyUserId: string, roleId: string) {
  const rows = await prisma.$queryRaw<{ internshipId: string | null; positionHolderId: string | null }[]>`
    SELECT "internshipId", "positionHolderId" FROM "CompanyRole"
    WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
  await pruneTeamMembersExclusiveToRole(companyUserId, roleId, rows[0]?.positionHolderId ?? null);
  await prisma.$executeRaw`
    DELETE FROM "CompanyRole" WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
  if (rows[0]?.internshipId) {
    try {
      await prisma.internship.delete({ where: { id: rows[0].internshipId } });
    } catch {
      /* may have applications */
    }
  }
}

export async function upsertCompanyDepartment(
  companyUserId: string,
  dept: { id?: string; name: string; description?: string; occupiedCount?: number; openCount?: number }
) {
  await ensureCompanyPresenceTables();
  const id = dept.id ?? newId();
  if (dept.id) {
    await prisma.$executeRaw`
      UPDATE "CompanyDepartment" SET
        "name" = ${dept.name},
        "description" = ${dept.description ?? null},
        "occupiedCount" = ${dept.occupiedCount ?? 0},
        "openCount" = ${dept.openCount ?? 0},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id} AND "companyUserId" = ${companyUserId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "CompanyDepartment" ("id", "companyUserId", "name", "description", "occupiedCount", "openCount")
      VALUES (${id}, ${companyUserId}, ${dept.name}, ${dept.description ?? null}, ${dept.occupiedCount ?? 0}, ${dept.openCount ?? 0})
    `;
  }
  return id;
}

export async function upsertCompanyTeamMember(
  companyUserId: string,
  member: Record<string, unknown> & { id?: string }
) {
  await ensureCompanyPresenceTables();
  const id = typeof member.id === 'string' ? member.id : newId();
  const startedAt =
    typeof member.startedAt === 'string' && member.startedAt
      ? new Date(member.startedAt)
      : null;
  const common = {
    name: String(member.name ?? ''),
    photoUrl: typeof member.photoUrl === 'string' ? member.photoUrl : null,
    age: typeof member.age === 'number' ? member.age : null,
    roleTitle: typeof member.roleTitle === 'string' ? member.roleTitle : null,
    memberType: String(member.memberType ?? 'employee'),
    previousUniversity:
      typeof member.previousUniversity === 'string' ? member.previousUniversity : null,
    degree: typeof member.degree === 'string' ? member.degree : null,
    bio: typeof member.bio === 'string' ? member.bio : null,
    departmentId: typeof member.departmentId === 'string' ? member.departmentId : null,
    graduationYear: typeof member.graduationYear === 'string' ? member.graduationYear : null,
    linkedInUrl: typeof member.linkedInUrl === 'string' ? member.linkedInUrl : null,
    portfolioUrl: typeof member.portfolioUrl === 'string' ? member.portfolioUrl : null,
    startedAt,
    careerPath: typeof member.careerPath === 'string' ? member.careerPath : null,
    mentoringAvailable: Boolean(member.mentoringAvailable),
    messagesAvailable: Boolean(member.messagesAvailable),
    companyRoleId: typeof member.companyRoleId === 'string' ? member.companyRoleId : null,
  };
  if (member.id) {
    await prisma.$executeRaw`
      UPDATE "CompanyTeamMember" SET
        "name" = ${common.name},
        "photoUrl" = ${common.photoUrl},
        "age" = ${common.age},
        "roleTitle" = ${common.roleTitle},
        "memberType" = ${common.memberType},
        "previousUniversity" = ${common.previousUniversity},
        "degree" = ${common.degree},
        "bio" = ${common.bio},
        "departmentId" = ${common.departmentId},
        "graduationYear" = ${common.graduationYear},
        "linkedInUrl" = ${common.linkedInUrl},
        "portfolioUrl" = ${common.portfolioUrl},
        "startedAt" = ${common.startedAt},
        "careerPath" = ${common.careerPath},
        "mentoringAvailable" = ${common.mentoringAvailable},
        "messagesAvailable" = ${common.messagesAvailable},
        "companyRoleId" = ${common.companyRoleId}
      WHERE "id" = ${id} AND "companyUserId" = ${companyUserId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "CompanyTeamMember" (
        "id", "companyUserId", "name", "photoUrl", "age", "roleTitle",
        "memberType", "previousUniversity", "degree", "bio", "departmentId",
        "graduationYear", "linkedInUrl", "portfolioUrl", "startedAt", "careerPath",
        "mentoringAvailable", "messagesAvailable", "companyRoleId"
      ) VALUES (
        ${id}, ${companyUserId}, ${common.name}, ${common.photoUrl}, ${common.age},
        ${common.roleTitle}, ${common.memberType}, ${common.previousUniversity},
        ${common.degree}, ${common.bio}, ${common.departmentId},
        ${common.graduationYear}, ${common.linkedInUrl}, ${common.portfolioUrl},
        ${common.startedAt}, ${common.careerPath}, ${common.mentoringAvailable},
        ${common.messagesAvailable}, ${common.companyRoleId}
      )
    `;
  }
  return id;
}

export async function deleteCompanyTeamMember(companyUserId: string, memberId: string) {
  await prisma.$executeRaw`
    DELETE FROM "CompanyTeamMember" WHERE "id" = ${memberId} AND "companyUserId" = ${companyUserId}
  `;
}

/** Student-facing presence overlay for partnership detail pages */
export async function loadCompanyPresenceForStudent(
  companyUserId: string,
  studentUserId: string
) {
  const hub = await loadCompanyPresenceHub(companyUserId);
  let compatibility = hub.compatibilityPreview;
  try {
    const profile = await buildStudentProfile(studentUserId);
    compatibility = computeCompanyStudentCompatibility(profile, {
      nonNegotiables: hub.nonNegotiables,
      preferredQualities: hub.preferredQualities,
      requiredSkills: hub.roles.flatMap((r) => r.requiredSkills),
      preferredSkills: hub.roles.flatMap((r) => r.preferredSkills),
    });
  } catch {
    /* keep preview */
  }
  return { ...hub, compatibility, previewStudentLabel: 'Your compatibility' };
}
