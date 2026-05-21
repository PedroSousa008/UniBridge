import { NextRequest, NextResponse } from 'next/server';
import {
  computeRoleCompatibilityPreview,
  loadRoleFitIntelligence,
  parseStructuredRequirements,
  saveRoleStructuredRequirements,
  type StructuredRequirement,
} from '@/lib/company/company-role-requirements';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession('COMPANY');
    const { id } = await params;
    const view = await loadRoleFitIntelligence(getCompanyWorkspaceUserId(session), id);
    if (!view) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(view);
  } catch (e) {
    console.error('[roles/[id]/requirements GET]', e);
    return NextResponse.json({ error: 'Failed to load role fit intelligence' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession('COMPANY');
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'preview' && Array.isArray(body.requirements)) {
      const requirements = parseStructuredRequirements(body.requirements);
      const preview = await computeRoleCompatibilityPreview(
        getCompanyWorkspaceUserId(session),
        requirements,
        body.visibilitySettings
      );
      return NextResponse.json({ preview });
    }

    if (!Array.isArray(body.requirements)) {
      return NextResponse.json({ error: 'requirements array required' }, { status: 400 });
    }

    const requirements = parseStructuredRequirements(body.requirements) as StructuredRequirement[];
    await saveRoleStructuredRequirements(getCompanyWorkspaceUserId(session), id, requirements);
    const view = await loadRoleFitIntelligence(getCompanyWorkspaceUserId(session), id);
    return NextResponse.json(view);
  } catch (e) {
    console.error('[roles/[id]/requirements PATCH]', e);
    return NextResponse.json({ error: 'Failed to save requirements' }, { status: 500 });
  }
}
