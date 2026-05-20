import { prisma } from '@/lib/db';
import { buildCompanyCandidateCard } from '@/lib/company/company-candidate-builder';
import {
  publishApprovedCompanyEventToStudentCalendars,
  publishApprovedEventsForPartnership,
} from '@/lib/company/company-event-calendar-sync';

export { publishApprovedEventsForPartnership };

/** @deprecated Targeting helper — calendar sync uses all university students. */
export async function findStudentsForEvent(event: {
  universityId: string;
  targetDegrees: unknown;
  targetYears: unknown;
}): Promise<{ userId: string }[]> {
  const students = await prisma.studentProfile.findMany({
    where: { universityId: event.universityId },
    select: { userId: true },
  });
  return students.map((s) => ({ userId: s.userId }));
}

export async function publishEventToEcosystem(eventId: string) {
  return publishApprovedCompanyEventToStudentCalendars(eventId);
}

export async function approveCompanyEvent(eventId: string, universityId: string) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, universityId },
  });
  if (!event) return null;

  const updated = await prisma.companyEvent.update({
    where: { id: eventId },
    data: { status: 'approved', approvedAt: new Date(), rejectedReason: null },
  });

  await publishEventToEcosystem(eventId);
  return updated;
}

export async function rejectCompanyEvent(
  eventId: string,
  universityId: string,
  reason?: string
) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, universityId, status: 'pending_approval' },
  });
  if (!event) return null;

  return prisma.companyEvent.update({
    where: { id: eventId },
    data: {
      status: 'rejected',
      rejectedReason: reason?.trim() || 'University requested changes before approval.',
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
