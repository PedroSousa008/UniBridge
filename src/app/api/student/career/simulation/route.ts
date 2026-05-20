import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { loadStudentCareerSimulationHub } from '@/lib/student/student-career-simulation-hub';
import type { SimulationPathType } from '@/lib/career/career-simulation-intelligence';

export async function GET(req: NextRequest) {
  const session = await requireSession('STUDENT');
  const sp = req.nextUrl.searchParams;
  const modifierIds = sp.get('modifiers')?.split(',').filter(Boolean);
  const compareIds = sp.get('compare')?.split(',').filter(Boolean);

  const hub = await loadStudentCareerSimulationHub(session.user.id, {
    careerId: sp.get('careerId') ?? undefined,
    locationId: sp.get('locationId') ?? undefined,
    pathType: (sp.get('pathType') as SimulationPathType) ?? undefined,
    modifierIds,
    compareIds,
    presetId: sp.get('preset') ?? undefined,
  });

  return NextResponse.json(hub);
}
