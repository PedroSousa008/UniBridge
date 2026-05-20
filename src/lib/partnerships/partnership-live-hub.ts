import { prisma } from '@/lib/db';
import { ensurePartnershipLiveTables } from '@/lib/db/ensure-partnership-live-schema';
import {
  deriveUiState,
  type PartnershipUiState,
} from '@/lib/partnerships/partnership-intelligence';
import {
  publishPartnershipLive,
  type PartnershipLiveEvent,
} from '@/lib/partnerships/partnership-live-bus';

export type { PartnershipUiState };

export interface PartnershipDiscoverUniversity {
  universityId: string;
  name: string;
  logoUrl: string | null;
  country: string;
  city: string;
  totalStudents: number;
  strongestDegrees: string[];
  startupActivity: 'low' | 'medium' | 'high';
  employabilityLevel: string;
  activePartnerships: number;
  uiState: PartnershipUiState;
}

export interface PartnershipDiscoverCompany {
  companyUserId: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  country: string;
  opportunitiesCount: number;
  startupInvolvement: 'low' | 'medium' | 'high';
  eventsHosted: number;
  hiringActivity: string;
  partnershipCount: number;
  uiState: PartnershipUiState;
}

export interface PartnershipHubCard {
  id: string;
  name: string;
  logoUrl: string | null;
  subtitle: string;
  uiState: PartnershipUiState;
  universityId?: string;
  companyUserId?: string;
}

export interface PartnershipActivityRow {
  id: string;
  message: string;
  at: string;
  kind: string;
}

export interface PartnershipRecommendation {
  id: string;
  title: string;
  reason: string;
  targetId: string;
  targetType: 'university' | 'company' | 'student';
}

export interface PartnershipEcosystemHub {
  viewer: 'company' | 'university';
  active: PartnershipHubCard[];
  pending: PartnershipHubCard[];
  suggested: PartnershipHubCard[];
  recentActivity: PartnershipActivityRow[];
  recommendations: PartnershipRecommendation[];
  serverTime: string;
}

type ConnectionRow = {
  id: string;
  universityId: string;
  companyUserId: string;
  companyInterested: boolean;
  universityInterested: boolean;
  partnershipId: string | null;
  updatedAt: Date;
};

function newId() {
  return crypto.randomUUID();
}

function parseLocation(location: string | null | undefined): { country: string; city: string } {
  if (!location?.trim()) return { country: '—', city: '—' };
  const parts = location.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], country: parts[parts.length - 1] };
  }
  return { city: location, country: location };
}

