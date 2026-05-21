import { NextRequest, NextResponse } from 'next/server';
import { loadCompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import {
  deactivateWorkspaceMember,
  updateWorkspaceMemberPermission,
} from '@/lib/company/company-workspace';
import { normalizePermission } from '@/lib/company/company-permissions';
import { requireCompanyWorkspace } from '@/lib/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { workspaceMemberId: string } }
) {
  const { session, workspace } = await requireCompanyWorkspace();
  const body = (await req.json()) as { permission?: string };
  const permission = normalizePermission(body.permission);

  const result = await updateWorkspaceMemberPermission(
    workspace,
    params.workspaceMemberId,
    permission
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { workspaceMemberId: string } }
) {
  const { session, workspace } = await requireCompanyWorkspace();

  const result = await deactivateWorkspaceMember(workspace, params.workspaceMemberId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}
