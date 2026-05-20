import { NextRequest, NextResponse } from 'next/server';
import { loadCompanyTeamMemberProfile } from '@/lib/company/company-presence-people';
import { loadCompanyPresenceHub, upsertCompanyTeamMember } from '@/lib/company/company-presence-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession('COMPANY');
    const { id } = await params;
    const profile = await loadCompanyTeamMemberProfile(session.user.id, id);
    if (!profile) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    console.error('[team/[id] GET]', e);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('COMPANY');
  const { id } = await params;
  const body = await req.json();
  await upsertCompanyTeamMember(session.user.id, { ...body, id });
  const profile = await loadCompanyTeamMemberProfile(session.user.id, id);
  if (!profile) return NextResponse.json({ error: 'Person not found' }, { status: 404 });
  return NextResponse.json(profile);
}
