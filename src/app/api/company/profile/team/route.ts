import { NextRequest, NextResponse } from 'next/server';
import { loadCompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import { createTeamMemberAccount } from '@/lib/company/company-workspace';
import { normalizePermission } from '@/lib/company/company-permissions';
import { requireCompanyWorkspace } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { session, workspace } = await requireCompanyWorkspace();
  const body = (await req.json()) as {
    teamMemberId?: string;
    email?: string;
    password?: string;
    permission?: string;
  };

  if (!body.teamMemberId || !body.email || !body.password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const result = await createTeamMemberAccount({
    workspace,
    teamMemberId: body.teamMemberId,
    email: body.email,
    password: body.password,
    permission: normalizePermission(body.permission),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}