async function getConnection(
  universityId: string,
  companyUserId: string
): Promise<ConnectionRow | null> {
  await ensurePartnershipLiveTables();
  const rows = await prisma.$queryRaw<ConnectionRow[]>`
    SELECT "id", "universityId", "companyUserId", "companyInterested", "universityInterested",
           "partnershipId", "updatedAt"
    FROM "PartnershipConnection"
    WHERE "universityId" = ${universityId} AND "companyUserId" = ${companyUserId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getConnectionsForCompany(companyUserId: string): Promise<ConnectionRow[]> {
  await ensurePartnershipLiveTables();
  return prisma.$queryRaw<ConnectionRow[]>`
    SELECT "id", "universityId", "companyUserId", "companyInterested", "universityInterested",
           "partnershipId", "updatedAt"
    FROM "PartnershipConnection"
    WHERE "companyUserId" = ${companyUserId}
    ORDER BY "updatedAt" DESC
  `;
}

async function getConnectionsForUniversity(universityId: string): Promise<ConnectionRow[]> {
  await ensurePartnershipLiveTables();
  return prisma.$queryRaw<ConnectionRow[]>`
    SELECT "id", "universityId", "companyUserId", "companyInterested", "universityInterested",
           "partnershipId", "updatedAt"
    FROM "PartnershipConnection"
    WHERE "universityId" = ${universityId}
    ORDER BY "updatedAt" DESC
  `;
}

async function resolveUiState(
  universityId: string,
  companyUserId: string,
  conn: ConnectionRow | null
): Promise<PartnershipUiState> {
  const partnership = await prisma.companyPartnership.findUnique({
    where: { universityId_companyUserId: { universityId, companyUserId } },
    select: { status: true },
  });
  return deriveUiState({
    partnershipStatus: partnership?.status ?? null,
    companyInterested: conn?.companyInterested ?? false,
    universityInterested: conn?.universityInterested ?? false,
  });
}

async function recordActivity(input: {
  universityId: string;
  companyUserId: string;
  actorUserId?: string;
  kind: string;
  message: string;
}) {
  await ensurePartnershipLiveTables();
  await prisma.$executeRaw`
    INSERT INTO "PartnershipActivity" ("id", "universityId", "companyUserId", "actorUserId", "kind", "message")
    VALUES (${newId()}, ${input.universityId}, ${input.companyUserId}, ${input.actorUserId ?? null}, ${input.kind}, ${input.message})
  `;
}

async function notifyUser(
  userId: string,
  title: string,
  message: string,
  link: string
) {
  try {
    await prisma.notification.create({
      data: { userId, type: 'PARTNERSHIP', title, message, link },
    });
  } catch {
    /* optional */
  }
}

async function notifyStudentsEcosystem(universityId: string, companyName: string) {
  const students = await prisma.studentProfile.findMany({
    where: { universityId },
    select: { userId: true },
    take: 150,
  });
  if (students.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        type: 'PARTNERSHIP' as const,
        title: 'New ecosystem partner',
        message: `${companyName} is now live in your university ecosystem — opportunities, events, and networking unlocked.`,
        link: '/student/career/partnerships',
      })),
      skipDuplicates: true,
    });
  } catch {
    /* optional */
  }
}

async function activatePartnership(input: {
  universityId: string;
  companyUserId: string;
  connectionId: string;
  actorUserId: string;
}): Promise<{ partnershipId: string; companyName: string; universityName: string }> {
  const [uni, company] = await Promise.all([
    prisma.university.findUnique({
      where: { id: input.universityId },
      select: { name: true },
    }),
    prisma.companyProfile.findUnique({
      where: { userId: input.companyUserId },
      select: { companyName: true, user: { select: { name: true } } },
    }),
  ]);
  const companyName =
    company?.companyName ?? company?.user?.name ?? 'Partner company';
  const universityName = uni?.name ?? 'Partner university';

  const partnership = await prisma.companyPartnership.upsert({
    where: {
      universityId_companyUserId: {
        universityId: input.universityId,
        companyUserId: input.companyUserId,
      },
    },
    create: {
      universityId: input.universityId,
      companyUserId: input.companyUserId,
      status: 'ACTIVE',
      hiringStatus: 'active',
    },
    update: { status: 'ACTIVE', hiringStatus: 'active' },
  });

  await prisma.$executeRaw`
    UPDATE "PartnershipConnection"
    SET "partnershipId" = ${partnership.id}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.connectionId}
  `;

  await recordActivity({
    universityId: input.universityId,
    companyUserId: input.companyUserId,
    actorUserId: input.actorUserId,
    kind: 'activated',
    message: `Partnership live — ${companyName} × ${universityName}`,
  });

  const adminProfiles = await prisma.universityProfile.findMany({
    where: { universityId: input.universityId },
    select: { userId: true },
  });

  const notifyIds = [
    input.companyUserId,
    ...adminProfiles.map((p) => p.userId),
  ];

  await Promise.all([
    notifyUser(
      input.companyUserId,
      'Partnership activated',
      `You're now connected with ${universityName}. Talent, events, and analytics are live.`,
      '/company/home'
    ),
    ...adminProfiles.map((p) =>
      notifyUser(
        p.userId,
        'Partnership activated',
        `${companyName} joined your ecosystem. Students gain instant access.`,
        '/university/overview'
      )
    ),
    notifyStudentsEcosystem(input.universityId, companyName),
  ]);

  publishPartnershipLive(notifyIds, {
    type: 'partnership_active',
    at: new Date().toISOString(),
    payload: {
      universityId: input.universityId,
      companyUserId: input.companyUserId,
      partnershipId: partnership.id,
    },
  });

  return { partnershipId: partnership.id, companyName, universityName };
}

