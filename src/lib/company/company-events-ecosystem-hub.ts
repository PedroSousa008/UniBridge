import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { ensureCompanyEventsEcosystemTables } from '@/lib/db/ensure-company-events-ecosystem-schema';
import { parseJsonArray } from '@/lib/career/profile-intelligence';
import {
  buildCompanyCandidateCard,
  type CompanyCandidateCard,
} from '@/lib/company/company-candidate-builder';
import { quickApplicantCompatibility } from '@/lib/company/company-presence-shared';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import {
  buildEventAiRecommendations,
  eventTypeMeta,
  parseEcosystemJson,
  parseSpeakers,
  statusLabel,
  type EventSpeakerCard,
  type EventTypeId,
  EVENT_TYPES,
} from '@/lib/company/company-events-intelligence';

import { findStudentsForEvent, publishEventToEcosystem, approveCompanyEvent } from '@/lib/company/company-events-hub';

export { EVENT_TYPES };
export { findStudentsForEvent, publishEventToEcosystem, approveCompanyEvent };

export interface CalendarEventChip {
  id: string;
  title: string;
  eventType: EventTypeId;
  typeLabel: string;
  color: string;
  startsAt: string;
  endsAt: string;
  status: string;
  rsvpCount: number;
  capacity: number | null;
  isLive: boolean;
}

export interface CompanyEventEcosystemCard {
  id: string;
  title: string;
  description: string | null;
  eventType: EventTypeId;
  typeLabel: string;
  color: string;
  status: string;
  statusLabel: string;
  universityId: string;
  universityName: string;
  companyName: string;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string | null;
  location: string | null;
  eventFormat: string;
  isOnline: boolean;
  capacity: number | null;
  coverUrl: string | null;
  rsvpCount: number;
  attendedCount: number;
  waitlistCount: number;
  attendanceRate: number;
  speakers: EventSpeakerCard[];
  goals: string[];
  agenda: { time: string; label: string }[];
  targetDegrees: string[];
  targetYears: number[];
  momentumSignals: string[];
  registrationOpen: boolean;
}

export interface CompanyEventsEcosystemHub {
  companyName: string;
  heroTitle: string;
  liveSignals: string[];
  calendarEvents: CalendarEventChip[];
  trending: CompanyEventEcosystemCard[];
  analytics: {
    totalRsvps: number;
    approvedEvents: number;
    pendingApproval: number;
    avgAttendance: number;
    registrationsThisWeek: number;
    networkingConnections: number;
  };
  universities: { id: string; name: string }[];
  dbReady: boolean;
  serverTime: string;
}

export interface CompanyEventDetail {
  card: CompanyEventEcosystemCard;
  attendees: CompanyCandidateCard[];
  recommendedAttendees: {
    studentUserId: string;
    name: string;
    universityName: string;
    compatibility: number;
    reasons: string[];
  }[];
  invites: { studentUserId: string; name: string; inviteType: string }[];
  analytics: {
    attendanceRate: number;
    applicationsGenerated: number;
    compatibilityLift: number;
    pipelineMovement: number;
    founderAttendees: number;
  };
  relatedOpportunities: { id: string; title: string; href: string }[];
}

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  coverUrl: string | null;
  location: string | null;
  isOnline: boolean;
  capacity: number | null;
  startsAt: Date;
  endsAt: Date;
  targetDegrees: unknown;
  targetYears: unknown;
  targetSkills: unknown;
  speakers: unknown;
  universityId: string;
  university: { name: string };
  rsvps: { studentUserId: string; status: string; createdAt: Date }[];
  eventType?: string | null;
  eventFormat?: string | null;
  registrationDeadline?: Date | null;
  ecosystemJson?: unknown;
};

function weekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function mapEventRow(
  e: EventRow,
  companyName: string,
  inviteCount = 0
): CompanyEventEcosystemCard {
  const meta = eventTypeMeta(e.eventType ?? 'networking');
  const eco = parseEcosystemJson(e.ecosystemJson);
  const rsvpCount = e.rsvps.filter((r) => r.status === 'rsvp' || r.status === 'attended').length;
  const attended = e.rsvps.filter((r) => r.status === 'attended').length;
  const degrees = parseJsonArray(e.targetDegrees);
  const years = Array.isArray(e.targetYears)
    ? (e.targetYears as unknown[]).filter((x): x is number => typeof x === 'number')
    : [];

  const signals: string[] = [];
  if (e.status === 'approved') signals.push('Live in ecosystem');
  if (rsvpCount > 0) signals.push(`${rsvpCount} registered`);
  if (inviteCount > 0) signals.push(`${inviteCount} personalized invites sent`);
  const weekRsvp = e.rsvps.filter((r) => r.createdAt >= weekAgo()).length;
  if (weekRsvp > 0) signals.push(`+${weekRsvp} RSVPs this week`);

  return {
    id: e.id,
    title: e.title,
    description: e.description,
    eventType: meta.id,
    typeLabel: meta.label,
    color: meta.color,
    status: e.status,
    statusLabel: statusLabel(e.status),
    universityId: e.universityId,
    universityName: e.university.name,
    companyName,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    registrationDeadline: e.registrationDeadline?.toISOString() ?? null,
    location: e.location,
    eventFormat: e.eventFormat ?? (e.isOnline ? 'online' : 'physical'),
    isOnline: e.isOnline,
    capacity: e.capacity,
    coverUrl: e.coverUrl,
    rsvpCount,
    attendedCount: attended,
    waitlistCount: e.rsvps.filter((r) => r.status === 'waitlist').length,
    attendanceRate: rsvpCount > 0 ? Math.round((attended / rsvpCount) * 100) : 0,
    speakers: parseSpeakers(e.speakers, companyName),
    goals: eco.goals ?? ['Build ecosystem connections', 'Attract high-potential talent'],
    agenda: eco.agenda ?? [],
    targetDegrees: degrees,
    targetYears: years,
    momentumSignals: signals,
    registrationOpen: e.status === 'approved',
  };
}

export async function loadCompanyEventsEcosystemHub(
  companyUserId: string
): Promise<CompanyEventsEcosystemHub> {
  await ensureCompanyEcosystemTables();
  await ensureCompanyEventsEcosystemTables();

  const [companyProfile, partnerships, rows] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { userId: companyUserId },
      select: { companyName: true },
    }),
    prisma.companyPartnership.findMany({
      where: { companyUserId, status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true } } },
    }),
    prisma.companyEvent.findMany({
      where: { companyUserId },
      include: {
        university: { select: { name: true } },
        rsvps: true,
      },
      orderBy: { startsAt: 'asc' },
    }),
  ]);

  const companyName = companyProfile?.companyName ?? 'Your company';
  const inviteCounts = new Map<string, number>();
  try {
    const invites = await prisma.$queryRaw<{ eventId: string; c: bigint }[]>`
      SELECT "eventId", COUNT(*)::bigint as c FROM "CompanyEventInvite" GROUP BY "eventId"
    `;
    for (const row of invites) {
      inviteCounts.set(row.eventId, Number(row.c));
    }
  } catch {
    /* table may not exist yet */
  }

  const cards = rows.map((e) =>
    mapEventRow(e as EventRow, companyName, inviteCounts.get(e.id) ?? 0)
  );

  const calendarEvents: CalendarEventChip[] = cards.map((c) => ({
    id: c.id,
    title: c.title,
    eventType: c.eventType,
    typeLabel: c.typeLabel,
    color: c.color,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    status: c.status,
    rsvpCount: c.rsvpCount,
    capacity: c.capacity,
    isLive: c.status === 'approved' && new Date(c.endsAt) > new Date(),
  }));

  const trending = [...cards]
    .filter((c) => c.status === 'approved')
    .sort((a, b) => b.rsvpCount - a.rsvpCount)
    .slice(0, 5);

  const registrationsThisWeek = rows.reduce(
    (s, e) => s + e.rsvps.filter((r) => r.createdAt >= weekAgo()).length,
    0
  );

  return {
    companyName,
    heroTitle: 'Ecosystem coordination hub',
    liveSignals: [
      `${cards.filter((c) => c.status === 'approved').length} live events`,
      `${cards.filter((c) => c.status === 'pending_approval').length} awaiting university approval`,
      registrationsThisWeek > 0 ? `+${registrationsThisWeek} registrations this week` : 'Launch your next ecosystem moment',
      `${rows.reduce((s, e) => s + e.rsvps.length, 0)} total ecosystem registrations`,
    ],
    calendarEvents,
    trending,
    analytics: {
      totalRsvps: rows.reduce((s, e) => s + e.rsvps.length, 0),
      approvedEvents: rows.filter((e) => e.status === 'approved').length,
      pendingApproval: rows.filter((e) => e.status === 'pending_approval').length,
      avgAttendance:
        cards.length > 0
          ? Math.round(cards.reduce((a, c) => a + c.attendanceRate, 0) / cards.length)
          : 0,
      registrationsThisWeek,
      networkingConnections: Math.round(registrationsThisWeek * 1.4),
    },
    universities: partnerships.map((p) => ({
      id: p.universityId,
      name: p.university.name,
    })),
    dbReady: true,
    serverTime: new Date().toISOString(),
  };
}

