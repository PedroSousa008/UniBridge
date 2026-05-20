import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import {
  buildCompanyCandidateCard,
  type PipelineCandidateProfile,
} from '@/lib/company/company-candidate-builder';
import {
  assignPipelineAiSections,
  DEFAULT_PIPELINE_TAGS,
  normalizePipelineStage,
  PIPELINE_AI_SECTIONS,
  PIPELINE_STAGES,
  passesPipelineFilters,
  scoreSearchMatch,
  stageFromApplicationStatus,
  type PipelineAiSectionId,
  type PipelineFilters,
  type PipelineNote,
  type PipelineStageId,
  type PipelineTimelineEvent,
  SEARCH_SUGGESTIONS,
} from '@/lib/company/company-pipeline-intelligence';

function newId() {
  return crypto.randomUUID();
}

function parseNotes(val: unknown): PipelineNote[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? newId()),
        body: String(o.body ?? ''),
        pinned: Boolean(o.pinned),
        authorName: String(o.authorName ?? 'Recruiter'),
        createdAt: String(o.createdAt ?? new Date().toISOString()),
        updatedAt: String(o.updatedAt ?? new Date().toISOString()),
      };
    })
    .filter((n) => n.body.trim());
}

function parseTimeline(val: unknown, fallback: PipelineTimelineEvent[]): PipelineTimelineEvent[] {
  if (!Array.isArray(val) || val.length === 0) return fallback;
  return val
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>;
      return {
        id: String(o.id ?? newId()),
        type: String(o.type ?? 'activity'),
        title: String(o.title ?? 'Update'),
        detail: typeof o.detail === 'string' ? o.detail : null,
        at: String(o.at ?? new Date().toISOString()),
      };
    });
}

function parseStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map(String);
}

export interface PipelineCard {
  id: string;
  stage: PipelineStageId;
  rating: number | null;
  tags: string[];
  isFollowed: boolean;
  notes: PipelineNote[];
  legacyNotes: string;
  assignedTo: string | null;
  reminderAt: string | null;
  applicationId: string | null;
  candidate: PipelineCandidateProfile;
  interviews: { id: string; startAt: string; endAt: string; meetingLink: string | null; status: string }[];
  messageCount: number;
  talentHref: string;
  updatedAt: string;
}

export interface PipelineAnalytics {
  savedTalent: number;
  highCompatibility: number;
  futurePotential: number;
  startupFounders: number;
  leadershipProfiles: number;
  fastestGrowing: number;
  openToOpportunities: number;
  highActivity: number;
  watching: number;
  inInterview: number;
}

export interface CompanyPipelineHub {
  stages: typeof PIPELINE_STAGES;
  columns: Record<PipelineStageId, PipelineCard[]>;
  allCards: PipelineCard[];
  /** Full pipeline pool (unfiltered) for compare / AI */
  pipelinePool: PipelineCard[];
  analytics: PipelineAnalytics;
  aiSections: { id: PipelineAiSectionId; title: string; subtitle: string; pipelineIds: string[] }[];
  searchSuggestions: string[];
  defaultTags: string[];
  dbReady: boolean;
  serverTime: string;
}

export async function migrateLegacyPipelineStages(companyUserId: string) {
  const dbReady = await ensureCompanyEcosystemTables();
  if (!dbReady) return;
  const rows = await prisma.companyPipelineCandidate.findMany({
    where: { companyUserId },
    select: { id: true, stage: true },
  });
  for (const row of rows) {
    const normalized = normalizePipelineStage(row.stage);
    if (normalized !== row.stage) {
      await prisma.companyPipelineCandidate.update({
        where: { id: row.id },
        data: { stage: normalized },
      });
    }
  }
}

export async function syncPipelineFromApplications(companyUserId: string) {
  const dbReady = await ensureCompanyEcosystemTables();
  if (!dbReady) return;

  const apps = await prisma.internshipApplication.findMany({
    where: { internship: { companyUserId } },
    include: { student: { select: { userId: true, id: true } } },
  });

  for (const app of apps) {
    await prisma.companyPipelineCandidate.upsert({
      where: {
        companyUserId_studentUserId: {
          companyUserId,
          studentUserId: app.student.userId,
        },
      },
      create: {
        companyUserId,
        studentUserId: app.student.userId,
        studentProfileId: app.student.id,
        applicationId: app.id,
        stage: stageFromApplicationStatus(app.status),
      },
      update: {
        applicationId: app.id,
        stage: stageFromApplicationStatus(app.status),
      },
    });
  }
}