export async function expressPartnershipInterest(input: {
  viewer: 'company' | 'university';
  actorUserId: string;
  universityId: string;
  companyUserId: string;
}): Promise<{
  uiState: PartnershipUiState;
  activated: boolean;
  partnershipId?: string;
}> {
  await ensurePartnershipLiveTables();

  const existingPartnership = await prisma.companyPartnership.findUnique({
    where: {
      universityId_companyUserId: {
        universityId: input.universityId,
        companyUserId: input.companyUserId,
      },
    },
  });
  if (existingPartnership?.status === 'ACTIVE') {
    return { uiState: 'active', activated: true, partnershipId: existingPartnership.id };
  }

  let conn = await getConnection(input.universityId, input.companyUserId);
  const now = new Date();

  if (!conn) {
    const id = newId();
    const companyInterested = input.viewer === 'company';
    const universityInterested = input.viewer === 'university';
    await prisma.$executeRaw`
      INSERT INTO "PartnershipConnection" (
        "id", "universityId", "companyUserId",
        "companyInterested", "universityInterested",
        "companyInterestedAt", "universityInterestedAt", "updatedAt", "createdAt"
      ) VALUES (
        ${id}, ${input.universityId}, ${input.companyUserId},
        ${companyInterested}, ${universityInterested},
        ${companyInterested ? now : null}, ${universityInterested ? now : null},
        ${now}, ${now}
      )
    `;
    conn = {
      id,
      universityId: input.universityId,
      companyUserId: input.companyUserId,
      companyInterested,
      universityInterested,
      partnershipId: null,
      updatedAt: now,
    };
  } else {
    if (input.viewer === 'company' && !conn.companyInterested) {
      await prisma.$executeRaw`
        UPDATE "PartnershipConnection"
        SET "companyInterested" = true, "companyInterestedAt" = ${now}, "updatedAt" = ${now}
        WHERE "id" = ${conn.id}
      `;
      conn.companyInterested = true;
    }
    if (input.viewer === 'university' && !conn.universityInterested) {
      await prisma.$executeRaw`
        UPDATE "PartnershipConnection"
        SET "universityInterested" = true, "universityInterestedAt" = ${now}, "updatedAt" = ${now}
        WHERE "id" = ${conn.id}
      `;
      conn.universityInterested = true;
    }
    conn.updatedAt = now;
  }

  const [uni, companyProfile] = await Promise.all([
    prisma.university.findUnique({
      where: { id: input.universityId },
      select: { name: true },
    }),
    prisma.companyProfile.findUnique({
      where: { userId: input.companyUserId },
      select: { companyName: true, user: { select: { name: true } } },
    }),
  ]);
  const companyName =
    companyProfile?.companyName ?? companyProfile?.user?.name ?? 'A company';
  const universityName = uni?.name ?? 'A university';

  const adminProfiles = await prisma.universityProfile.findMany({
    where: { universityId: input.universityId },
    select: { userId: true },
  });
  const liveTargets = [input.companyUserId, ...adminProfiles.map((p) => p.userId)];

  if (conn.companyInterested && conn.universityInterested) {
    const result = await activatePartnership({
      universityId: input.universityId,
      companyUserId: input.companyUserId,
      connectionId: conn.id,
      actorUserId: input.actorUserId,
    });
    publishPartnershipLive(liveTargets, {
      type: 'mutual_match',
      at: new Date().toISOString(),
      payload: { universityId: input.universityId, companyUserId: input.companyUserId },
    });
    return { uiState: 'active', activated: true, partnershipId: result.partnershipId };
  }

  const kind = input.viewer === 'company' ? 'company_interest' : 'university_interest';
  await recordActivity({
    universityId: input.universityId,
    companyUserId: input.companyUserId,
    actorUserId: input.actorUserId,
    kind,
    message:
      input.viewer === 'company'
        ? `${companyName} expressed interest in partnering with ${universityName}`
        : `${universityName} expressed interest in partnering with ${companyName}`,
  });

  if (input.viewer === 'company') {
    for (const admin of adminProfiles) {
      await notifyUser(
        admin.userId,
        'Partnership interest',
        `${companyName} is interested in partnering with your university.`,
        '/university/overview'
      );
    }
  } else {
    await notifyUser(
      input.companyUserId,
      'Partnership interest',
      `${universityName} is interested in partnering with your company.`,
      '/company/home'
    );
  }

  const uiState = await resolveUiState(
    input.universityId,
    input.companyUserId,
    conn
  );

  publishPartnershipLive(liveTargets, {
    type: 'interest',
    at: new Date().toISOString(),
    payload: {
      universityId: input.universityId,
      companyUserId: input.companyUserId,
      uiState,
      from: input.viewer,
    },
  });

  return { uiState, activated: false };
}

