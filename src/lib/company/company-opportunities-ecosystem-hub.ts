import { prisma } from '@/lib/db';
import { ensureCompanyOpportunitiesEcosystemTables } from '@/lib/db/ensure-company-opportunities-ecosystem-schema';
import { ensureOpportunityTables } from '@/lib/db/ensure-opportunities-schema';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';
import {
  parseCurrentlyHiring,
  quickApplicantCompatibility,
} from '@/lib/company/company-presence-shared';
import { syncCompanyRoleHiringToInternships } from '@/lib/company/company-presence-hub';
import { upsertPipelineCandidate } from '@/lib/company/company-pipeline-hub';
import {
  availabilityLabel,
  buildOpportunitySignals,
  formatSalaryRange,
  hiringUrgencyLabel,
  parseEcosystemJson,
  remoteLabel,
  resolveAvailability,
  resolveOpportunityCategory,
  type OpportunityAvailability,
  type OpportunityCategoryId,
  type OpportunityEcosystemJson,
  OPPORTUNITY_CATEGORIES,
} from '@/lib/company/company-opportunities-intelligence';
import { updateCompanyApplication } from '@/lib/company/company-opportunities-hub';

export interface OpportunityHeroMetric {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  trend?: 'up' | 'steady';
}

export interface OpportunityEcosystemCard {
  id: string;
  roleId: string | null;
  title: string;
  department: string;
  category: OpportunityCategoryId;
  categoryLabel: string;
  compatibilityAvg: number | null;
  applicationsCount: number;
  applicationsThisWeek: number;
  hiringUrgency: string;
  currentlyHiring: boolean;
  remoteType: string;
  remoteLabel: string;
  duration: string | null;
  salaryLabel: string | null;
  requiredSkills: string[];
  startupAlignment: number;
  leadershipAlignment: number;
  status: OpportunityAvailability;
  statusLabel: string;
  signals: string[];
  bookmarkCount: number;
  profileViews: number;
  linkedPreviewCount: number;
  linkedOfficialCount: number;
  deadline: string | null;
  href: string;
}

export interface OpportunityLinkedStudent {
  linkId: string;
  studentUserId: string;
  linkType: 'preview' | 'official';
  name: string;
  image: string | null;
  universityName: string;
  program: string | null;
  compatibility: number | null;
  leadershipScore: number;
  startupInvolvement: string | null;
  profileStrength: number;
  networkingScore: number;
  growthPercent: number;
  notes: string | null;
  createdAt: string;
}

export interface OpportunityDetail {
  card: OpportunityEcosystemCard;
  description: string | null;
  narrative: OpportunityEcosystemJson;
  intelligence: {
    compatibilityDistribution: { range: string; count: number }[];
    strongestUniversities: { name: string; count: number }[];
    strongestDegrees: { name: string; count: number }[];
    leadershipDensity: number;
    startupFounderDensity: number;
    applicationQuality: number;
    interestGrowth: number;
    saves: number;
    follows: number;
    profileViews: number;
  };
  interestSignals: string[];
  connectedEvents: { id: string; title: string; startsAt: string; href: string }[];
  timeline: { label: string; date: string | null; kind: string }[];
  linkedStudents: OpportunityLinkedStudent[];
  applications: {
    applicationId: string;
    studentUserId: string;
    studentName: string;
    status: string;
    compatibility: number | null;
    appliedAt: string | null;
  }[];
}

export interface CompanyOpportunitiesEcosystemHub {
  companyName: string;
  heroTitle: string;
  heroMetrics: OpportunityHeroMetric[];
  categories: typeof OPPORTUNITY_CATEGORIES;
  opportunities: OpportunityEcosystemCard[];
  byCategory: Record<string, OpportunityEcosystemCard[]>;
  featuredSignals: string[];
  serverTime: string;
}

function weekAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

