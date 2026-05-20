import { NextRequest, NextResponse } from 'next/server';
import {
  loadOpportunityDetail,
  patchOpportunityEcosystem,
} from '@/lib/company/company-opportunities-ecosystem-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const detail = await loadOpportunityDetail(session.user.id, id);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = (await req.json()) as {
    opportunityCategory?: string;
    hiringPriority?: string;
    isFutureOpening?: boolean;
    opensAt?: string | null;
    ecosystemJson?: Record<string, unknown>;
  };
  const detail = await patchOpportunityEcosystem(session.user.id, id, body);
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(detail);
}
