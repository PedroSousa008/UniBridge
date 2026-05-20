import { prisma } from '@/lib/db';
import { ensureCompanyEcosystemTables } from '@/lib/db/ensure-company-ecosystem-schema';
import { buildCompanyCandidateCard, type CompanyCandidateCard } from '@/lib/company/company-candidate-builder';
import {
  PIPELINE_STAGES,
  stageFromApplicationStatus,
  type PipelineStageId,
} from '@/lib/company/company-pipeline-intelligence';

export interface PipelineCard {
  id: string;
  stage: PipelineStageId;
  rating: number | null;
  tags: string[];
  internalNotes: string;
  assignedTo: string | null;
  reminderAt: string | null;
  applicationId: string | null;
  candidate: CompanyCandidateCard;
  interviews: { id: string; startAt: string; endAt: string; meetingLink: string | null; status: string }[];
  messageCount: number;
}

export interface CompanyPipelineHub {
  stages: typeof PIPELINE_STAGES;
  columns: Record<PipelineStageId, PipelineCard[]>;
  aiHighlights: { label: string; candidateName: string; pipelineId: string }[];
  dbReady: boolean;
  serverTime: string;
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

export async function loadCompanyPipelineHub(companyUserId: string): Promise<CompanyPipelineHub> {
  const dbReady = await ensureCompanyEcosystemTables();
  if (dbReady) await syncPipelineFromApplications(companyUserId);

  const columns = PIPELINE_STAGES.reduce(
    (acc, s) => {
      acc[s.id] = [];
      return acc;
    },
    {} as Record<PipelineStageId, PipelineCard[]>
  );

  if (!dbReady) {
    return { stages: PIPELINE_STAGES, columns, aiHighlights: [], dbReady: false, serverTime: new Date().toISOString() };
  }

  const rows = await prisma.companyPipelineCandidate.findMany({
    where: { companyUserId },
    include: {
      interviews: { orderBy: { startAt: 'asc' } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const aiHighlights: CompanyPipelineHub['aiHighlights'] = [];

  for (const row of rows) {
    const candidate = await buildCompanyCandidateCard(row.studentUserId, companyUserId);
    if (!candidate) continue;

    const stage = (PIPELINE_STAGES.some((s) => s.id === row.stage) ? row.stage : 'saved') as PipelineStageId;
    const card: PipelineCard = {
      id: row.id,
      stage,
      rating: row.rating,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      internalNotes: row.internalNotes ?? '',
      assignedTo: row.assignedTo,
      reminderAt: row.reminderAt?.toISOString() ?? null,
      applicationId: row.applicationId,
      candidate,
      interviews: row.interviews.map((i) => ({
        id: i.id,
        startAt: i.startAt.toISOString(),
        endAt: i.endAt.toISOString(),
        meetingLink: i.meetingLink,
        status: i.status,
      })),
      messageCount: row._count.messages,
    };
    columns[stage].push(card);

    for (const label of candidate.aiLabels.slice(0, 1)) {
      aiHighlights.push({
        label,
        candidateName: candidate.name,
        pipelineId: row.id,
      });
    }
  }

  return {
    stages: PIPELINE_STAGES,
    columns,
    aiHighlights: aiHighlights.slice(0, 6),
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
    assignedTo: string;
    reminderAt: Date;
  }>
) {
  const student = await prisma.studentProfile.findUnique({ where: { userId: studentUserId } });
  if (!student) return null;

  return prisma.companyPipelineCandidate.upsert({
    where: { companyUserId_studentUserId: { companyUserId, studentUserId } },
    create: {
      companyUserId,
      studentUserId,
      studentProfileId: student.id,
      stage: data.stage ?? 'saved',
      ...data,
    },
    update: data,
  });
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
