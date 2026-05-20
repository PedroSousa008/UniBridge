import { NextRequest, NextResponse } from 'next/server';
import { estimateRoleCompatibility } from '@/lib/company/company-department-hub';
import { requireSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();
  const result = await estimateRoleCompatibility(session.user.id, {
    nonNegotiables: Array.isArray(body.nonNegotiables) ? body.nonNegotiables : [],
    preferredQualities: Array.isArray(body.preferredQualities) ? body.preferredQualities : [],
    requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : [],
    visibilitySettings: body.visibilitySettings,
  });
  return NextResponse.json(result);
}
