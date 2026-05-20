import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  loadCompanyPipelineHub,
  sendPipelineMessage,
  schedulePipelineInterview,
  upsertPipelineCandidate,
} from '@/lib/company/company-pipeline-hub';
import type { PipelineStageId } from '@/lib/company/company-pipeline-intelligence';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyPipelineHub(session.user.id);
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
    assignedTo?: string;
    reminderAt?: string;
    message?: string;
    interview?: { startAt: string; endAt: string; meetingLink?: string };
  };

  if (body.action === 'message' && body.pipelineId && body.message) {
    await sendPipelineMessage(session.user.id, body.pipelineId, body.message);
  } else if (body.action === 'interview' && body.pipelineId && body.interview) {
    await schedulePipelineInterview(session.user.id, body.pipelineId, {
      startAt: new Date(body.interview.startAt),
      endAt: new Date(body.interview.endAt),
      meetingLink: body.interview.meetingLink,
    });
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
    });
  }

  const hub = await loadCompanyPipelineHub(session.user.id);
  return NextResponse.json(hub);
}
