import { NextRequest, NextResponse } from 'next/server';
import {
  computeRoleCompatibilityPreview,
  parseStructuredRequirements,
} from '@/lib/company/company-role-requirements';
import { requireSession } from '@/lib/session';

/** Full ecosystem compatibility scan (deferred after fast role load). */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession('COMPANY');
    const body = await req.json().catch(() => ({}));
    const requirements = parseStructuredRequirements(body.requirements ?? []);
    const preview = await computeRoleCompatibilityPreview(
      session.user.id,
      requirements,
      body.visibilitySettings,
      undefined,
      { full: true }
    );
    return NextResponse.json({ preview });
  } catch (e) {
    console.error('[roles/[id]/compatibility-preview POST]', e);
    return NextResponse.json({ error: 'Failed to compute preview' }, { status: 500 });
  }
}
