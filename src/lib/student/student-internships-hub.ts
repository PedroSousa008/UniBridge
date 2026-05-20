import { prisma } from '@/lib/db';
import { ensurePartnershipTables } from '@/lib/db/ensure-partnerships-schema';
import { ensureInternshipTables } from '@/lib/db/ensure-internships-schema';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import {
  buildInternshipCard,
  type InternshipCard,
  type InternshipLifecycleStage,
} from '@/lib/student/internship-job-builder';

export interface InternshipDashboard {
  applicationsSent: number;
  interviews: number;
  offersReceived: number;
  currentInternship: { title: string; companyName: string; id: string } | null;
  savedCount: number;
  compatibilityAverage: number;
}

export interface InternshipApplicationTracker {
  applicationId: string;
  internshipId: string;
  title: string;
  companyName: string;
  lifecycleStage: InternshipLifecycleStage;
  status: string;
  appliedAt: string | null;
  deadline: string | null;
  companyResponse: string | null;
  interviewRounds: { round: number; date: string | null; status: string }[];
  documents: { name: string; submitted: boolean }[];
  compatibility: number;
  notes: string | null;
}

export interface InternshipTimelineEvent {
  id: string;
  date: string;
  label: string;
  type: 'deadline' | 'interview' | 'networking' | 'onboarding' | 'duration' | 'applied';
  internshipTitle: string;
  companyName: string;
}