async function loadInternshipRows(companyUserId: string) {
  await ensureCompanyOpportunitiesEcosystemTables();
  await ensureOpportunityTables();
  await syncCompanyRoleHiringToInternships(companyUserId);

  const internships = await prisma.internship.findMany({
    where: { companyUserId, status: { not: 'ARCHIVED' } },
    include: {
      _count: { select: { applications: true, bookmarks: true } },
      applications: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
              university: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const [roleRows, internshipHiringRows] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        internshipId: string | null;
        roleType: string;
        isFilled: boolean;
        currentlyHiring: boolean | null;
        departmentId: string | null;
      }[]
    >`
      SELECT "id", "internshipId", "roleType", "isFilled", "currentlyHiring", "departmentId"
      FROM "CompanyRole"
      WHERE "companyUserId" = ${companyUserId} AND "status" != 'archived'
    `,
    prisma.$queryRaw<{ id: string; currentlyHiring: boolean | null }[]>`
      SELECT "id", "currentlyHiring"
      FROM "Internship"
      WHERE "companyUserId" = ${companyUserId} AND "status" != 'ARCHIVED'
    `.catch(() => [] as { id: string; currentlyHiring: boolean | null }[]),
  ]);

  const internshipHiringById = new Map(
    internshipHiringRows.map((r) => [r.id, parseCurrentlyHiring(r.currentlyHiring)])
  );

  const roleByInternship = new Map(
    roleRows.filter((r) => r.internshipId).map((r) => [r.internshipId!, r])
  );

  let links: { internshipId: string; linkType: string; studentUserId: string }[] = [];
  try {
    links = await prisma.$queryRaw`
      SELECT "internshipId", "linkType", "studentUserId"
      FROM "CompanyOpportunityStudentLink"
      WHERE "companyUserId" = ${companyUserId} AND "archivedAt" IS NULL
    `;
  } catch {
    links = [];
  }

  return { internships, roleByInternship, internshipHiringById, links };
}

