import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadCompanyTalentHub } from '@/lib/company/company-talent-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyTalentHub(session.user.id);

  await prisma.analyticsEvent.create({
    data: { userId: session.user.id, event: 'recruiter_view', metadata: JSON.stringify({ source: 'talent_hub' }) },
  }).catch(() => null);

  return NextResponse.json(hub);
}
