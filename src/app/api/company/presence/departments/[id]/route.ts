import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCompanyDepartment,
  loadCompanyDepartmentView,
  saveCompanyDepartment,
} from '@/lib/company/company-department-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession('COMPANY');
    const { id } = await params;
    const view = await loadCompanyDepartmentView(getCompanyWorkspaceUserId(session), id);
    if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(view);
  } catch (e) {
    console.error('[departments/[id] GET]', e);
    return NextResponse.json(
      { error: 'Failed to load department' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = await req.json();
  await saveCompanyDepartment(getCompanyWorkspaceUserId(session), id, body);
  const view = await loadCompanyDepartmentView(getCompanyWorkspaceUserId(session), id);
  return NextResponse.json(view);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  await deleteCompanyDepartment(
    getCompanyWorkspaceUserId(session),
    id,
    body.mode ?? 'archive_roles',
    body.targetDepartmentId
  );
  return NextResponse.json({ ok: true });
}
