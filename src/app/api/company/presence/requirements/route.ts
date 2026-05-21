import { NextResponse } from 'next/server';
import { loadRoleRequirementsHub } from '@/lib/company/company-role-requirements';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession('COMPANY');
    const hub = await loadRoleRequirementsHub(getCompanyWorkspaceUserId(session));
    return NextResponse.json(hub);
  } catch (e) {
    console.error('[presence/requirements GET]', e);
    return NextResponse.json({ error: 'Failed to load requirements hub' }, { status: 500 });
  }
}
