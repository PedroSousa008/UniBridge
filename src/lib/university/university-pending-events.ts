import { prisma } from '@/lib/db';
import { parseJsonArray } from '@/lib/career/profile-intelligence';
import { eventTypeMeta } from '@/lib/company/company-events-intelligence';

export interface UniversityPendingEventItem {
  id: string;
  title: string;
  description: string | null;
  companyName: string;
  companyLogoUrl: string | null;
  companyUserId: string;
  eventType: string;
  typeLabel: string;
  color: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  isOnline: boolean;
  eventFormat: string;
  capacity: number | null;
  targetDegrees: string[];
  targetYears: number[];
  createdAt: string;
}

export async function loadUniversityPendingEvents(
  universityId: string
): Promise<UniversityPendingEventItem[]> {
  const events = await prisma.companyEvent.findMany({
    where: { universityId, status: 'pending_approval' },
    orderBy: { createdAt: 'desc' },
    take: 24,
  });

  if (events.length === 0) return [];

  const companyIds = [...new Set(events.map((e) => e.companyUserId))];
  const profiles = await prisma.companyProfile.findMany({
    where: { userId: { in: companyIds } },
    select: { userId: true, companyName: true, logoUrl: true },
  });
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

  let typeById = new Map<string, string>();
  try {
    const typeRows = await prisma.$queryRaw<{ id: string; eventType: string | null }[]>`
      SELECT "id", "eventType" FROM "CompanyEvent"
      WHERE "universityId" = ${universityId} AND "status" = 'pending_approval'
    `;
    typeById = new Map(typeRows.map((r) => [r.id, r.eventType ?? 'networking']));
  } catch {
    /* eventType column optional */
  }

  let formatById = new Map<string, string>();
  try {
    const formatRows = await prisma.$queryRaw<{ id: string; eventFormat: string | null }[]>`
      SELECT "id", "eventFormat" FROM "CompanyEvent"
      WHERE "universityId" = ${universityId} AND "status" = 'pending_approval'
    `;
    formatById = new Map(formatRows.map((r) => [r.id, r.eventFormat ?? 'hybrid']));
  } catch {
    /* optional */
  }

  return events.map((e) => {
    const profile = profileByUser.get(e.companyUserId);
    const eventType = typeById.get(e.id) ?? 'networking';
    const meta = eventTypeMeta(eventType);
    const years = Array.isArray(e.targetYears)
      ? (e.targetYears as unknown[]).filter((x): x is number => typeof x === 'number')
      : [];

    return {
      id: e.id,
      title: e.title,
      description: e.description,
      companyName: profile?.companyName ?? 'Partner company',
      companyLogoUrl: profile?.logoUrl ?? null,
      companyUserId: e.companyUserId,
      eventType: meta.id,
      typeLabel: meta.label,
      color: meta.color,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      location: e.location,
      isOnline: e.isOnline,
      eventFormat: formatById.get(e.id) ?? (e.isOnline ? 'online' : 'physical'),
      capacity: e.capacity,
      targetDegrees: parseJsonArray(e.targetDegrees),
      targetYears: years,
      createdAt: e.createdAt.toISOString(),
    };
  });
}

export async function countUniversityPendingEvents(universityId: string): Promise<number> {
  return prisma.companyEvent.count({
    where: { universityId, status: 'pending_approval' },
  });
}
