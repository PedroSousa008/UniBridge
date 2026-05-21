import { NextRequest, NextResponse } from 'next/server';
import {
  archiveCompanyRole,
  duplicateCompanyRole,
  loadCompanyRoleIntelligence,
} from '@/lib/company/company-department-hub';
import { upsertCompanyRole } from '@/lib/company/company-presence-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession('COMPANY');
    const { id } = await params;
    const view = await loadCompanyRoleIntelligence(getCompanyWorkspaceUserId(session), id);
    if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(view);
  } catch (e) {
    console.error('[roles/[id] GET]', e);
    return NextResponse.json({ error: 'Failed to load role' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = await req.json();
  if (body.action === 'archive') {
    await archiveCompanyRole(getCompanyWorkspaceUserId(session), id);
  } else if (body.action === 'duplicate') {
    const newId = await duplicateCompanyRole(getCompanyWorkspaceUserId(session), id);
    if (newId) {
      const view = await loadCompanyRoleIntelligence(getCompanyWorkspaceUserId(session), newId);
      return NextResponse.json(view ?? { newId });
    }
    return NextResponse.json({ newId });
  } else {
    await upsertCompanyRole(getCompanyWorkspaceUserId(session), { ...body, id });
  }
  const view = await loadCompanyRoleIntelligence(getCompanyWorkspaceUserId(session), id);
  return NextResponse.json(view);
}
