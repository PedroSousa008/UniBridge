import { NextRequest, NextResponse } from 'next/server';
import { estimateRoleCompatibility } from '@/lib/company/company-department-hub';
import {
  computeRoleCompatibilityPreview,
  parseStructuredRequirements,
} from '@/lib/company/company-role-requirements';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = await req.json();

  if (Array.isArray(body.requirements)) {
    const requirements = parseStructuredRequirements(body.requirements);
    const preview = await computeRoleCompatibilityPreview(
      getCompanyWorkspaceUserId(session),
      requirements,
      body.visibilitySettings
    );
    return NextResponse.json(preview);
  }

  const result = await estimateRoleCompatibility(getCompanyWorkspaceUserId(session), {
    nonNegotiables: Array.isArray(body.nonNegotiables) ? body.nonNegotiables : [],
    preferredQualities: Array.isArray(body.preferredQualities) ? body.preferredQualities : [],
    requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : [],
    visibilitySettings: body.visibilitySettings,
  });
  return NextResponse.json({
    strongMatches: result.strongMatches,
    potentialMatches: result.potentialMatches,
    highLeadershipMatches: 0,
    startupAlignedMatches: 0,
    missingOneRequirement: 0,
    simulations: [],
  });
}
