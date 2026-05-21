import { NextRequest, NextResponse } from 'next/server';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import {
  deleteCompanyTeamMember,
  loadCompanyPresenceHub,
  upsertCompanyTeamMember,
} from '@/lib/company/company-presence-hub';
import { isRealPersonName, loadCompanyTeamMemberProfile } from '@/lib/company/company-presence-people';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!isRealPersonName(name)) {
    return NextResponse.json(
      { error: 'Enter a real person name (not a job title or placeholder).' },
      { status: 400 }
    );
  }
  if (body.memberType === 'position_holder') {
    return NextResponse.json(
      { error: 'Position holders are added from a filled role, not People.' },
      { status: 400 }
    );
  }
  const memberId = await upsertCompanyTeamMember(getCompanyWorkspaceUserId(session), { ...body, name });
  const [hub, profile] = await Promise.all([
    loadCompanyPresenceHub(getCompanyWorkspaceUserId(session)),
    loadCompanyTeamMemberProfile(getCompanyWorkspaceUserId(session), memberId),
  ]);
  return NextResponse.json({ ...hub, createdMemberId: memberId, createdProfile: profile });
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteCompanyTeamMember(getCompanyWorkspaceUserId(session), id);
  const hub = await loadCompanyPresenceHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
