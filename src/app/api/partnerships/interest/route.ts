import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { expressPartnershipInterest } from '@/lib/partnerships/partnership-live-hub';

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = (await req.json()) as {
    universityId?: string;
    companyUserId?: string;
  };

  if (session.user.role === 'COMPANY') {
    if (!body.universityId) {
      return NextResponse.json({ error: 'universityId required' }, { status: 400 });
    }
    const result = await expressPartnershipInterest({
      viewer: 'company',
      actorUserId: session.user.id,
      universityId: body.universityId,
      companyUserId: session.user.id,
    });
    return NextResponse.json(result);
  }

  if (session.user.role === 'UNIVERSITY') {
    if (!body.companyUserId) {
      return NextResponse.json({ error: 'companyUserId required' }, { status: 400 });
    }
    const ctx = await getUniversityContext(session.user.id);
    if (!ctx?.university?.id) {
      return NextResponse.json({ error: 'University not configured' }, { status: 400 });
    }
    const result = await expressPartnershipInterest({
      viewer: 'university',
      actorUserId: session.user.id,
      universityId: ctx.university.id,
      companyUserId: body.companyUserId,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
