import { NextResponse } from 'next/server';
import { loadCompanyInsightsEcosystemHub } from '@/lib/company/company-insights-ecosystem-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyInsightsEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}
