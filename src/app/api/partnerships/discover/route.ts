import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import {
  discoverCompaniesForUniversity,
  discoverUniversitiesForCompany,
} from '@/lib/partnerships/partnership-live-hub';

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const q = req.nextUrl.searchParams.get('q') ?? undefined;

  if (session.user.role === 'COMPANY') {
    const results = await discoverUniversitiesForCompany(session.user.id, q);
    return NextResponse.json({ results, viewer: 'company' });
  }

  if (session.user.role === 'UNIVERSITY') {
    const ctx = await getUniversityContext(session.user.id);
    if (!ctx?.university?.id) {
      return NextResponse.json({ results: [], viewer: 'university' });
    }
    const results = await discoverCompaniesForUniversity(ctx.university.id, q);
    return NextResponse.json({ results, viewer: 'university' });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
