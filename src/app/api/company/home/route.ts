import { NextResponse } from 'next/server';
import { loadCompanyHomeHub } from '@/lib/company/company-home-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyHomeHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
