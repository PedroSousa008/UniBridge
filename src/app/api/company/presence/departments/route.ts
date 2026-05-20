import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import {
  loadCompanyPresenceHub,
  upsertCompanyDepartment,
} from '@/lib/company/company-presence-hub';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  await upsertCompanyDepartment(session.user.id, body);
  const hub = await loadCompanyPresenceHub(session.user.id);
  return NextResponse.json(hub);
}