function buildCardFromInternship(
  i: Awaited<ReturnType<typeof loadInternshipRows>>['internships'][0],
  role:
    | {
        id: string;
        roleType: string;
        isFilled: boolean;
        currentlyHiring: boolean | null;
      }
    | undefined,
  internshipHiringById: Map<string, boolean>,
  links: { internshipId: string; linkType: string }[]
): OpportunityEcosystemCard {
  const weekStart = weekAgo();
  const appsThisWeek = i.applications.filter(
    (a) => a.appliedAt && a.appliedAt >= weekStart
  ).length;
  const compatScores = i.applications.map((a) =>
    quickApplicantCompatibility(a.student.employabilityScore, a.student.profileStrength)
  );
  const compatibilityAvg =
    compatScores.length > 0
      ? Math.round(compatScores.reduce((s, v) => s + v, 0) / compatScores.length)
      : null;

  const degreeCounts = new Map<string, number>();
  for (const a of i.applications) {
    const deg = a.student.course?.name ?? a.student.university?.name;
    if (deg) degreeCounts.set(deg, (degreeCounts.get(deg) ?? 0) + 1);
  }
  const topDegree =
    [...degreeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const prevWeekApps = Math.max(1, i.applications.length - appsThisWeek);
  const growthPercent =
    appsThisWeek > 0 ? Math.round((appsThisWeek / prevWeekApps) * 100) : 0;

  let opportunityCategory: string | null = null;
  let hiringPriority: string | null = null;
  let opensAt: Date | null = null;
  let isFutureOpening = false;
  let ecosystemJson: unknown = null;
  try {
    const ext = i as typeof i & {
      opportunityCategory?: string | null;
      hiringPriority?: string | null;
      opensAt?: Date | null;
      isFutureOpening?: boolean;
      ecosystemJson?: unknown;
      companyRoleId?: string | null;
    };
    opportunityCategory = ext.opportunityCategory ?? null;
    hiringPriority = ext.hiringPriority ?? null;
    opensAt = ext.opensAt ?? null;
    isFutureOpening = Boolean(ext.isFutureOpening);
    ecosystemJson = ext.ecosystemJson ?? null;
  } catch {
    /* columns may be absent before migration */
  }

  const meta = parseEcosystemJson(ecosystemJson);
  const startupAlignment = meta.cultureAlignment?.includes('startup') ? 78 : 52 + (i._count.applications % 30);
  const leadershipAlignment = role?.roleType === 'leadership' ? 82 : 48 + (compatScores[0] ?? 50) % 35;

  const isFilled = i.availabilityStatus === 'filled' || Boolean(role?.isFilled);
  const currentlyHiring = role
    ? parseCurrentlyHiring(role.currentlyHiring, isFilled)
    : (internshipHiringById.get(i.id) ?? true);
  const status = resolveAvailability(isFilled, isFutureOpening, opensAt);
  const category = resolveOpportunityCategory(
    role?.roleType ?? i.employmentType,
    opportunityCategory,
    isFutureOpening || status === 'future'
  );
  const categoryLabel =
    OPPORTUNITY_CATEGORIES.find((c) => c.id === category)?.label ?? category;

  const internshipLinks = links.filter(
    (l) => 'internshipId' in l && l.internshipId === i.id
  );

  return {
    id: i.id,
    roleId: role?.id ?? null,
    title: i.title,
    department: i.department ?? 'General',
    category,
    categoryLabel,
    compatibilityAvg,
    applicationsCount: i._count.applications,
    applicationsThisWeek: appsThisWeek,
    hiringUrgency: hiringUrgencyLabel(hiringPriority, isFilled, currentlyHiring),
    currentlyHiring,
    remoteType: i.remoteType ?? 'on_site',
    remoteLabel: remoteLabel(i.remoteType),
    duration: i.duration,
    salaryLabel: formatSalaryRange(i.salaryMin, i.salaryMax),
    requiredSkills: i.recommendedSkills ?? [],
    startupAlignment,
    leadershipAlignment,
    status,
    statusLabel: availabilityLabel(status, currentlyHiring),
    signals: buildOpportunitySignals({
      applicationsThisWeek: appsThisWeek,
      applicationsCount: i._count.applications,
      bookmarkCount: i._count.bookmarks,
      compatibilityAvg,
      topDegree,
      growthPercent,
      startupAlignment,
      leadershipAlignment,
    }),
    bookmarkCount: i._count.bookmarks,
    profileViews: Math.max(i._count.bookmarks * 2, i._count.applications),
    linkedPreviewCount: internshipLinks.filter((l) => l.linkType === 'preview').length,
    linkedOfficialCount: internshipLinks.filter((l) => l.linkType === 'official').length,
    deadline: i.deadline?.toISOString() ?? null,
    href: `/company/opportunities?opportunity=${i.id}`,
  };
}

export async function loadCompanyOpportunitiesEcosystemHub(
  companyUserId: string
): Promise<CompanyOpportunitiesEcosystemHub> {
  const [user, companyProfile, data] = await Promise.all([
    prisma.user.findUnique({
      where: { id: companyUserId },
      select: { name: true },
    }),
    prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: { companyName: true },
    }),
    loadInternshipRows(companyUserId),
  ]);

  const companyName =
    companyProfile?.companyName ?? user?.name ?? 'Your company';

  const opportunities = data.internships.map((i) => {
    const role = data.roleByInternship.get(i.id);
    return buildCardFromInternship(i, role, data.internshipHiringById, data.links);
  });

  const byCategory: Record<string, OpportunityEcosystemCard[]> = {};
  for (const cat of OPPORTUNITY_CATEGORIES) {
    byCategory[cat.id] = opportunities.filter((o) => o.category === cat.id);
  }

  const openCount = opportunities.filter((o) => o.status === 'open').length;
  const appsWeek = opportunities.reduce((s, o) => s + o.applicationsThisWeek, 0);
  const deptActivity = new Map<string, number>();
  for (const o of opportunities) {
    deptActivity.set(o.department, (deptActivity.get(o.department) ?? 0) + o.applicationsCount);
  }
  const topDept = [...deptActivity.entries()].sort((a, b) => b[1] - a[1])[0];
  const startupCount = opportunities.filter(
    (o) => o.category === 'startup_collaboration'
  ).length;
  const deadlines = opportunities.filter((o) => o.deadline).length;
  const futureCount = opportunities.filter((o) => o.status === 'future').length;

  const heroMetrics: OpportunityHeroMetric[] = [
    { id: 'open', label: 'Open opportunities', value: openCount, trend: 'steady' },
    {
      id: 'activity',
      label: 'Hiring activity',
      value: appsWeek,
      hint: 'Applications this week',
      trend: appsWeek > 0 ? 'up' : 'steady',
    },
    {
      id: 'dept',
      label: 'Most active department',
      value: topDept?.[0] ?? '—',
      hint: topDept ? `${topDept[1]} applications` : undefined,
    },
    {
      id: 'degrees',
      label: 'Top aligned degrees',
      value: opportunities[0]?.signals.find((s) => s.includes('compatibility'))?.split(' with ')[1]?.replace(' students', '') ?? 'Building…',
    },
    {
      id: 'internships',
      label: 'Internship programs',
      value: byCategory.internship?.length ?? 0,
    },
    {
      id: 'startup',
      label: 'Startup collaborations',
      value: startupCount,
    },
    {
      id: 'deadlines',
      label: 'Upcoming deadlines',
      value: deadlines,
    },
    {
      id: 'future',
      label: 'Future openings',
      value: futureCount,
    },
  ];

  const featuredSignals = opportunities
    .flatMap((o) => o.signals)
    .slice(0, 6);

  return {
    companyName,
    heroTitle: `Opportunities at ${companyName}`,
    heroMetrics,
    categories: OPPORTUNITY_CATEGORIES,
    opportunities,
    byCategory,
    featuredSignals,
    serverTime: new Date().toISOString(),
  };
}

