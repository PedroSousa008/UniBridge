import { prisma } from '@/lib/db';
import { ensureOpportunityTables } from '@/lib/db/ensure-opportunities-schema';
import { ensureInternshipTables } from '@/lib/db/ensure-internships-schema';
import { ensurePartnershipTables } from '@/lib/db/ensure-partnerships-schema';
import {
  buildOpportunityAnalytics,
  buildOpportunityNotifications,
  buildOpportunityRow,
  buildRejectionInsight,
  inferCategory,
  mapStageToDbStatus,
  runOpportunityAdvisor,
  type OpportunityCategory,
  type OpportunityNotification,
  type OpportunityRow,
  type OpportunityStage,
  type RejectionInsight,
  OPPORTUNITY_STAGES,
} from '@/lib/career/opportunities-intelligence';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { buildInternshipCard } from '@/lib/student/internship-job-builder';

export interface OpportunityTimelineEvent {
  id: string;
  date: string;
  label: string;
  stage: OpportunityStage;
  companyName: string;
  role: string;
  href: string;
}

export interface NetworkingEntry {
  id: string;
  label: string;
  kind: 'event' | 'recruiter' | 'referral' | 'follow_up';
  date: string | null;
  notes: string | null;
}

export interface OpportunityInteraction {
  type: string;
  label: string;
  at: string;
}

export interface OpportunityWorkspace {
  row: OpportunityRow;
  description: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  matchedSkills: { name: string; score: number; matched: boolean }[];
  missingSkills: { name: string; gapPercent: number; importance: number }[];
  whyMatches: string[];
  improveTips: string[];
  aiInsight: string;
  documents: { name: string; submitted: boolean }[];
  interviewRounds: { round: number; date: string | null; status: string; interviewer?: string }[];
  companyResponse: string | null;
  interactions: OpportunityInteraction[];
  rejectionInsight: RejectionInsight | null;
  reflections: { id: string; title: string; content: string; createdAt: string }[];
  ecosystem: {
    compatibilityHref: string;
    skillsHref: string;
    cvHref: string;
    mentorHref: string;
  };
  comparisonDefaults: string[];
}

export interface OpportunitiesHub {
  pipeline: OpportunityRow[];
  saved: OpportunityRow[];
  byStage: Record<OpportunityStage, number>;
  notifications: OpportunityNotification[];
  analytics: ReturnType<typeof buildOpportunityAnalytics>;
  timeline: OpportunityTimelineEvent[];
  networking: NetworkingEntry[];
  aiPrioritized: OpportunityRow[];
  categories: { id: OpportunityCategory; label: string; count: number }[];
  stages: typeof OPPORTUNITY_STAGES;
  primaryRole: string | null;
  compareIds: string[];
  serverTime: string;
}

const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  internship: 'Internships',
  graduate: 'Graduate Programs',
  part_time: 'Part-Time',
  full_time: 'Full-Time',
  startup: 'Startup Opportunities',
  freelance: 'Freelance',
  research: 'Research Positions',
};

function parseInterviewRounds(raw: unknown): { round: number; date: string | null; status: string; interviewer?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw as { round: number; date: string | null; status: string; interviewer?: string }[];
}

function parseInteractions(raw: unknown): OpportunityInteraction[] {
  if (!Array.isArray(raw)) return [];
  return raw as OpportunityInteraction[];
}

function parseReflections(raw: unknown): { id: string; title: string; content: string; at: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw as { id: string; title: string; content: string; at: string }[];
}

