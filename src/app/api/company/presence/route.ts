import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import {
  loadCompanyPresenceHub,
  saveCompanyPresenceProfile,
} from '@/lib/company/company-presence-hub';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  await saveCompanyPresenceProfile(session.user.id, body);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}
