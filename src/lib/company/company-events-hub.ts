import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { parseJsonArray } from '@/lib/career/profile-intelligence';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';

export async function findStudentsForEvent(event: {
  universityId: string;
  targetDegrees: unknown;
  targetYears: unknown;
}): Promise<{ userId: string }[]> {
  const degrees = parseJsonArray(event.targetDegrees);
  const years = Array.isArray(event.targetYears)
    ? (event.targetYears as unknown[]).filter((x): x is number => typeof x === 'number')
    : [];

  const students = await prisma.studentProfile.findMany({
    where: { universityId: event.universityId },
    include: { course: { select: { name: true } }, user: { select: { id: true } } },
  });

  return students
    .filter((s) => {
      if (
        degrees.length &&
        s.course?.name &&
        !degrees.some((d) => s.course!.name.toLowerCase().includes(d.toLowerCase()))
      ) {
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

export {
  loadCompanyEventsEcosystemHub,
  loadCompanyEventsEcosystemHub as loadCompanyEventsHub,
  loadCompanyEventDetail,
  createCompanyEcosystemEvent,
  createCompanyEcosystemEvent as createCompanyEvent,
  inviteStudentsToEvent,
  markEventAttendance,
  searchStudentsForEventInvite,
  type CompanyEventsEcosystemHub,
  type CompanyEventsEcosystemHub as CompanyEventsHub,
  type CompanyEventDetail,
  type CalendarEventChip,
} from '@/lib/company/company-events-ecosystem-hub';

export { EVENT_TYPES } from '@/lib/company/company-events-intelligence';
