import { NextResponse } from 'next/server';
import { loadRoleRequirementsHub } from '@/lib/company/company-role-requirements';
import { requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession('COMPANY');
    const hub = await loadRoleRequirementsHub(session.user.id);
    return NextResponse.json(hub);
  } catch (e) {
    console.error('[presence/requirements GET]', e);
    return NextResponse.json({ error: 'Failed to load requirements hub' }, { status: 500 });
  }
}
