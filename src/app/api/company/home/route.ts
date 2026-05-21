import { NextResponse } from 'next/server';
import { loadCompanyHomeEcosystemHub } from '@/lib/company/company-home-ecosystem-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyHomeEcosystemHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