export async function discoverUniversitiesForCompany(
  companyUserId: string,
  query?: string
): Promise<PartnershipDiscoverUniversity[]> {
  const q = query?.trim();
  const universities = await prisma.university.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { location: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    take: 12,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      location: true,
      _count: {
        select: {
          students: true,
          partnerships: { where: { status: 'ACTIVE' } },
          incubatorPrograms: true,
        },
      },
      courses: { take: 3, select: { name: true, degreeType: true } },
    },
  });

  const connections = await getConnectionsForCompany(companyUserId);
  const connByUni = new Map(connections.map((c) => [c.universityId, c]));

  const startupCounts = await prisma.startup.groupBy({
    by: ['universityId'],
    where: { universityId: { in: universities.map((u) => u.id) } },
    _count: { id: true },
  });
  const startupMap = new Map(
    startupCounts.map((s) => [s.universityId!, s._count.id])
  );

  return Promise.all(
    universities.map(async (u) => {
      const loc = parseLocation(u.location);
      const startups = startupMap.get(u.id) ?? 0;
      const conn = connByUni.get(u.id) ?? null;
      const uiState = await resolveUiState(u.id, companyUserId, conn);
      const employability =
        u._count.students > 500
          ? 'Strong'
          : u._count.students > 100
            ? 'Growing'
            : 'Emerging';

      return {
        universityId: u.id,
        name: u.name,
        logoUrl: u.logoUrl,
        country: loc.country,
        city: loc.city,
        totalStudents: u._count.students,
        strongestDegrees: u.courses
          .map((c) => c.degreeType ? `${c.name} (${c.degreeType})` : c.name)
          .slice(0, 3),
        startupActivity:
          startups >= 8 ? 'high' : startups >= 3 ? 'medium' : ('low' as const),
        employabilityLevel: employability,
        activePartnerships: u._count.partnerships,
        uiState,
      };
    })
  );
}

