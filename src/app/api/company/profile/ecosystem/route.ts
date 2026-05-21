import { NextResponse } from 'next/server';
import { loadCompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import { requireCompanyWorkspace } from '@/lib/session';

export async function GET() {
  const { session } = await requireCompanyWorkspace();
  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  if (!hub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(hub);
}
