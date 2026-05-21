import { NextRequest, NextResponse } from 'next/server';
import { searchStudentsForOpportunity } from '@/lib/company/company-opportunities-ecosystem-hub';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const results = await searchStudentsForOpportunity(getCompanyWorkspaceUserId(session), q);
  return NextResponse.json({ results });
}