async function loadPipelineCards(userId: string) {
  await ensurePartnershipTables();
  await ensureInternshipTables();
  await ensureOpportunityTables();

  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const universityId = studentProfile?.universityId ?? null;
  const studentProfileId = studentProfile?.id ?? null;
  const profile = await buildStudentProfile(userId);

  const [internships, bookmarks, applications] = await Promise.all([
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
    prisma.internshipBookmark.findMany({ where: { userId } }).catch(() => []),
    studentProfileId
      ? prisma.internshipApplication.findMany({
          where: { studentId: studentProfileId },
        }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const bookmarked = new Set(bookmarks.map((b) => b.internshipId));
  const appByInternship = new Map(applications.map((a) => [a.internshipId, a]));

  const cards = internships.map((i) => {
    const company = i.companyUser.companyProfile?.companyName ?? 'Company';
    const industry = i.companyUser.companyProfile?.industry ?? null;
    const app = appByInternship.get(i.id);
    return {
      card: buildInternshipCard(
        i,
        company,
        industry,
        profile,
        bookmarked,
        app ? { id: app.id, status: app.status, appliedAt: app.appliedAt } : null
      ),
      logoUrl: i.companyUser.companyProfile?.logoUrl ?? null,
      app,
    };
  });

  return { cards, profile, bookmarked, appByInternship };
}

export async function loadStudentOpportunitiesHub(
  userId: string,
  options?: { compareIds?: string[] }
): Promise<OpportunitiesHub> {
  const { cards, bookmarked, appByInternship } = await loadPipelineCards(userId);
  const pathsHub = await loadStudentCareerPathsHub(userId);
  const primary = pathsHub.paths.find((p) => p.isPrimaryTarget) ?? pathsHub.bestFit;

  const pipeline: OpportunityRow[] = [];

  for (const { card, logoUrl, app } of cards) {
    const inPipeline = card.isBookmarked || card.applicationId;
    if (!inPipeline) continue;

    const rounds = app ? parseInterviewRounds(app.interviewRounds) : [];
    const appRow = app as {
      priority?: boolean;
      nextAction?: string | null;
      notes?: string | null;
      category?: string | null;
    } | undefined;

    pipeline.push(
      buildOpportunityRow(card, {
        companyLogoUrl: logoUrl,
        priority: appRow?.priority ?? false,
        nextAction: appRow?.nextAction ?? null,
        notes: appRow?.notes ?? null,
        category: inferCategory(
          (appRow?.category as OpportunityCategory) ?? card.employmentType
        ),
        interviewRounds: rounds,
      })
    );
  }

  pipeline.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return b.aiPriorityScore - a.aiPriorityScore;
  });

  const saved = pipeline.filter((r) => r.stage === 'saved' || (r.isBookmarked && r.stage === 'preparing'));
  const byStage = {} as Record<OpportunityStage, number>;
  for (const s of OPPORTUNITY_STAGES) byStage[s.id] = 0;
  for (const r of pipeline) byStage[r.stage]++;

  const categories = (Object.keys(CATEGORY_LABELS) as OpportunityCategory[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    count: pipeline.filter((p) => p.category === id).length,
  }));

  const timeline: OpportunityTimelineEvent[] = [];
  for (const r of pipeline) {
    if (r.applicationDate) {
      timeline.push({
        id: `applied-${r.id}`,
        date: r.applicationDate,
        label: 'Applied',
        stage: 'applied',
        companyName: r.companyName,
        role: r.role,
        href: r.href,
      });
    }
    if (r.stage === 'interview' || r.stage === 'final_interview') {
      timeline.push({
        id: `int-${r.id}`,
        date: new Date().toISOString(),
        label: r.stageLabel,
        stage: r.stage,
        companyName: r.companyName,
        role: r.role,
        href: r.href,
      });
    }
    if (r.stage === 'offer_received') {
      timeline.push({
        id: `offer-${r.id}`,
        date: new Date().toISOString(),
        label: 'Offer received',
        stage: r.stage,
        companyName: r.companyName,
        role: r.role,
        href: r.href,
      });
    }
    if (r.stage === 'rejected') {
      timeline.push({
        id: `rej-${r.id}`,
        date: new Date().toISOString(),
        label: 'Rejected',
        stage: r.stage,
        companyName: r.companyName,
        role: r.role,
        href: r.href,
      });
    }
  }
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const networking: NetworkingEntry[] = [
    {
      id: 'net-1',
      label: 'Career fair / campus recruiting',
      kind: 'event',
      date: null,
      notes: 'Log events in opportunity notes to track follow-ups',
    },
  ];

  const aiPrioritized = [...pipeline].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore).slice(0, 5);

  return {
    pipeline,
    saved,
    byStage,
    notifications: buildOpportunityNotifications(pipeline),
    analytics: buildOpportunityAnalytics(pipeline),
    timeline,
    networking,
    aiPrioritized,
    categories,
    stages: OPPORTUNITY_STAGES,
    primaryRole: primary?.roleTitle ?? null,
    compareIds: options?.compareIds ?? pipeline.slice(0, 3).map((p) => p.id),
    serverTime: new Date().toISOString(),
  };
}

