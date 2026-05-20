import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import {
  deleteCompanyRole,
  loadCompanyPresenceHub,
  upsertCompanyRole,
} from '@/lib/company/company-presence-hub';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  await upsertCompanyRole(session.user.id, body);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteCompanyRole(session.user.id, id);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}