export interface InternshipNotification {
  id: string;
  text: string;
  type: 'deadline' | 'interview' | 'compatibility' | 'offer' | 'info';
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface InternshipAnalytics {
  applicationSuccessRate: number | null;
  interviewConversion: number | null;
  strongestIndustry: string | null;
  topCompatibleSector: string | null;
  totalTracked: number;
}

export interface InternshipJournalEntry {
  id: string;
  title: string;
  content: string;
  kind: string;
  createdAt: string;
  internshipId: string | null;
}

export interface InternshipsHub {
  dashboard: InternshipDashboard;
  lifecycleCounts: Record<InternshipLifecycleStage, number>;
  recommended: InternshipCard[];
  trending: InternshipCard[];
  goalMatched: InternshipCard[];
  forYou: InternshipCard[];
  allInternships: InternshipCard[];
  trackers: InternshipApplicationTracker[];
  timeline: InternshipTimelineEvent[];
  notifications: InternshipNotification[];
  analytics: InternshipAnalytics;
  journal: InternshipJournalEntry[];
  primaryGoal: { roleTitle: string; companyName: string | null } | null;
  hasCompanyData: boolean;
  serverTime: string;
}

const ACTIVE_STATUSES = ['applied', 'interviewing', 'interview', 'offer_received', 'offer', 'accepted', 'completed', 'rejected'];

function matchesGoal(title: string, company: string, goal: { roleTitle: string; companyName: string | null }): boolean {
  const g = goal.roleTitle.toLowerCase();
  const t = title.toLowerCase();
  const c = company.toLowerCase();
  if (goal.companyName && c.includes(goal.companyName.toLowerCase())) return true;
  return g.split(/\s+/).some((w) => w.length > 3 && t.includes(w));
}

function buildTimeline(
  cards: InternshipCard[],
  trackers: InternshipApplicationTracker[]
): InternshipTimelineEvent[] {
  const events: InternshipTimelineEvent[] = [];
  const now = Date.now();

  for (const card of cards) {
    if (card.deadline) {
      const d = new Date(card.deadline);
      events.push({
        id: `deadline-${card.id}`,
        date: card.deadline,
        label: 'Application deadline',
        type: 'deadline',
        internshipTitle: card.title,
        companyName: card.companyName,
      });
    }
    if (card.lifecycleStage === 'interviewing') {
      events.push({
        id: `interview-${card.id}`,
        date: new Date(now + 7 * 86400000).toISOString(),
        label: 'Interview stage (estimated)',
        type: 'interview',
        internshipTitle: card.title,
        companyName: card.companyName,
      });
    }
  }

  for (const tr of trackers) {
    if (tr.appliedAt) {
      events.push({
        id: `applied-${tr.applicationId}`,
        date: tr.appliedAt,
        label: 'Application submitted',
        type: 'applied',
        internshipTitle: tr.title,
        companyName: tr.companyName,
      });
    }
    if (tr.lifecycleStage === 'accepted') {
      events.push({
        id: `onboard-${tr.internshipId}`,
        date: new Date(now + 14 * 86400000).toISOString(),
        label: 'Onboarding window',
        type: 'onboarding',
        internshipTitle: tr.title,
        companyName: tr.companyName,
      });
    }
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 12);
}

function buildNotifications(cards: InternshipCard[], trackers: InternshipApplicationTracker[]): InternshipNotification[] {
  const items: InternshipNotification[] = [];
  const now = Date.now();

  for (const card of cards) {
    if (card.deadline) {
      const hours = (new Date(card.deadline).getTime() - now) / 3600000;
      if (hours > 0 && hours <= 48) {
        items.push({
          id: `deadline-${card.id}`,
          text: `Application deadline tomorrow for ${card.title} at ${card.companyName}.`,
          type: 'deadline',
          href: '/student/career/internships',
          urgency: hours <= 24 ? 'high' : 'medium',
        });
      }
    }
    if (card.lifecycleStage === 'interviewing') {
      items.push({
        id: `interview-${card.id}`,
        text: `Interview stage active — ${card.title} at ${card.companyName}.`,
        type: 'interview',
        href: '/student/career/internships',
        urgency: 'high',
      });
    }
    if (card.compatibility >= 80 && !card.applicationStatus) {
      items.push({
        id: `compat-${card.id}`,
        text: `Strong ${card.compatibility}% match: ${card.title}.`,
        type: 'compatibility',
        href: '/student/career/internships',
        urgency: 'low',
      });
    }
  }

  for (const tr of trackers) {
    if (tr.lifecycleStage === 'offer_received') {
      items.push({
        id: `offer-${tr.applicationId}`,
        text: `Offer stage — ${tr.title} at ${tr.companyName}.`,
        type: 'offer',
        href: '/student/career/internships',
        urgency: 'high',
      });
    }
  }

  return items.slice(0, 8);
}

function buildTracker(card: InternshipCard, app: {
  id: string;
  status: string;
  appliedAt: Date | null;
  companyResponse: string | null;
  interviewRounds: unknown;
  documentsJson: unknown;
  notes: string | null;
}): InternshipApplicationTracker {
  let interviewRounds: InternshipApplicationTracker['interviewRounds'] = [];
  if (Array.isArray(app.interviewRounds)) {
    interviewRounds = app.interviewRounds as InternshipApplicationTracker['interviewRounds'];
  } else if (app.status === 'interviewing' || app.status === 'interview') {
    interviewRounds = [{ round: 1, date: null, status: 'scheduled' }];
  }

  let documents: InternshipApplicationTracker['documents'] = [
    { name: 'CV / Resume', submitted: true },
    { name: 'Cover letter', submitted: app.status !== 'preparing' && app.status !== 'candidate' },
  ];
  if (app.documentsJson && typeof app.documentsJson === 'object' && Array.isArray(app.documentsJson)) {
    documents = app.documentsJson as InternshipApplicationTracker['documents'];
  }

  return {
    applicationId: app.id,
    internshipId: card.id,
    title: card.title,
    companyName: card.companyName,
    lifecycleStage: card.lifecycleStage ?? 'preparing',
    status: app.status,
    appliedAt: app.appliedAt?.toISOString() ?? card.appliedAt,
    deadline: card.deadline,
    companyResponse: app.companyResponse,
    interviewRounds,
    documents,
    compatibility: card.compatibility,
    notes: app.notes,
  };
}

export async function loadStudentInternshipsHub(userId: string): Promise<InternshipsHub> {
  await ensurePartnershipTables();
  await ensureInternshipTables();

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const universityId = studentProfile?.universityId ?? null;
  const studentProfileId = studentProfile?.id ?? null;
  const profile = await buildStudentProfile(userId);

  const [internships, bookmarks, applications, targets, journal] = await Promise.all([
    universityId
      ? prisma.internship.findMany({
          where: { universityId, status: { in: ['ACTIVE', 'PUBLISHED'] } },
          include: {
            careerPath: true,
            companyUser: { include: { companyProfile: true } },
            _count: { select: { applications: true } },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.internshipBookmark.findMany({ where: { userId }, select: { internshipId: true } }).catch(() => []),
    studentProfileId
      ? prisma.internshipApplication.findMany({
          where: { studentId: studentProfileId },
          include: { internship: { include: { companyUser: { include: { companyProfile: true } } } } },
        }).catch(() => [])
      : Promise.resolve([]),
    prisma.careerTarget.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { compatibility: 'desc' }],
      take: 3,
    }),
    studentProfileId
      ? prisma.studentInternshipJournal
          .findMany({
            where: { studentId: studentProfileId },
            orderBy: { createdAt: 'desc' },
            take: 8,
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const bookmarked = new Set(bookmarks.map((b) => b.internshipId));
  const appByInternship = new Map(
    applications.map((a) => [a.internshipId, a])
  );

  const allInternships: InternshipCard[] = internships.map((i) => {
    const company = i.companyUser.companyProfile?.companyName ?? 'Company';
    const industry = i.companyUser.companyProfile?.industry ?? null;
    const app = appByInternship.get(i.id);
    return buildInternshipCard(
      i,
      company,
      industry,
      profile,
      bookmarked,
      app
        ? {
            id: app.id,
            status: app.status,
            appliedAt: app.appliedAt,
          }
        : null
    );
  });

  const primaryGoal = targets.find((t) => t.isPrimary) ?? targets[0] ?? null;

  const recommended = [...allInternships]
    .filter((c) => !c.lifecycleStage || c.lifecycleStage === 'saved' || c.lifecycleStage === 'preparing')
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, 6);

  const trending = [...allInternships]
    .sort((a, b) => b.candidateCount - a.candidateCount)
    .slice(0, 5);

  const goalMatched = primaryGoal
    ? allInternships
        .filter((c) => matchesGoal(c.title, c.companyName, primaryGoal))
        .sort((a, b) => b.compatibility - a.compatibility)
        .slice(0, 5)
    : [];

  const forYou = [...new Set([...recommended.slice(0, 3), ...goalMatched.slice(0, 2)])].slice(0, 6);

  const lifecycleCounts: Record<InternshipLifecycleStage, number> = {
    saved: 0,
    preparing: 0,
    applied: 0,
    interviewing: 0,
    offer_received: 0,
    accepted: 0,
    rejected: 0,
    completed: 0,
  };

  for (const c of allInternships) {
    if (c.lifecycleStage) lifecycleCounts[c.lifecycleStage]++;
  }
  lifecycleCounts.saved += bookmarks.filter(
    (b) => !appByInternship.has(b.internshipId)
  ).length;

  const appsWithStatus = applications.filter((a) => ACTIVE_STATUSES.includes(a.status) || a.status === 'preparing' || a.status === 'candidate');
  const applicationsSent = applications.filter((a) =>
    ['applied', 'interviewing', 'interview', 'offer_received', 'offer', 'accepted', 'rejected', 'completed'].includes(a.status)
  ).length;
  const interviews = applications.filter((a) =>
    ['interviewing', 'interview', 'offer_received', 'offer'].includes(a.status)
  ).length;
  const offersReceived = applications.filter((a) =>
    ['offer_received', 'offer', 'accepted'].includes(a.status)
  ).length;

  const acceptedApp = applications.find((a) => a.status === 'accepted' || a.status === 'completed');
  const currentInternship = acceptedApp
    ? {
        id: acceptedApp.internshipId,
        title: acceptedApp.internship.title,
        companyName: acceptedApp.internship.companyUser.companyProfile?.companyName ?? 'Company',
      }
    : null;

  const compatibilityAverage =
    allInternships.length > 0
      ? Math.round(allInternships.reduce((a, c) => a + c.compatibility, 0) / allInternships.length)
      : profile.employabilityScore;

  const trackers: InternshipApplicationTracker[] = applications
    .map((app) => {
      const card = allInternships.find((c) => c.id === app.internshipId);
      if (!card) return null;
      return buildTracker(card, app);
    })
    .filter((t): t is InternshipApplicationTracker => t != null);

  const timeline = buildTimeline(allInternships, trackers);
  const notifications = buildNotifications(allInternships, trackers);

  const rejected = applications.filter((a) => a.status === 'rejected').length;
  const applied = applicationsSent;
  const analytics: InternshipAnalytics = {
    applicationSuccessRate:
      applied > 0 ? Math.round(((applied - rejected) / applied) * 100) : null,
    interviewConversion:
      applied > 0 ? Math.round((interviews / applied) * 100) : null,
    strongestIndustry: internships[0]?.companyUser.companyProfile?.industry ?? null,
    topCompatibleSector: recommended[0]?.department ?? null,
    totalTracked: appsWithStatus.length,
  };

  return {
    dashboard: {
      applicationsSent,
      interviews,
      offersReceived,
      currentInternship,
      savedCount: bookmarks.length,
      compatibilityAverage,
    },
    lifecycleCounts,
    recommended,
    trending,
    goalMatched,
    forYou,
    allInternships,
    trackers,
    timeline,
    notifications,
    analytics,
    journal: journal.map((j) => ({
      id: j.id,
      title: j.title,
      content: j.content,
      kind: j.kind,
      createdAt: j.createdAt.toISOString(),
      internshipId: j.internshipId,
    })),
    primaryGoal: primaryGoal
      ? { roleTitle: primaryGoal.roleTitle, companyName: primaryGoal.companyName }
      : null,
    hasCompanyData: internships.length > 0,
    serverTime: new Date().toISOString(),
  };
}

export async function updateInternshipLifecycle(
  userId: string,
  internshipId: string,
  status: InternshipLifecycleStage
) {
  const studentProfileId = (
    await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } })
  )?.id;
  if (!studentProfileId) throw new Error('Profile required');

  const appliedAt = ['applied', 'interviewing', 'offer_received', 'accepted', 'rejected', 'completed'].includes(
    status
  )
    ? new Date()
    : undefined;

  return prisma.internshipApplication.upsert({
    where: {
      internshipId_studentId: { internshipId, studentId: studentProfileId },
    },
    create: {
      internshipId,
      studentId: studentProfileId,
      status,
      appliedAt: appliedAt ?? null,
    },
    update: {
      status,
      ...(appliedAt ? { appliedAt } : {}),
    },
  });
}

export async function addJournalEntry(
  userId: string,
  data: { title: string; content: string; kind?: string; internshipId?: string }
) {
  const studentProfileId = (
    await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } })
  )?.id;
  if (!studentProfileId) throw new Error('Profile required');

  await ensureInternshipTables();
  return prisma.studentInternshipJournal.create({
    data: {
      studentId: studentProfileId,
      title: data.title,
      content: data.content,
      kind: data.kind ?? 'reflection',
      internshipId: data.internshipId ?? null,
    },
  });
}
