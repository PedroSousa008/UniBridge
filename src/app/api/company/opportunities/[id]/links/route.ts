import { NextRequest, NextResponse } from 'next/server';
import {
  linkStudentToOpportunity,
  updateOpportunityLink,
  moveLinkedStudentToPipeline,
} from '@/lib/company/company-opportunities-ecosystem-hub';
import { requireSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = (await req.json()) as {
    studentUserId?: string;
    linkType?: 'preview' | 'official';
    notes?: string;
    action?: 'pipeline';
    linkId?: string;
    archive?: boolean;
  };

  if (body.action === 'pipeline' && body.studentUserId) {
    await moveLinkedStudentToPipeline(session.user.id, body.studentUserId);
    const { loadOpportunityDetail } = await import(
      '@/lib/company/company-opportunities-ecosystem-hub'
    );
    const detail = await loadOpportunityDetail(session.user.id, id);
    return NextResponse.json(detail);
  }

  if (body.linkId) {
    const detail = await updateOpportunityLink(session.user.id, body.linkId, {
      linkType: body.linkType,
      notes: body.notes,
      archive: body.archive,
    });
    if (!detail) return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    return NextResponse.json(detail);
  }

  if (!body.studentUserId) {
    return NextResponse.json({ error: 'studentUserId required' }, { status: 400 });
  }

  const detail = await linkStudentToOpportunity(
    session.user.id,
    id,
    body.studentUserId,
    body.linkType ?? 'preview',
    body.notes
  );
  if (!detail) return NextResponse.json({ error: 'Unable to link' }, { status: 400 });
  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  await params;
  const body = (await req.json()) as {
    linkId?: string;
    linkType?: 'preview' | 'official';
    notes?: string;
    archive?: boolean;
  };
  if (!body.linkId) {
    return NextResponse.json({ error: 'linkId required' }, { status: 400 });
  }
  const detail = await updateOpportunityLink(session.user.id, body.linkId, body);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
