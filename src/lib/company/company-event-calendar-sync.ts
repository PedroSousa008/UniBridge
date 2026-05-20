import { prisma } from '@/lib/db';
import { ensureStudentCalendarTables } from '@/lib/db/ensure-calendar-schema';
import { eventTypeMeta } from '@/lib/company/company-events-intelligence';

const SOURCE_PREFIX = 'company-event:';

export function companyEventSourceRef(eventId: string) {
  return `${SOURCE_PREFIX}${eventId}`;
}

async function hasActivePartnership(universityId: string, companyUserId: string) {
  const p = await prisma.companyPartnership.findFirst({
    where: { universityId, companyUserId, status: 'ACTIVE' },
    select: { id: true },
  });
  return Boolean(p);
}

async function resolveEventPresentation(eventId: string) {
  const event = await prisma.companyEvent.findUnique({ where: { id: eventId } });
  if (!event) return null;

  let eventType = 'networking';
  try {
    const rows = await prisma.$queryRaw<{ eventType: string | null }[]>`
      SELECT "eventType" FROM "CompanyEvent" WHERE "id" = ${eventId} LIMIT 1
    `;
    eventType = rows[0]?.eventType ?? 'networking';
  } catch {
    /* optional column */
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: event.companyUserId },
    select: { companyName: true },
  });
  const meta = eventTypeMeta(eventType);
  const companyName = profile?.companyName ?? 'Partner company';

  return { event, meta, companyName };
}

export async function upsertStudentCalendarForCompanyEvent(
  eventId: string,
  studentUserId: string
): Promise<boolean> {
  const resolved = await resolveEventPresentation(eventId);
  if (!resolved) return false;
  const { event, meta, companyName } = resolved;

  if (event.status !== 'approved') return false;
  if (!(await hasActivePartnership(event.universityId, event.companyUserId))) return false;

  await ensureStudentCalendarTables();

  const sourceRef = companyEventSourceRef(event.id);
  const description = [companyName, event.description].filter(Boolean).join(' — ') || companyName;

  const payload = {
    title: event.title,
    description,
    category: 'CAREER' as const,
    quickType: 'EVENT' as const,
    startAt: event.startsAt,
    endAt: event.endsAt,
    allDay: false,
    location: event.isOnline ? 'Online' : event.location,
    color: meta.color,
    sourceRef,
  };

  const existing = await prisma.studentCalendarEvent.findFirst({
    where: { studentId: studentUserId, sourceRef },
  });

  if (existing) {
    await prisma.studentCalendarEvent.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    await prisma.studentCalendarEvent.create({
      data: { studentId: studentUserId, ...payload },
    });
  }

  return true;
}

export async function getAllUniversityStudentUserIds(universityId: string): Promise<string[]> {
  const students = await prisma.studentProfile.findMany({
    where: { universityId },
    select: { userId: true },
  });
  return students.map((s) => s.userId);
}

/** Push one approved event to every student calendar at the partner university. */
export async function publishApprovedCompanyEventToStudentCalendars(eventId: string) {
  const event = await prisma.companyEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'approved') return { synced: 0 };

  if (!(await hasActivePartnership(event.universityId, event.companyUserId))) {
    return { synced: 0, skipped: 'partnership_not_active' as const };
  }

  const resolved = await resolveEventPresentation(eventId);
  if (!resolved) return { synced: 0 };

  const studentUserIds = await getAllUniversityStudentUserIds(event.universityId);
  let synced = 0;

  for (const userId of studentUserIds) {
    const ok = await upsertStudentCalendarForCompanyEvent(eventId, userId);
    if (ok) synced += 1;

    await prisma.notification.create({
      data: {
        userId,
        type: 'CAREER',
        title: `New event: ${event.title}`,
        message:
          resolved.event.description?.slice(0, 140) ??
          `${resolved.companyName} — now on your Academics calendar.`,
        link: '/student/academics/calendar',
      },
    });
  }

  return { synced };
}

/** Repair missing entries when a student opens Academics → Calendar (agenda feed). */
export async function syncStudentCompanyEventCalendar(studentUserId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    select: { universityId: true },
  });
  if (!profile?.universityId) return;

  const [events, partnerships] = await Promise.all([
    prisma.companyEvent.findMany({
      where: { universityId: profile.universityId, status: 'approved' },
      select: { id: true, companyUserId: true },
    }),
    prisma.companyPartnership.findMany({
      where: { universityId: profile.universityId, status: 'ACTIVE' },
      select: { companyUserId: true },
    }),
  ]);

  const activeCompanies = new Set(partnerships.map((p) => p.companyUserId));
  let synced = 0;
  for (const ev of events) {
    if (!activeCompanies.has(ev.companyUserId)) continue;
    const ok = await upsertStudentCalendarForCompanyEvent(ev.id, studentUserId);
    if (ok) synced += 1;
  }
  return synced;
}

/** When partnership goes live, backfill calendars for already-approved events. */
export async function publishApprovedEventsForPartnership(
  universityId: string,
  companyUserId: string
) {
  const events = await prisma.companyEvent.findMany({
    where: { universityId, companyUserId, status: 'approved' },
    select: { id: true },
  });
  let total = 0;
  for (const e of events) {
    const r = await publishApprovedCompanyEventToStudentCalendars(e.id);
    total += r.synced;
  }
  return total;
}

export async function loadApprovedCompanyEventsForCalendarView(
  universityId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { universityId, status: 'ACTIVE' },
    select: { companyUserId: true },
  });
  const companyIds = partnerships.map((p) => p.companyUserId);
  if (!companyIds.length) return [];

  const events = await prisma.companyEvent.findMany({
    where: {
      universityId,
      companyUserId: { in: companyIds },
      status: 'approved',
      startsAt: { lte: rangeEnd },
      endsAt: { gte: rangeStart },
    },
    orderBy: { startsAt: 'asc' },
  });

  const profiles = await prisma.companyProfile.findMany({
    where: { userId: { in: companyIds } },
    select: { userId: true, companyName: true },
  });
  const nameByCompany = new Map(profiles.map((p) => [p.userId, p.companyName]));

  let typeById = new Map<string, string>();
  try {
    const typeRows = await prisma.$queryRaw<{ id: string; eventType: string | null }[]>`
      SELECT "id", "eventType" FROM "CompanyEvent"
      WHERE "universityId" = ${universityId} AND "status" = 'approved'
    `;
    typeById = new Map(typeRows.map((r) => [r.id, r.eventType ?? 'networking']));
  } catch {
    /* optional */
  }

  return events.map((e) => {
    const meta = eventTypeMeta(typeById.get(e.id) ?? 'networking');
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      companyName: nameByCompany.get(e.companyUserId) ?? 'Partner company',
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      isOnline: e.isOnline,
      location: e.location,
      color: meta.color,
      typeLabel: meta.label,
    };
  });
}
