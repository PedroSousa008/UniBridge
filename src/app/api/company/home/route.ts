import { NextResponse } from 'next/server';
import { loadCompanyHomeHub } from '@/lib/company/company-home-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyHomeHub(session.user.id);
  return NextResponse.json(hub);
}
