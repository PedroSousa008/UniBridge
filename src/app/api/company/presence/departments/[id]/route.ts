import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCompanyDepartment,
  loadCompanyDepartmentView,
  saveCompanyDepartment,
} from '@/lib/company/company-department-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const view = await loadCompanyDepartmentView(session.user.id, id);
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
  await saveCompanyDepartment(session.user.id, id, body);
  const view = await loadCompanyDepartmentView(session.user.id, id);
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
    session.user.id,
    id,
    body.mode ?? 'archive_roles',
    body.targetDepartmentId
  );
  return NextResponse.json({ ok: true });
}