export async function loadOpportunityDetail(
  companyUserId: string,
  internshipId: string
): Promise<OpportunityDetail | null> {
  const hub = await loadCompanyOpportunitiesEcosystemHub(companyUserId);
  const card = hub.opportunities.find((o) => o.id === internshipId);
  if (!card) return null;

  const internship = await prisma.internship.findFirst({
    where: { id: internshipId, companyUserId },
    include: {
      applications: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
              university: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
      _count: { select: { bookmarks: true } },
    },
  });
  if (!internship) return null;

  let ecosystemJson: unknown = null;
  try {
    const rows = await prisma.$queryRaw<{ ecosystemJson: unknown }[]>`
      SELECT "ecosystemJson" FROM "Internship" WHERE "id" = ${internshipId} LIMIT 1
    `;
    ecosystemJson = rows[0]?.ecosystemJson;
  } catch {
    ecosystemJson = null;
  }
  const narrative = parseEcosystemJson(ecosystemJson);
  if (!narrative.whyExists && internship.description) {
    narrative.whyExists = internship.description.slice(0, 400);
  }

  const uniCounts = new Map<string, number>();
  const degCounts = new Map<string, number>();
  const compatBuckets = [0, 0, 0, 0];
  let leadershipSum = 0;
  let startupSum = 0;

  const applications = internship.applications.map((a) => {
    const compat = quickApplicantCompatibility(
      a.student.employabilityScore,
      a.student.profileStrength
    );
    const idx = compat < 60 ? 0 : compat < 75 ? 1 : compat < 85 ? 2 : 3;
    compatBuckets[idx]++;
    leadershipSum += a.student.profileStrength > 70 ? 1 : 0;
    startupSum += a.student.employabilityScore > 75 ? 1 : 0;
    const uni = a.student.university?.name;
    if (uni) uniCounts.set(uni, (uniCounts.get(uni) ?? 0) + 1);
    const deg = a.student.course?.name;
    if (deg) degCounts.set(deg, (degCounts.get(deg) ?? 0) + 1);
    return {
      applicationId: a.id,
      studentUserId: a.student.userId,
      studentName: a.student.user.name ?? 'Student',
      status: a.status,
      compatibility: compat,
      appliedAt: a.appliedAt?.toISOString() ?? null,
    };
  });

  const linkedRows = await prisma.$queryRaw<
    {
      id: string;
      studentUserId: string;
      linkType: string;
      notes: string | null;
      createdAt: Date;
    }[]
  >`
    SELECT "id", "studentUserId", "linkType", "notes", "createdAt"
    FROM "CompanyOpportunityStudentLink"
    WHERE "companyUserId" = ${companyUserId}
      AND "internshipId" = ${internshipId}
      AND "archivedAt" IS NULL
    ORDER BY "createdAt" DESC
  `.catch(() => [] as never[]);

  const linkedStudents: OpportunityLinkedStudent[] = [];
  for (const row of linkedRows) {
    const profile = await buildCompanyCandidateCard(row.studentUserId, companyUserId);
    if (!profile) continue;
    linkedStudents.push({
      linkId: row.id,
      studentUserId: row.studentUserId,
      linkType: row.linkType === 'official' ? 'official' : 'preview',
      name: profile.name,
      image: profile.image,
      universityName: profile.universityName,
      program: profile.program,
      compatibility: profile.compatibilityScore,
      leadershipScore: profile.leadershipScore,
      startupInvolvement: profile.startupInvolvement,
      profileStrength: profile.profileStrength,
      networkingScore: profile.networkingScore,
      growthPercent: profile.growthPercent,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
    });
  }

  const eventIds = narrative.linkedEventIds ?? [];
  const events = eventIds.length
    ? await prisma.companyEvent.findMany({
        where: { id: { in: eventIds }, companyUserId },
        select: { id: true, title: true, startsAt: true },
      })
    : await prisma.companyEvent.findMany({
        where: { companyUserId, status: 'approved', startsAt: { gte: new Date() } },
        select: { id: true, title: true, startsAt: true },
        orderBy: { startsAt: 'asc' },
        take: 4,
      });

  const connectedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.startsAt.toISOString(),
    href: `/company/events`,
  }));

  const tl = narrative.timeline ?? {};
  const timeline = [
    { label: 'Opening', date: tl.openDate ?? internship.createdAt.toISOString(), kind: 'open' },
    { label: 'Application deadline', date: tl.deadline ?? internship.deadline?.toISOString() ?? null, kind: 'deadline' },
    { label: 'Interview phase', date: tl.interviewPhase ?? null, kind: 'interview' },
    { label: 'Estimated hiring', date: tl.hiringEstimate ?? null, kind: 'hire' },
    { label: 'Connected events', date: tl.eventTimeline ?? null, kind: 'events' },
  ];

  const interestSignals = [
    `${internship._count.bookmarks} saves`,
    `${card.linkedOfficialCount} official company links`,
    `${card.profileViews} profile views (est.)`,
    card.applicationsThisWeek > 0 ? `+${card.applicationsThisWeek} interest growth this week` : 'Interest building',
    connectedEvents.length > 0 ? `${connectedEvents.length} connected events` : 'Link events to boost engagement',
  ];

  return {
    card,
    description: internship.description,
    narrative,
    intelligence: {
      compatibilityDistribution: [
        { range: '50–59%', count: compatBuckets[0] },
        { range: '60–74%', count: compatBuckets[1] },
        { range: '75–84%', count: compatBuckets[2] },
        { range: '85%+', count: compatBuckets[3] },
      ],
      strongestUniversities: [...uniCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      strongestDegrees: [...degCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      leadershipDensity:
        applications.length > 0
          ? Math.round((leadershipSum / applications.length) * 100)
          : 0,
      startupFounderDensity:
        applications.length > 0 ? Math.round((startupSum / applications.length) * 100) : 0,
      applicationQuality: card.compatibilityAvg ?? 0,
      interestGrowth: card.applicationsThisWeek,
      saves: internship._count.bookmarks,
      follows: internship._count.bookmarks,
      profileViews: card.profileViews,
    },
    interestSignals,
    connectedEvents,
    timeline,
    linkedStudents,
    applications,
  };
}

export async function searchStudentsForOpportunity(
  companyUserId: string,
  query: string
): Promise<{ studentUserId: string; name: string; universityName: string; program: string | null }[]> {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId);
  if (uniIds.length === 0) return [];

  const q = query.trim().toLowerCase();
  const students = await prisma.studentProfile.findMany({
    where: {
      universityId: { in: uniIds },
      ...(q
        ? {
            user: {
              name: { contains: q, mode: 'insensitive' },
            },
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      university: { select: { name: true } },
      course: { select: { name: true } },
    },
    take: 12,
  });

  return students.map((s) => ({
    studentUserId: s.userId,
    name: s.user.name ?? 'Student',
    universityName: s.university?.name ?? '',
    program: s.course?.name ?? null,
  }));
}

export async function linkStudentToOpportunity(
  companyUserId: string,
  internshipId: string,
  studentUserId: string,
  linkType: 'preview' | 'official',
  notes?: string
) {
  await ensureCompanyOpportunitiesEcosystemTables();
  const internship = await prisma.internship.findFirst({
    where: { id: internshipId, companyUserId },
    select: { id: true, title: true },
  });
  if (!internship) return null;

  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!student) return null;

  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CompanyOpportunityStudentLink"
    WHERE "companyUserId" = ${companyUserId}
      AND "internshipId" = ${internshipId}
      AND "studentUserId" = ${studentUserId}
    LIMIT 1
  `;
  const linkId = existing[0]?.id ?? crypto.randomUUID();
  if (existing[0]) {
    await prisma.$executeRaw`
      UPDATE "CompanyOpportunityStudentLink"
      SET "linkType" = ${linkType}, "notes" = ${notes ?? null}, "archivedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${linkId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "CompanyOpportunityStudentLink"
        ("id", "companyUserId", "internshipId", "studentUserId", "studentProfileId", "linkType", "notes", "createdAt", "updatedAt")
      VALUES (${linkId}, ${companyUserId}, ${internshipId}, ${studentUserId}, ${student.id}, ${linkType}, ${notes ?? null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
  }

  if (linkType === 'official') {
    const company = await prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: { companyName: true },
    });
    await prisma.notification.create({
      data: {
        userId: studentUserId,
        type: 'CAREER',
        title: 'Company interest in you',
        message: `${company?.companyName ?? 'A company'} linked you to ${internship.title}. Explore your compatibility and next steps.`,
        link: `/student/career/opportunities?highlight=${internshipId}`,
      },
    });
  }

  return loadOpportunityDetail(companyUserId, internshipId);
}

