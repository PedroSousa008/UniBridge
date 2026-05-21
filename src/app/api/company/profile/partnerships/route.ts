import { NextRequest, NextResponse } from 'next/server';
import { loadCompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import {
  expressPartnershipInterest,
  withdrawPartnershipConnection,
} from '@/lib/partnerships/partnership-live-hub';
import { canCompany } from '@/lib/company/company-permissions';
import { requireCompanyWorkspace } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { session, workspace } = await requireCompanyWorkspace();

  if (!canCompany(workspace.permission, 'manage_partnerships')) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
  }

  const body = (await req.json()) as {
    action?: 'accept' | 'reject' | 'cancel' | 'archive' | 'interest';
    universityId?: string;
    connectionId?: string;
  };

  if (!body.universityId) {
    return NextResponse.json({ error: 'universityId required' }, { status: 400 });
  }

  const ownerId = workspace.workspaceOwnerId;

  if (body.action === 'accept' || body.action === 'interest') {
    await expressPartnershipInterest({
      viewer: 'company',
      actorUserId: session.user.id,
      universityId: body.universityId,
      companyUserId: ownerId,
    });
  } else if (body.action === 'reject' || body.action === 'cancel') {
    await withdrawPartnershipConnection({
      viewer: 'company',
      actorUserId: session.user.id,
      universityId: body.universityId,
      companyUserId: ownerId,
      archive: false,
    });
  } else if (body.action === 'archive') {
    await withdrawPartnershipConnection({
      viewer: 'company',
      actorUserId: session.user.id,
      universityId: body.universityId,
      companyUserId: ownerId,
      archive: true,
    });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}