export async function discoverCompaniesForUniversity(
  universityId: string,
  query?: string
): Promise<PartnershipDiscoverCompany[]> {
  const q = query?.trim();
  const profiles = await prisma.companyProfile.findMany({
    where: q
      ? {
          OR: [
            { companyName: { contains: q, mode: 'insensitive' } },
            { industry: { contains: q, mode: 'insensitive' } },
            { headquarters: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    take: 12,
    include: {
      user: {
        select: {
          id: true,
          companyPartnerships: {
            where: { status: 'ACTIVE' },
            select: { id: true },
          },
        },
      },
    },
  });

  const connections = await getConnectionsForUniversity(universityId);
  const connByCompany = new Map(connections.map((c) => [c.companyUserId, c]));

  return Promise.all(
    profiles.map(async (p) => {
      const companyUserId = p.userId;
      const [internships, events, pipelineCount] = await Promise.all([
        prisma.internship.count({ where: { companyUserId } }),
        prisma.companyEvent.count({ where: { companyUserId } }),
        prisma.companyPipelineCandidate.count({ where: { companyUserId } }),
      ]);

      const startupLinks = await prisma.startupFollower.count({
        where: { userId: companyUserId },
      });

      const conn = connByCompany.get(companyUserId) ?? null;
      const uiState = await resolveUiState(universityId, companyUserId, conn);
      const loc = parseLocation(p.headquarters);

      return {
        companyUserId,
        name: p.companyName ?? 'Company',
        logoUrl: p.logoUrl,
        industry: p.industry,
        country: loc.country,
        opportunitiesCount: internships,
        startupInvolvement:
          startupLinks >= 5 ? 'high' : startupLinks >= 2 ? 'medium' : ('low' as const),
        eventsHosted: events,
        hiringActivity:
          pipelineCount >= 10
            ? 'High hiring'
            : pipelineCount >= 3
              ? 'Active recruiting'
              : 'Building pipeline',
        partnershipCount: p.user.companyPartnerships.length,
        uiState,
      };
    })
  );
}

async function loadRecentActivity(
  universityId: string | null,
  companyUserId: string | null,
  limit = 8
): Promise<PartnershipActivityRow[]> {
  await ensurePartnershipLiveTables();
  let rows: { id: string; message: string; createdAt: Date; kind: string }[];

  if (companyUserId && !universityId) {
    rows = await prisma.$queryRaw`
      SELECT "id", "message", "createdAt", "kind"
      FROM "PartnershipActivity"
      WHERE "companyUserId" = ${companyUserId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  } else if (universityId) {
    rows = await prisma.$queryRaw`
      SELECT "id", "message", "createdAt", "kind"
      FROM "PartnershipActivity"
      WHERE "universityId" = ${universityId}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;
  } else {
    return [];
  }

  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    at: r.createdAt.toISOString(),
    kind: r.kind,
  }));
}

async function buildRecommendationsForCompany(
  companyUserId: string,
  partnerUniIds: string[]
): Promise<PartnershipRecommendation[]> {
  const universities = await prisma.university.findMany({
    where: partnerUniIds.length ? { id: { notIn: partnerUniIds } } : undefined,
    take: 4,
    select: { id: true, name: true, _count: { select: { students: true } } },
  });
  return universities.map((u) => ({
    id: `rec-uni-${u.id}`,
    title: u.name,
    reason: `${u._count.students} students · strong ecosystem fit`,
    targetId: u.id,
    targetType: 'university' as const,
  }));
}

async function buildRecommendationsForUniversity(
  universityId: string,
  partnerCompanyIds: string[]
): Promise<PartnershipRecommendation[]> {
  const companies = await prisma.companyProfile.findMany({
    where: { userId: { notIn: partnerCompanyIds } },
    take: 4,
    select: { userId: true, companyName: true, industry: true },
  });
  return companies.map((c) => ({
    id: `rec-co-${c.userId}`,
    title: c.companyName ?? 'Company',
    reason: c.industry ? `${c.industry} · hiring & events ready` : 'Expand your company ecosystem',
    targetId: c.userId,
    targetType: 'company' as const,
  }));
}

