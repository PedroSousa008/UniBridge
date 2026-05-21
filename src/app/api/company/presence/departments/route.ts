import { NextRequest, NextResponse } from 'next/server';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import {
  loadCompanyPresenceHub,
  upsertCompanyDepartment,
} from '@/lib/company/company-presence-hub';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  await upsertCompanyDepartment(getCompanyWorkspaceUserId(session), body);
  const hub = await loadCompanyPresenceHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