export async function loadOpportunityWorkspace(
  userId: string,
  internshipId: string
): Promise<OpportunityWorkspace | null> {
  const { cards, profile, bookmarked } = await loadPipelineCards(userId);
  let match = cards.find((c) => c.card.id === internshipId);

  if (!match) {
    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
    const internship = studentProfile?.universityId
      ? await prisma.internship.findFirst({
          where: { id: internshipId, universityId: studentProfile.universityId },
          include: {
            careerPath: true,
            companyUser: { include: { companyProfile: true } },
            _count: { select: { applications: true } },
          },
        })
      : null;
    if (!internship) return null;
    const app = studentProfile
      ? await prisma.internshipApplication.findUnique({
          where: {
            internshipId_studentId: { internshipId, studentId: studentProfile.id },
          },
        })
      : null;
    const company = internship.companyUser.companyProfile?.companyName ?? 'Company';
    const card = buildInternshipCard(
      internship,
      company,
      internship.companyUser.companyProfile?.industry ?? null,
      profile,
      bookmarked,
      app ? { id: app.id, status: app.status, appliedAt: app.appliedAt } : null
    );
    match = { card, logoUrl: internship.companyUser.companyProfile?.logoUrl ?? null, app: app ?? undefined };
  }

  const { card, logoUrl, app } = match;
  const rounds = app ? parseInterviewRounds(app.interviewRounds) : [];
  const appExt = app as {
    priority?: boolean;
    nextAction?: string | null;
    notes?: string | null;
    category?: string | null;
    companyResponse?: string | null;
    documentsJson?: unknown;
    interactionHistory?: unknown;
    reflectionsJson?: unknown;
  } | undefined;

  const row = buildOpportunityRow(card, {
    companyLogoUrl: logoUrl,
    priority: appExt?.priority ?? false,
    nextAction: appExt?.nextAction ?? null,
    notes: appExt?.notes ?? null,
    category: inferCategory((appExt?.category as OpportunityCategory) ?? card.employmentType),
    interviewRounds: rounds,
  });

  let documents: { name: string; submitted: boolean }[] = [
    { name: 'CV / Resume', submitted: !!app },
    { name: 'Cover letter', submitted: row.stage !== 'preparing' && row.stage !== 'saved' },
  ];
  if (appExt?.documentsJson && Array.isArray(appExt.documentsJson)) {
    documents = appExt.documentsJson as { name: string; submitted: boolean }[];
  }

  const interactions = parseInteractions(appExt?.interactionHistory);
  if (row.stage === 'applied' && !interactions.some((i) => i.type === 'submitted')) {
    interactions.unshift({
      type: 'submitted',
      label: 'Application submitted via UniBridge',
      at: row.applicationDate ?? new Date().toISOString(),
    });
  }

  const studentRow = await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  const journal =
    app && studentRow
      ? await prisma.studentInternshipJournal
          .findMany({
            where: { studentId: studentRow.id, internshipId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
          .catch(() => [])
      : [];

  const reflections = [
    ...parseReflections(appExt?.reflectionsJson).map((r, i) => ({
      id: `ref-${i}`,
      title: r.title,
      content: r.content,
      createdAt: r.at,
    })),
    ...journal.map((j) => ({
      id: j.id,
      title: j.title,
      content: j.content,
      createdAt: j.createdAt.toISOString(),
    })),
  ];

  return {
    row,
    description: card.description,
    requiredSkills: card.requiredSkills,
    preferredSkills: card.preferredSkills,
    matchedSkills: card.matchedSkills,
    missingSkills: card.missingSkills,
    whyMatches: card.whyMatches,
    improveTips: card.improveTips,
    aiInsight: card.aiInsight,
    documents,
    interviewRounds: rounds,
    companyResponse: appExt?.companyResponse ?? null,
    interactions,
    rejectionInsight: row.stage === 'rejected' ? buildRejectionInsight(row, profile) : null,
    reflections,
    ecosystem: {
      compatibilityHref: '/student/career/compatibility',
      skillsHref: '/student/career/skills',
      cvHref: '/student/career/cv',
      mentorHref: '/student/career/mentor',
    },
    comparisonDefaults: cards.slice(0, 3).map((c) => c.card.id),
  };
}

export async function updateOpportunity(
  userId: string,
  internshipId: string,
  data: {
    stage?: OpportunityStage;
    priority?: boolean;
    notes?: string;
    nextAction?: string;
    interviewRounds?: { round: number; date: string | null; status: string; interviewer?: string }[];
    interaction?: OpportunityInteraction;
  }
) {
  await ensureOpportunityTables();
  const studentProfileId = (
    await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } })
  )?.id;
  if (!studentProfileId) throw new Error('Profile required');

  const existing = await prisma.internshipApplication.findUnique({
    where: { internshipId_studentId: { internshipId, studentId: studentProfileId } },
  });

  let interactionHistory = parseInteractions(existing?.interactionHistory);
  if (data.interaction) {
    interactionHistory = [data.interaction, ...interactionHistory].slice(0, 20);
  }

  const status = data.stage ? mapStageToDbStatus(data.stage) : existing?.status ?? 'preparing';
  const appliedAt =
    data.stage && !['saved', 'preparing'].includes(data.stage) ? new Date() : existing?.appliedAt;

  return prisma.internshipApplication.upsert({
    where: { internshipId_studentId: { internshipId, studentId: studentProfileId } },
    create: {
      internshipId,
      studentId: studentProfileId,
      status,
      appliedAt: appliedAt ?? null,
      priority: data.priority ?? false,
      notes: data.notes,
      nextAction: data.nextAction,
      interviewRounds: data.interviewRounds ?? [],
      interactionHistory: interactionHistory as object,
    },
    update: {
      ...(data.stage ? { status } : {}),
      ...(appliedAt ? { appliedAt } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.nextAction !== undefined ? { nextAction: data.nextAction } : {}),
      ...(data.interviewRounds ? { interviewRounds: data.interviewRounds as object } : {}),
      interactionHistory: interactionHistory as object,
    },
  });
}

export async function addOpportunityReflection(
  userId: string,
  internshipId: string,
  reflection: { title: string; content: string }
) {
  await ensureOpportunityTables();
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!studentProfile) throw new Error('Profile required');

  await prisma.studentInternshipJournal.create({
    data: {
      studentId: studentProfile.id,
      internshipId,
      title: reflection.title,
      content: reflection.content,
      kind: 'interview_reflection',
    },
  });

  const app = await prisma.internshipApplication.findUnique({
    where: {
      internshipId_studentId: { internshipId, studentId: studentProfile.id },
    },
  });

  const prev = parseReflections(app?.reflectionsJson);
  prev.unshift({
    id: `local-${Date.now()}`,
    title: reflection.title,
    content: reflection.content,
    at: new Date().toISOString(),
  });

  if (app) {
    await prisma.internshipApplication.update({
      where: { id: app.id },
      data: { reflectionsJson: prev.slice(0, 15) as object },
    });
  }

  return reflection;
}

export function runOpportunityAdvisorFromHub(prompt: string, hub: OpportunitiesHub): string {
  return runOpportunityAdvisor(prompt, hub.pipeline, hub.primaryRole);
}

export { runOpportunityAdvisor };
