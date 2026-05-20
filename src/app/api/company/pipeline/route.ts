import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  addPipelineNote,
  loadCompanyPipelineHub,
  loadPipelineCompare,
  sendPipelineMessage,
  schedulePipelineInterview,
  updatePipelineNote,
  upsertPipelineCandidate,
} from '@/lib/company/company-pipeline-hub';
import type { PipelineFilters, PipelineStageId } from '@/lib/company/company-pipeline-intelligence';
import { requireSession } from '@/lib/session';

function parseFilters(searchParams: URLSearchParams): PipelineFilters {
  const filters: PipelineFilters = {};
  const minCompat = searchParams.get('minCompatibility');
  if (minCompat) filters.minCompatibility = Number(minCompat);
  if (searchParams.get('leadership') === '1') filters.leadership = true;
  if (searchParams.get('startup') === '1') filters.startup = true;
  if (searchParams.get('verified') === '1') filters.verified = true;
  if (searchParams.get('openToOpportunities') === '1') filters.openToOpportunities = true;
  if (searchParams.get('followed') === '1') filters.followed = true;
  const stage = searchParams.get('stage');
  if (stage) filters.stage = stage as PipelineStageId;
  const tag = searchParams.get('tag');
  if (tag) filters.tag = tag;
  return filters;
}

export async function GET(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const q = req.nextUrl.searchParams.get('q') ?? undefined;
  const includeArchived = req.nextUrl.searchParams.get('archived') === '1';
  const compareIds = req.nextUrl.searchParams.get('compare')?.split(',').filter(Boolean);

  if (compareIds && compareIds.length >= 2) {
    const cards = await loadPipelineCompare(session.user.id, compareIds.slice(0, 4));
    return NextResponse.json({ compare: cards });
  }

  const hub = await loadCompanyPipelineHub(session.user.id, {
    query: q,
    filters: parseFilters(req.nextUrl.searchParams),
    includeArchived,
  });
  return NextResponse.json(hub);
}

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as {
    action?: string;
    studentUserId?: string;
    pipelineId?: string;
    stage?: PipelineStageId;
    rating?: number;
    tags?: string[];
    internalNotes?: string;
    isFollowed?: boolean;
    assignedTo?: string;
    reminderAt?: string;
    message?: string;
    note?: string;
    noteId?: string;
    pinned?: boolean;
    interview?: { startAt: string; endAt: string; meetingLink?: string };
    query?: string;
    filters?: PipelineFilters;
    includeArchived?: boolean;
  };

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const authorName = companyUser?.name ?? 'Recruiter';

  if (body.action === 'message' && body.pipelineId && body.message) {
    await sendPipelineMessage(session.user.id, body.pipelineId, body.message);
  } else if (body.action === 'interview' && body.pipelineId && body.interview) {
    await schedulePipelineInterview(session.user.id, body.pipelineId, {
      startAt: new Date(body.interview.startAt),
      endAt: new Date(body.interview.endAt),
      meetingLink: body.interview.meetingLink,
    });
  } else if (body.action === 'add_note' && body.pipelineId && body.note) {
    await addPipelineNote(session.user.id, body.pipelineId, body.note, authorName);
  } else if (body.action === 'update_note' && body.pipelineId && body.noteId) {
    await updatePipelineNote(session.user.id, body.pipelineId, body.noteId, {
      body: body.note,
      pinned: body.pinned,
    });
  } else if (body.action === 'archive' && body.pipelineId) {
    const existing = await prisma.companyPipelineCandidate.findFirst({
      where: { id: body.pipelineId, companyUserId: session.user.id },
    });
    if (existing) {
      await upsertPipelineCandidate(session.user.id, existing.studentUserId, { stage: 'archived' });
    }
  } else if (body.action === 'restore' && body.pipelineId) {
    const existing = await prisma.companyPipelineCandidate.findFirst({
      where: { id: body.pipelineId, companyUserId: session.user.id },
    });
    if (existing) {
      await upsertPipelineCandidate(session.user.id, existing.studentUserId, { stage: 'saved' });
    }
  } else if (body.pipelineId) {
    const existing = await prisma.companyPipelineCandidate.findFirst({
      where: { id: body.pipelineId, companyUserId: session.user.id },
    });
    if (existing) {
      await upsertPipelineCandidate(session.user.id, existing.studentUserId, {
        stage: body.stage,
        rating: body.rating,
        tags: body.tags,
        internalNotes: body.internalNotes,
        isFollowed: body.isFollowed,
        assignedTo: body.assignedTo,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : undefined,
      });
    }
  } else if (body.studentUserId) {
    await upsertPipelineCandidate(session.user.id, body.studentUserId, {
      stage: body.stage ?? 'saved',
      rating: body.rating,
      tags: body.tags,
      internalNotes: body.internalNotes,
      isFollowed: body.isFollowed ?? false,
    });
  }

  const hub = await loadCompanyPipelineHub(session.user.id, {
    query: body.query,
    filters: body.filters,
    includeArchived: body.includeArchived,
  });
  return NextResponse.json(hub);
}