export async function updateOpportunityLink(
  companyUserId: string,
  linkId: string,
  data: { linkType?: 'preview' | 'official'; notes?: string; archive?: boolean }
) {
  const rows = await prisma.$queryRaw<{ internshipId: string; studentUserId: string }[]>`
    SELECT "internshipId", "studentUserId" FROM "CompanyOpportunityStudentLink"
    WHERE "id" = ${linkId} AND "companyUserId" = ${companyUserId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  if (data.archive) {
    await prisma.$executeRaw`
      UPDATE "CompanyOpportunityStudentLink"
      SET "archivedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${linkId}
    `;
  } else {
    if (data.linkType) {
      await prisma.$executeRaw`
        UPDATE "CompanyOpportunityStudentLink"
        SET "linkType" = ${data.linkType}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${linkId}
      `;
      if (data.linkType === 'official') {
        const internship = await prisma.internship.findUnique({
          where: { id: row.internshipId },
          select: { title: true },
        });
        await prisma.notification.create({
          data: {
            userId: row.studentUserId,
            type: 'CAREER',
            title: 'Official company interest',
            message: `You were officially linked to ${internship?.title ?? 'an opportunity'}.`,
            link: `/student/career/opportunities?highlight=${row.internshipId}`,
          },
        });
      }
    }
    if (data.notes !== undefined) {
      await prisma.$executeRaw`
        UPDATE "CompanyOpportunityStudentLink"
        SET "notes" = ${data.notes}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${linkId}
      `;
    }
  }

  return loadOpportunityDetail(companyUserId, row.internshipId);
}

export async function moveLinkedStudentToPipeline(
  companyUserId: string,
  studentUserId: string
) {
  return upsertPipelineCandidate(companyUserId, studentUserId, {
    stage: 'contacted',
    ecosystemSignals: ['Moved from Opportunities ecosystem'],
  });
}

export async function patchOpportunityEcosystem(
  companyUserId: string,
  internshipId: string,
  data: {
    opportunityCategory?: string;
    hiringPriority?: string;
    isFutureOpening?: boolean;
    opensAt?: string | null;
    ecosystemJson?: OpportunityEcosystemJson;
  }
) {
  const exists = await prisma.internship.findFirst({
    where: { id: internshipId, companyUserId },
  });
  if (!exists) return null;

  await prisma.$executeRaw`
    UPDATE "Internship"
    SET
      "opportunityCategory" = COALESCE(${data.opportunityCategory ?? null}, "opportunityCategory"),
      "hiringPriority" = COALESCE(${data.hiringPriority ?? null}, "hiringPriority"),
      "isFutureOpening" = COALESCE(${data.isFutureOpening ?? null}, "isFutureOpening"),
      "opensAt" = ${data.opensAt ? new Date(data.opensAt) : null},
      "ecosystemJson" = COALESCE(${data.ecosystemJson ? JSON.stringify(data.ecosystemJson) : null}::jsonb, "ecosystemJson"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${internshipId}
  `.catch(() => null);

  return loadOpportunityDetail(companyUserId, internshipId);
}

export { updateCompanyApplication };
