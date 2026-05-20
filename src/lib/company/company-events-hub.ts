import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { parseJsonArray } from '@/lib/career/profile-intelligence';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';

export interface CompanyEventRow {
  id: string;
  title: string;
  status: string;
  universityName: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  isOnline: boolean;
  capacity: number | null;
  rsvpCount: number;
  attendanceRate: number;
  coverUrl: string | null;
}

export interface CompanyEventsHub {
  events: CompanyEventRow[];
  analytics: {
    totalRsvps: number;
    approvedEvents: number;
    pendingApproval: number;
    avgAttendance: number;
  };
  dbReady: boolean;
  serverTime: string;
}

function parseJsonNums(val: unknown): number[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x): x is number => typeof x === 'number');
}

export async function findStudentsForEvent(event: {
  universityId: string;
  targetDegrees: unknown;
  targetYears: unknown;
}): Promise<{ userId: string }[]> {
  const degrees = parseJsonArray(event.targetDegrees);
  const years = parseJsonNums(event.targetYears);

  const students = await prisma.studentProfile.findMany({
    where: { universityId: event.universityId },
    include: { course: { select: { name: true } }, user: { select: { id: true } } },
  });

  return students
    .filter((s) => {
      if (degrees.length && s.course?.name && !degrees.some((d) => s.course!.name.toLowerCase().includes(d.toLowerCase()))) {
        return false;
      }
      if (years.length && s.yearOfStudy != null && !years.includes(s.yearOfStudy)) return false;
      return true;
    })
    .map((s) => ({ userId: s.user.id }));
}

export async function publishEventToEcosystem(eventId: string) {
  const event = await prisma.companyEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'approved') return;

  const students = await findStudentsForEvent(event);

  for (const { userId } of students) {
    const existing = await prisma.studentCalendarEvent.findFirst({
      where: { studentId: userId, sourceRef: `company-event:${event.id}` },
    });
    if (!existing) {
      await prisma.studentCalendarEvent.create({
        data: {
          studentId: userId,
          title: event.title,
          description: event.description,
          category: 'CAREER',
          quickType: 'EVENT',
          startAt: event.startsAt,
          endAt: event.endsAt,
          allDay: false,
          location: event.isOnline ? 'Online' : event.location,
          sourceRef: `company-event:${event.id}`,
          color: '#0f172a',
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        type: 'CAREER',
        title: `New event: ${event.title}`,
        message: event.description?.slice(0, 140) ?? 'A company event is now open for RSVP.',
        link: '/student/academics/calendar',
      },
    });
  }
}

export async function approveCompanyEvent(eventId: string, universityId: string) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, universityId },
  });
  if (!event) return null;

  const updated = await prisma.companyEvent.update({
    where: { id: eventId },
    data: { status: 'approved', approvedAt: new Date() },
  });

  await publishEventToEcosystem(eventId);
  return updated;
}

export async function loadCompanyEventsHub(companyUserId: string): Promise<CompanyEventsHub> {
  const dbReady = await ensureCompanyEcosystemTables();
  if (!dbReady) {
    return {
      events: [],
      analytics: { totalRsvps: 0, approvedEvents: 0, pendingApproval: 0, avgAttendance: 0 },
      dbReady: false,
      serverTime: new Date().toISOString(),
    };
  }

  const rows = await prisma.companyEvent.findMany({
    where: { companyUserId },
    include: {
      university: { select: { name: true } },
      rsvps: true,
    },
    orderBy: { startsAt: 'desc' },
  });

  const events: CompanyEventRow[] = rows.map((e) => {
    const rsvpCount = e.rsvps.filter((r) => r.status === 'rsvp').length;
    const attended = e.rsvps.filter((r) => r.status === 'attended').length;
    return {
      id: e.id,
      title: e.title,
      status: e.status,
      universityName: e.university.name,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      location: e.location,
      isOnline: e.isOnline,
      capacity: e.capacity,
      rsvpCount,
      attendanceRate: rsvpCount > 0 ? Math.round((attended / rsvpCount) * 100) : 0,
      coverUrl: e.coverUrl,
    };
  });

  const totalRsvps = rows.reduce((a, e) => a + e.rsvps.length, 0);

  return {
    events,
    analytics: {
      totalRsvps,
      approvedEvents: rows.filter((e) => e.status === 'approved').length,
      pendingApproval: rows.filter((e) => e.status === 'pending_approval').length,
      avgAttendance:
        events.length > 0
          ? Math.round(events.reduce((a, e) => a + e.attendanceRate, 0) / events.length)
          : 0,
    },
    dbReady: true,
    serverTime: new Date().toISOString(),
  };
}

export async function createCompanyEvent(
  companyUserId: string,
  input: {
    universityId: string;
    title: string;
    description?: string;
    coverUrl?: string;
    targetDegrees?: string[];
    targetYears?: number[];
    targetSkills?: string[];
    capacity?: number;
    location?: string;
    isOnline?: boolean;
    speakers?: string[];
    sponsors?: string[];
    startsAt: Date;
    endsAt: Date;
  }
) {
  await ensureCompanyEcosystemTables();
  return prisma.companyEvent.create({
    data: {
      companyUserId,
      universityId: input.universityId,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      targetDegrees: input.targetDegrees ?? [],
      targetYears: input.targetYears ?? [],
      targetSkills: input.targetSkills ?? [],
      capacity: input.capacity,
      location: input.location,
      isOnline: input.isOnline ?? false,
      speakers: input.speakers ?? [],
      sponsors: input.sponsors ?? [],
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: 'pending_approval',
    },
  });
}

export async function loadEventAttendeeInsights(eventId: string, companyUserId: string) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, companyUserId },
    include: { rsvps: true },
  });
  if (!event) return [];

  const cards = [];
  for (const rsvp of event.rsvps.slice(0, 20)) {
    const card = await buildCompanyCandidateCard(rsvp.studentUserId, companyUserId);
    if (card) cards.push({ ...card, rsvpStatus: rsvp.status });
  }
  return cards;
}
