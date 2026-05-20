import { NextRequest, NextResponse } from 'next/server';
import { searchStudentsForEventInvite } from '@/lib/company/company-events-hub';
import { requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const universityId = req.nextUrl.searchParams.get('universityId');
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!universityId) {
    return NextResponse.json({ error: 'universityId required' }, { status: 400 });
  }
  const results = await searchStudentsForEventInvite(session.user.id, universityId, q);
  return NextResponse.json({ results });
}