export async function loadPartnershipEcosystemHubForCompany(
  companyUserId: string
): Promise<PartnershipEcosystemHub> {
  const [activePartnerships, connections, suggested] = await Promise.all([
    prisma.companyPartnership.findMany({
      where: { companyUserId, status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true, logoUrl: true, location: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    getConnectionsForCompany(companyUserId),
    discoverUniversitiesForCompany(companyUserId),
  ]);

  const activeIds = new Set(activePartnerships.map((p) => p.universityId));

  const pending: PartnershipHubCard[] = [];
  for (const c of connections) {
    if (activeIds.has(c.universityId)) continue;
    const uiState = await resolveUiState(c.universityId, companyUserId, c);
    if (uiState === 'active' || uiState === 'none') continue;
    const uni = await prisma.university.findUnique({
      where: { id: c.universityId },
      select: { name: true, logoUrl: true, location: true },
    });
    if (!uni) continue;
    pending.push({
      id: c.id,
      universityId: c.universityId,
      name: uni.name,
      logoUrl: uni.logoUrl,
      subtitle: uiState === 'university_interested' ? 'University interested in you' : 'Awaiting university',
      uiState,
    });
  }

  const active: PartnershipHubCard[] = activePartnerships.map((p) => ({
    id: p.id,
    universityId: p.universityId,
    name: p.university.name,
    logoUrl: p.university.logoUrl,
    subtitle: p.university.location ?? 'Active ecosystem',
    uiState: 'active' as const,
  }));

  const suggestedCards: PartnershipHubCard[] = suggested
    .filter((s) => s.uiState === 'none')
    .slice(0, 4)
    .map((s) => ({
      id: s.universityId,
      universityId: s.universityId,
      name: s.name,
      logoUrl: s.logoUrl,
      subtitle: `${s.totalStudents} students · ${s.employabilityLevel} employability`,
      uiState: s.uiState,
    }));

  const recentActivity = await loadRecentActivity(null, companyUserId);
  const recommendations = await buildRecommendationsForCompany(
    companyUserId,
    [...activeIds]
  );

  return {
    viewer: 'company',
    active,
    pending,
    suggested: suggestedCards,
    recentActivity,
    recommendations,
    serverTime: new Date().toISOString(),
  };
}

export async function loadPartnershipEcosystemHubForUniversity(
  universityId: string
): Promise<PartnershipEcosystemHub> {
  const [activePartnerships, connections, suggested] = await Promise.all([
    prisma.companyPartnership.findMany({
      where: { universityId, status: 'ACTIVE' },
      include: {
        companyUser: {
          select: {
            id: true,
            companyProfile: { select: { companyName: true, logoUrl: true, industry: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    getConnectionsForUniversity(universityId),
    discoverCompaniesForUniversity(universityId),
  ]);

  const activeCompanyIds = new Set(activePartnerships.map((p) => p.companyUserId));

  const pending: PartnershipHubCard[] = [];
  for (const c of connections) {
    if (activeCompanyIds.has(c.companyUserId)) continue;
    const uiState = await resolveUiState(universityId, c.companyUserId, c);
    if (uiState === 'active' || uiState === 'none') continue;
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: c.companyUserId },
      select: { companyName: true, logoUrl: true, industry: true },
    });
    pending.push({
      id: c.id,
      companyUserId: c.companyUserId,
      name: profile?.companyName ?? 'Company',
      logoUrl: profile?.logoUrl ?? null,
      subtitle:
        uiState === 'company_interested'
          ? 'Company interested in your university'
          : 'Awaiting company confirmation',
      uiState,
    });
  }

  const active: PartnershipHubCard[] = activePartnerships.map((p) => ({
    id: p.id,
    companyUserId: p.companyUserId,
    name: p.companyUser.companyProfile?.companyName ?? 'Company',
    logoUrl: p.companyUser.companyProfile?.logoUrl ?? null,
    subtitle: p.companyUser.companyProfile?.industry ?? 'Active ecosystem',
    uiState: 'active' as const,
  }));

  const suggestedCards: PartnershipHubCard[] = suggested
    .filter((s) => s.uiState === 'none')
    .slice(0, 4)
    .map((s) => ({
      id: s.companyUserId,
      companyUserId: s.companyUserId,
      name: s.name,
      logoUrl: s.logoUrl,
      subtitle: `${s.opportunitiesCount} roles · ${s.hiringActivity}`,
      uiState: s.uiState,
    }));

  const recentActivity = await loadRecentActivity(universityId, null);
  const recommendations = await buildRecommendationsForUniversity(
    universityId,
    [...activeCompanyIds]
  );

  return {
    viewer: 'university',
    active,
    pending,
    suggested: suggestedCards,
    recentActivity,
    recommendations,
    serverTime: new Date().toISOString(),
  };
}

export function partnershipLiveHeartbeat(): PartnershipLiveEvent {
  return { type: 'hub_refresh', at: new Date().toISOString() };
}
