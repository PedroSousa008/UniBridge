import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import {
  deleteCompanyTeamMember,
  loadCompanyPresenceHub,
  upsertCompanyTeamMember,
} from '@/lib/company/company-presence-hub';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  await upsertCompanyTeamMember(session.user.id, body);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteCompanyTeamMember(session.user.id, id);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}
