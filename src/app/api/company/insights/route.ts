import { NextResponse } from 'next/server';
import { loadCompanyInsightsEcosystemHub } from '@/lib/company/company-insights-ecosystem-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyInsightsEcosystemHub(getCompanyWorkspaceUserId(session));
  return NextResponse.json(hub);
}
