import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { loadApprovedCompanyEventCard } from '@/lib/company/company-events-ecosystem-hub';
import type { CompanyEventEcosystemCard } from '@/lib/company/company-events-ecosystem-hub';
import {
  buildStudentEventExperienceTips,
  buildStudentEventHowItWorks,
  parseEcosystemJson,
  type EventTypeId,
} from '@/lib/company/company-events-intelligence';

export interface StudentCompanyEventPage {
  card: CompanyEventEcosystemCard;
  howItWorks: { step: number; title: string; description: string }[];
  experienceTips: string[];
  rsvpStatus: string | null;
  isInvited: boolean;
  spotsLeft: number | null;
  attendanceMode: string;
  preEventNetworkingOpen: boolean;
}

export async function loadStudentCompanyEventPage(
  studentUserId: string,
  eventId: string
): Promise<StudentCompanyEventPage | null> {
  await ensureCompanyEcosystemTables();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    select: { universityId: true },
  });
  if (!profile?.universityId) return null;

  const event = await prisma.companyEvent.findFirst({
    where: {
      id: eventId,
      universityId: profile.universityId,
      status: 'approved',
    },
    select: {
      id: true,
      companyUserId: true,
      capacity: true,
      isOnline: true,
    },
  });
  if (!event) return null;

  const partnership = await prisma.companyPartnership.findFirst({
    where: {
      universityId: profile.universityId,
      companyUserId: event.companyUserId,
      status: 'ACTIVE',
    },
  });
  if (!partnership) return null;

  const card = await loadApprovedCompanyEventCard(eventId, profile.universityId);
  if (!card) return null;

  let eventFormat = card.eventFormat;
  let ecosystemJson: unknown = null;
  try {
    const rows = await prisma.$queryRaw<
      { eventFormat: string | null; ecosystemJson: unknown }[]
    >`
      SELECT "eventFormat", "ecosystemJson" FROM "CompanyEvent" WHERE "id" = ${eventId} LIMIT 1
    `;
    if (rows[0]?.eventFormat) eventFormat = rows[0].eventFormat;
    ecosystemJson = rows[0]?.ecosystemJson ?? null;
  } catch {
    /* optional columns */
  }

  const eco = parseEcosystemJson(ecosystemJson);

  const rsvp = await prisma.companyEventRsvp.findUnique({
    where: {
      eventId_studentUserId: { eventId, studentUserId },
    },
    select: { status: true },
  });

  let isInvited = false;
  try {
    const invites = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint as c FROM "CompanyEventInvite"
      WHERE "eventId" = ${eventId} AND "studentUserId" = ${studentUserId}
    `;
    isInvited = Number(invites[0]?.c ?? 0) > 0;
  } catch {
    isInvited = false;
  }

  const spotsLeft =
    card.capacity != null ? Math.max(0, card.capacity - card.rsvpCount) : null;

  return {
    card,
    howItWorks: buildStudentEventHowItWorks({
      eventType: card.eventType as EventTypeId,
      eventFormat,
      attendanceMode: eco.attendanceMode,
    }),
    experienceTips: buildStudentEventExperienceTips(card.eventType as EventTypeId),
    rsvpStatus: rsvp?.status ?? null,
    isInvited,
    spotsLeft,
    attendanceMode: eco.attendanceMode ?? 'manual',
    preEventNetworkingOpen: new Date(card.startsAt) > new Date(),
  };
}

export async function rsvpStudentCompanyEvent(studentUserId: string, eventId: string) {
  const page = await loadStudentCompanyEventPage(studentUserId, eventId);
  if (!page) return null;

  if (page.spotsLeft === 0) {
    await prisma.companyEventRsvp.upsert({
      where: { eventId_studentUserId: { eventId, studentUserId } },
      create: { eventId, studentUserId, status: 'waitlist' },
      update: { status: 'waitlist' },
    });
    return { status: 'waitlist' as const };
  }

  await prisma.companyEventRsvp.upsert({
    where: { eventId_studentUserId: { eventId, studentUserId } },
    create: { eventId, studentUserId, status: 'rsvp' },
    update: { status: 'rsvp' },
  });

  return { status: 'rsvp' as const };
}
