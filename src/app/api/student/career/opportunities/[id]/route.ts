import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  loadOpportunityWorkspace,
  loadStudentOpportunitiesHub,
  updateOpportunity,
} from '@/lib/student/student-opportunities-hub';
import type { OpportunityStage } from '@/lib/career/opportunities-intelligence';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const workspace = await loadOpportunityWorkspace(session.user.id, id);
  if (!workspace) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(workspace);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  await updateOpportunity(session.user.id, id, {
    stage: body.stage as OpportunityStage | undefined,
    priority: body.priority,
    notes: body.notes,
    nextAction: body.nextAction,
    interviewRounds: body.interviewRounds,
    interaction: body.interaction,
  });

  const hub = await loadStudentOpportunitiesHub(session.user.id);
  const workspace = await loadOpportunityWorkspace(session.user.id, id);
  return NextResponse.json({ hub, workspace });
}