export async function loadCompanyEventDetail(
  companyUserId: string,
  eventId: string
): Promise<CompanyEventDetail | null> {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, companyUserId },
    include: {
      university: { select: { name: true } },
      rsvps: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!event) return null;

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId: companyUserId },
    select: { companyName: true },
  });
  const companyName = companyProfile?.companyName ?? 'Your company';
  const card = mapEventRow(event as EventRow, companyName);

  const attendees = [];
  for (const r of event.rsvps.slice(0, 16)) {
    const profile = await buildCompanyCandidateCard(r.studentUserId, companyUserId);
    if (profile) attendees.push(profile);
  }

  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE', universityId: event.universityId },
  });
  const recommendedAttendees: CompanyEventDetail['recommendedAttendees'] = [];

  if (partnerships.length > 0) {
    const students = await prisma.studentProfile.findMany({
      where: { universityId: event.universityId },
      include: {
        user: { select: { id: true, name: true } },
        university: { select: { name: true } },
        course: { select: { name: true } },
        identitySettings: true,
      },
      take: 40,
    });
    for (const s of students) {
      if (!isVisibleToCompanies(s.identitySettings?.visibilityProfile ?? null)) continue;
      const compat = quickApplicantCompatibility(s.employabilityScore, s.profileStrength);
      const reasons = buildEventAiRecommendations({
        eventType: card.eventType,
        targetDegrees: card.targetDegrees,
        studentName: s.user.name ?? 'Student',
        compatibility: compat,
        hasStartup: s.employabilityScore >= 78,
        leadershipScore: s.profileStrength,
      });
      recommendedAttendees.push({
        studentUserId: s.userId,
        name: s.user.name ?? 'Student',
        universityName: s.university?.name ?? '',
        compatibility: compat,
        reasons,
      });
    }
    recommendedAttendees.sort((a, b) => b.compatibility - a.compatibility);
  }

  let invites: CompanyEventDetail['invites'] = [];
  try {
    const rows = await prisma.$queryRaw<{ studentUserId: string; inviteType: string }[]>`
      SELECT "studentUserId", "inviteType" FROM "CompanyEventInvite" WHERE "eventId" = ${eventId}
    `;
    for (const row of rows) {
      const u = await prisma.user.findUnique({
        where: { id: row.studentUserId },
        select: { name: true },
      });
      invites.push({
        studentUserId: row.studentUserId,
        name: u?.name ?? 'Student',
        inviteType: row.inviteType,
      });
    }
  } catch {
    invites = [];
  }

  const internships = await prisma.internship.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { id: true, title: true },
    take: 4,
  });

  return {
    card,
    attendees,
    recommendedAttendees: recommendedAttendees.slice(0, 8),
    invites,
    analytics: {
      attendanceRate: card.attendanceRate,
      applicationsGenerated: Math.round(card.rsvpCount * 0.35),
      compatibilityLift: 4,
      pipelineMovement: Math.round(card.rsvpCount * 0.2),
      founderAttendees: attendees.filter((a) => a.startupInvolvement).length,
    },
    relatedOpportunities: internships.map((i) => ({
      id: i.id,
      title: i.title,
      href: `/company/opportunities?opportunity=${i.id}`,
    })),
  };
}

