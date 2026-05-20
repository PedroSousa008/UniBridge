import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { simulationAdvisor } from '@/lib/career/career-simulation-intelligence';
import { loadStudentCareerSimulationHub } from '@/lib/student/student-career-simulation-hub';
import type { SimulationPathType } from '@/lib/career/career-simulation-intelligence';

export async function POST(req: NextRequest) {
  const session = await requireSession('STUDENT');
  const body = (await req.json()) as {
    prompt?: string;
    careerId?: string;
    locationId?: string;
    pathType?: SimulationPathType;
    modifierIds?: string[];
    compareIds?: string[];
  };

  const hub = await loadStudentCareerSimulationHub(session.user.id, {
    careerId: body.careerId,
    locationId: body.locationId,
    pathType: body.pathType,
    modifierIds: body.modifierIds,
    compareIds: body.compareIds,
  });

  const reply = simulationAdvisor(
    body.prompt ?? '',
    hub.activeSimulation,
    hub.compareSimulations
  );

  return NextResponse.json({ reply });
}
