import { NextRequest, NextResponse } from 'next/server';
import { searchStudentsForOpportunity } from '@/lib/company/company-opportunities-ecosystem-hub';
import { requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const results = await searchStudentsForOpportunity(session.user.id, q);
  return NextResponse.json({ results });
}