export async function createCompanyEcosystemEvent(
  companyUserId: string,
  input: {
    universityId: string;
    title: string;
    eventType?: string;
    description?: string;
    coverUrl?: string;
    targetDegrees?: string[];
    targetYears?: number[];
    targetSkills?: string[];
    capacity?: number;
    location?: string;
    isOnline?: boolean;
    eventFormat?: string;
    registrationDeadline?: Date | null;
    speakers?: EventSpeakerCard[];
    goals?: string[];
    agenda?: { time: string; label: string }[];
    startsAt: Date;
    endsAt: Date;
  }
) {
  await ensureCompanyEcosystemTables();
  const ecosystemJson = {
    goals: input.goals,
    agenda: input.agenda,
    attendanceMode: 'manual' as const,
  };

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
      speakers: (input.speakers ?? []) as unknown as object[],
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: 'pending_approval',
    },
  }).then(async (ev) => {
    try {
      await prisma.$executeRaw`
        UPDATE "CompanyEvent"
        SET "eventType" = ${input.eventType ?? 'networking'},
            "eventFormat" = ${input.eventFormat ?? 'hybrid'},
            "registrationDeadline" = ${input.registrationDeadline},
            "ecosystemJson" = ${JSON.stringify(ecosystemJson)}::jsonb
        WHERE "id" = ${ev.id}
      `;
    } catch {
      /* columns optional */
    }
    return ev;
  });
}

export async function inviteStudentsToEvent(
  companyUserId: string,
  eventId: string,
  studentUserIds: string[],
  inviteType = 'student'
) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, companyUserId },
    select: { id: true, title: true, status: true },
  });
  if (!event) return null;

  await ensureCompanyEventsEcosystemTables();

  for (const studentUserId of studentUserIds) {
    const id = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "CompanyEventInvite" ("id", "eventId", "studentUserId", "inviteType", "notifiedAt", "createdAt")
      VALUES (${id}, ${eventId}, ${studentUserId}, ${inviteType}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("eventId", "studentUserId") DO UPDATE SET
        "notifiedAt" = CURRENT_TIMESTAMP,
        "inviteType" = EXCLUDED."inviteType"
    `;

    await prisma.notification.create({
      data: {
        userId: studentUserId,
        type: 'CAREER',
        title: `You're invited: ${event.title}`,
        message: 'A company tagged you for an ecosystem event — view details and RSVP.',
        link: '/student/academics/calendar',
      },
    });
  }

  return loadCompanyEventDetail(companyUserId, eventId);
}

export async function markEventAttendance(
  companyUserId: string,
  eventId: string,
  studentUserId: string,
  attended: boolean
) {
  const event = await prisma.companyEvent.findFirst({
    where: { id: eventId, companyUserId },
  });
  if (!event) return null;

  await prisma.companyEventRsvp.upsert({
    where: {
      eventId_studentUserId: { eventId, studentUserId },
    },
    create: {
      eventId,
      studentUserId,
      status: attended ? 'attended' : 'rsvp',
    },
    update: { status: attended ? 'attended' : 'rsvp' },
  });

  return loadCompanyEventDetail(companyUserId, eventId);
}

export async function searchStudentsForEventInvite(
  companyUserId: string,
  universityId: string,
  query: string
) {
  const q = query.trim().toLowerCase();
  const students = await prisma.studentProfile.findMany({
    where: {
      universityId,
      ...(q
        ? { user: { name: { contains: q, mode: 'insensitive' } } }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      course: { select: { name: true } },
      identitySettings: true,
    },
    take: 12,
  });
  return students
    .filter((s) => isVisibleToCompanies(s.identitySettings?.visibilityProfile ?? null))
    .map((s) => ({
      studentUserId: s.userId,
      name: s.user.name ?? 'Student',
      program: s.course?.name ?? null,
      compatibility: quickApplicantCompatibility(s.employabilityScore, s.profileStrength),
    }));
}

