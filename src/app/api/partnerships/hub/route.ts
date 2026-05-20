import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import {
  loadPartnershipEcosystemHubForCompany,
  loadPartnershipEcosystemHubForUniversity,
} from '@/lib/partnerships/partnership-live-hub';

export async function GET() {
  const session = await requireSession();

  if (session.user.role === 'COMPANY') {
    const hub = await loadPartnershipEcosystemHubForCompany(session.user.id);
    return NextResponse.json(hub);
  }

  if (session.user.role === 'UNIVERSITY') {
    const ctx = await getUniversityContext(session.user.id);
    if (!ctx?.university?.id) {
      return NextResponse.json({
        viewer: 'university',
        active: [],
        pending: [],
        suggested: [],
        recentActivity: [],
        recommendations: [],
        serverTime: new Date().toISOString(),
      });
    }
    const hub = await loadPartnershipEcosystemHubForUniversity(ctx.university.id);
    return NextResponse.json(hub);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