function computeAnalytics(cards: PipelineCard[]): PipelineAnalytics {
  const active = cards.filter((c) => c.stage !== 'archived');
  return {
    savedTalent: active.filter((c) => ['saved', 'watching', 'future_potential'].includes(c.stage)).length,
    highCompatibility: active.filter((c) => (c.candidate.compatibilityScore ?? 0) >= 75).length,
    futurePotential: cards.filter((c) => c.stage === 'future_potential').length,
    startupFounders: active.filter((c) => c.candidate.startupInvolvement).length,
    leadershipProfiles: active.filter((c) => c.candidate.leadershipScore >= 65).length,
    fastestGrowing: active.filter((c) => c.candidate.growthPercent >= 10).length,
    openToOpportunities: active.filter((c) => c.candidate.availability.length > 0).length,
    highActivity: active.filter((c) => c.candidate.ecosystemSignals.length >= 2).length,
    watching: cards.filter((c) => c.stage === 'watching').length,
    inInterview: cards.filter((c) => c.stage === 'interview').length,
  };
}

export async function loadCompanyPipelineHub(
  companyUserId: string,
  options?: { query?: string; filters?: PipelineFilters; includeArchived?: boolean }
): Promise<CompanyPipelineHub> {
  const dbReady = await ensureCompanyEcosystemTables();
  if (dbReady) {
    await migrateLegacyPipelineStages(companyUserId);
    await syncPipelineFromApplications(companyUserId);
  }

  const columns = PIPELINE_STAGES.reduce(
    (acc, s) => {
      acc[s.id] = [];
      return acc;
    },
    {} as Record<PipelineStageId, PipelineCard[]>
  );

  if (!dbReady) {
    return {
      stages: PIPELINE_STAGES,
      columns,
      allCards: [],
      pipelinePool: [],
      analytics: {
        savedTalent: 0,
        highCompatibility: 0,
        futurePotential: 0,
        startupFounders: 0,
        leadershipProfiles: 0,
        fastestGrowing: 0,
        openToOpportunities: 0,
        highActivity: 0,
        watching: 0,
        inInterview: 0,
      },
      aiSections: PIPELINE_AI_SECTIONS.map((s) => ({ ...s, pipelineIds: [] })),
      searchSuggestions: SEARCH_SUGGESTIONS,
      defaultTags: DEFAULT_PIPELINE_TAGS,
      dbReady: false,
      serverTime: new Date().toISOString(),
    };
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: companyUserId },
    select: { name: true },
  });
  const authorName = companyUser?.name ?? 'Recruiter';

  const rows = await prisma.companyPipelineCandidate.findMany({
    where: { companyUserId },
    include: {
      interviews: { orderBy: { startAt: 'asc' } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const allCards: PipelineCard[] = [];

  for (const row of rows) {
    const candidate = await buildCompanyCandidateCard(row.studentUserId, companyUserId);
    if (!candidate) continue;

    const stage = normalizePipelineStage(row.stage);
    const notes = parseNotes((row as { notesJson?: unknown }).notesJson);
    const legacy = row.internalNotes?.trim() ?? '';
    const mergedNotes =
      notes.length > 0
        ? notes
        : legacy
          ? [
              {
                id: 'legacy',
                body: legacy,
                pinned: true,
                authorName,
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
              },
            ]
          : [];

    const storedSignals = parseStringArray((row as { ecosystemSignals?: unknown }).ecosystemSignals);
    const ecosystemSignals =
      storedSignals.length > 0
        ? storedSignals
        : candidate.ecosystemSignals;

    const timeline = parseTimeline(
      (row as { timelineJson?: unknown }).timelineJson,
      candidate.timeline
    );

    const card: PipelineCard = {
      id: row.id,
      stage,
      rating: row.rating,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      isFollowed: Boolean((row as { isFollowed?: boolean }).isFollowed),
      notes: mergedNotes,
      legacyNotes: legacy,
      assignedTo: row.assignedTo,
      reminderAt: row.reminderAt?.toISOString() ?? null,
      applicationId: row.applicationId,
      candidate: {
        ...candidate,
        ecosystemSignals,
        timeline,
        growthPercent:
          typeof (row as { growthPercent?: number | null }).growthPercent === 'number'
            ? Number((row as { growthPercent?: number | null }).growthPercent)
            : candidate.growthPercent,
      },
      interviews: row.interviews.map((i) => ({
        id: i.id,
        startAt: i.startAt.toISOString(),
        endAt: i.endAt.toISOString(),
        meetingLink: i.meetingLink,
        status: i.status,
      })),
      messageCount: row._count.messages,
      talentHref: `/company/talent?student=${row.studentUserId}`,
      updatedAt: row.updatedAt.toISOString(),
    };
    allCards.push(card);
  }

  const query = options?.query?.trim() ?? '';
  const filters = options?.filters ?? {};
  const includeArchived = options?.includeArchived ?? false;

  let filtered = allCards;
  if (!includeArchived) {
    filtered = filtered.filter((c) => c.stage !== 'archived');
  }
  if (filters.stage) {
    filtered = filtered.filter((c) => c.stage === filters.stage);
  }
  if (filters.followed) {
    filtered = filtered.filter((c) => c.isFollowed);
  }
  if (filters.tag) {
    filtered = filtered.filter((c) => c.tags.includes(filters.tag!));
  }
  filtered = filtered.filter((c) => passesPipelineFilters(c.candidate, filters));

  if (query) {
    filtered = filtered
      .map((c) => ({ card: c, score: scoreSearchMatch(c.candidate, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.card);
  }

  for (const card of filtered) {
    columns[card.stage].push(card);
  }

  const sectionMap = assignPipelineAiSections(
    allCards.filter((c) => c.stage !== 'archived').map((c) => ({
      pipelineId: c.id,
      candidate: c.candidate,
      stage: c.stage,
    }))
  );

  return {
    stages: PIPELINE_STAGES,
    columns,
    allCards: filtered,
    pipelinePool: allCards,
    analytics: computeAnalytics(allCards),
    aiSections: PIPELINE_AI_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      pipelineIds: sectionMap[s.id] ?? [],
    })),
    searchSuggestions: SEARCH_SUGGESTIONS,
    defaultTags: DEFAULT_PIPELINE_TAGS,
    dbReady: true,
    serverTime: new Date().toISOString(),
  };
}

export async function upsertPipelineCandidate(
  companyUserId: string,
  studentUserId: string,
  data: Partial<{
    stage: PipelineStageId;
    rating: number;
    tags: string[];
    internalNotes: string;
    notesJson: PipelineNote[];
    isFollowed: boolean;
    assignedTo: string;
    reminderAt: Date;
    ecosystemSignals: string[];
    timelineJson: PipelineTimelineEvent[];
    growthPercent: number;
  }>
) {
  const student = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
  if (!student) return null;

  const stage = data.stage ? normalizePipelineStage(data.stage) : undefined;

  const record = await prisma.companyPipelineCandidate.upsert({
    where: { companyUserId_studentUserId: { companyUserId, studentUserId } },
    create: {
      companyUserId,
      studentUserId,
      studentProfileId: student.id,
      stage: stage ?? 'saved',
      tags: data.tags ?? [],
      internalNotes: data.internalNotes,
    },
    update: {
      ...(stage ? { stage } : {}),
      rating: data.rating,
      tags: data.tags,
      internalNotes: data.internalNotes,
      assignedTo: data.assignedTo,
      reminderAt: data.reminderAt,
    },
  });

  if (data.isFollowed != null) {
    await prisma.$executeRaw`
      UPDATE "CompanyPipelineCandidate" SET "isFollowed" = ${data.isFollowed}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
    `;
  }
  if (data.notesJson) {
    await prisma.$executeRaw`
      UPDATE "CompanyPipelineCandidate" SET "notesJson" = ${JSON.stringify(data.notesJson)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
    `;
  }
  if (data.ecosystemSignals) {
    await prisma.$executeRaw`
      UPDATE "CompanyPipelineCandidate" SET "ecosystemSignals" = ${JSON.stringify(data.ecosystemSignals)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
    `;
  }
  if (data.timelineJson) {
    await prisma.$executeRaw`
      UPDATE "CompanyPipelineCandidate" SET "timelineJson" = ${JSON.stringify(data.timelineJson)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
    `;
  }
  if (data.growthPercent != null) {
    await prisma.$executeRaw`
      UPDATE "CompanyPipelineCandidate" SET "growthPercent" = ${data.growthPercent}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${record.id}
    `;
  }

  return record;
}

export async function addPipelineNote(
  companyUserId: string,
  pipelineId: string,
  body: string,
  authorName: string
) {
  const row = await prisma.companyPipelineCandidate.findFirst({
    where: { id: pipelineId, companyUserId },
  });
  if (!row || !body.trim()) return null;

  const notes = parseNotes((row as { notesJson?: unknown }).notesJson);
  const note: PipelineNote = {
    id: newId(),
    body: body.trim(),
    pinned: false,
    authorName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = [note, ...notes];
  await prisma.$executeRaw`
    UPDATE "CompanyPipelineCandidate" SET "notesJson" = ${JSON.stringify(next)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${pipelineId}
  `;
  return note;
}

export async function updatePipelineNote(
  companyUserId: string,
  pipelineId: string,
  noteId: string,
  patch: Partial<{ body: string; pinned: boolean }>
) {
  const row = await prisma.companyPipelineCandidate.findFirst({
    where: { id: pipelineId, companyUserId },
  });
  if (!row) return null;

  const notes = parseNotes((row as { notesJson?: unknown }).notesJson).map((n) =>
    n.id === noteId
      ? {
          ...n,
          ...(patch.body != null ? { body: patch.body.trim() } : {}),
          ...(patch.pinned != null ? { pinned: patch.pinned } : {}),
          updatedAt: new Date().toISOString(),
        }
      : n
  );
  await prisma.$executeRaw`
    UPDATE "CompanyPipelineCandidate" SET "notesJson" = ${JSON.stringify(notes)}::jsonb, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${pipelineId}
  `;
  return notes.find((n) => n.id === noteId) ?? null;
}

export async function schedulePipelineInterview(
  companyUserId: string,
  pipelineId: string,
  input: { startAt: Date; endAt: Date; meetingLink?: string }
) {
  const pipeline = await prisma.companyPipelineCandidate.findFirst({
    where: { id: pipelineId, companyUserId },
  });
  if (!pipeline) return null;

  const interview = await prisma.companyPipelineInterview.create({
    data: {
      pipelineId,
      startAt: input.startAt,
      endAt: input.endAt,
      meetingLink: input.meetingLink ?? null,
      status: 'scheduled',
    },
  });

  await prisma.companyPipelineCandidate.update({
    where: { id: pipelineId },
    data: { stage: 'interview' },
  });

  await prisma.studentCalendarEvent.create({
    data: {
      studentId: pipeline.studentUserId,
      title: 'Interview invitation',
      description: 'Scheduled via UniBridge company pipeline',
      category: 'CAREER',
      quickType: 'MEETING',
      startAt: input.startAt,
      endAt: input.endAt,
      location: input.meetingLink ?? 'Online',
      sourceRef: `pipeline-interview:${interview.id}`,
      color: '#0f172a',
    },
  });

  await prisma.notification.create({
    data: {
      userId: pipeline.studentUserId,
      type: 'CAREER',
      title: 'Interview scheduled',
      message: `A company scheduled an interview for ${input.startAt.toLocaleString()}`,
      link: '/student/academics/calendar',
    },
  });

  await prisma.companyPipelineInterview.update({
    where: { id: interview.id },
    data: { calendarSynced: true },
  });

  return interview;
}

export async function sendPipelineMessage(
  companyUserId: string,
  pipelineId: string,
  body: string
) {
  const pipeline = await prisma.companyPipelineCandidate.findFirst({
    where: { id: pipelineId, companyUserId },
  });
  if (!pipeline) return null;

  const msg = await prisma.companyPipelineMessage.create({
    data: { pipelineId, senderUserId: companyUserId, body },
  });

  await prisma.notification.create({
    data: {
      userId: pipeline.studentUserId,
      type: 'CAREER',
      title: 'Message from a company',
      message: body.slice(0, 120),
      link: '/student/career/opportunities',
    },
  });

  return msg;
}

export async function loadPipelineCompare(
  companyUserId: string,
  pipelineIds: string[]
): Promise<PipelineCard[]> {
  const hub = await loadCompanyPipelineHub(companyUserId, { includeArchived: true });
  const map = new Map(hub.pipelinePool.map((c) => [c.id, c]));
  return pipelineIds.map((id) => map.get(id)).filter(Boolean) as PipelineCard[];
}
