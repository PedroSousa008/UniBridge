import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  loadTalentDegrees,
  loadTalentEcosystem,
  loadTalentUniversities,
} from '@/lib/company/company-talent-ecosystem-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const sp = req.nextUrl.searchParams;
  const universityId = sp.get('universityId');
  const degree = sp.get('degree');

  if (universityId && degree) {
    const ecosystem = await loadTalentEcosystem(getCompanyWorkspaceUserId(session), universityId, degree, {
      graduation: sp.get('graduation') ?? 'all',
      minCompatibility: sp.get('minCompatibility')
        ? Number(sp.get('minCompatibility'))
        : undefined,
      skill: sp.get('skill') ?? undefined,
      leadership: sp.get('leadership') === '1',
      startup: sp.get('startup') === '1',
      verified: sp.get('verified') === '1',
      openOnly: sp.get('openOnly') === '1',
    });
    if (!ecosystem) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ step: 'ecosystem' as const, ecosystem });
  }

  if (universityId) {
    const data = await loadTalentDegrees(getCompanyWorkspaceUserId(session), universityId);
    if (!data) return NextResponse.json({ error: 'University not found' }, { status: 404 });
    return NextResponse.json({ step: 'degrees' as const, ...data });
  }

  const data = await loadTalentUniversities(getCompanyWorkspaceUserId(session));

  await prisma.analyticsEvent
    .create({
      data: {
        userId: getCompanyWorkspaceUserId(session),
        event: 'recruiter_view',
        metadata: JSON.stringify({ source: 'talent_hub', step: 'universities' }),
      },
    })
    .catch(() => null);

  return NextResponse.json({ step: 'universities' as const, ...data });
}
