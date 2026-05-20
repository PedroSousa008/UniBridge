import { NextRequest, NextResponse } from 'next/server';
import {
  archiveCompanyRole,
  duplicateCompanyRole,
  loadCompanyRoleIntelligence,
} from '@/lib/company/company-department-hub';
import { upsertCompanyRole } from '@/lib/company/company-presence-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const view = await loadCompanyRoleIntelligence(session.user.id, id);
  if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(view);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = await req.json();
  if (body.action === 'archive') {
    await archiveCompanyRole(session.user.id, id);
  } else if (body.action === 'duplicate') {
    const newId = await duplicateCompanyRole(session.user.id, id);
    if (newId) {
      const view = await loadCompanyRoleIntelligence(session.user.id, newId);
      return NextResponse.json(view ?? { newId });
    }
    return NextResponse.json({ newId });
  } else {
    await upsertCompanyRole(session.user.id, { ...body, id });
  }
  const view = await loadCompanyRoleIntelligence(session.user.id, id);
  return NextResponse.json(view);
}
