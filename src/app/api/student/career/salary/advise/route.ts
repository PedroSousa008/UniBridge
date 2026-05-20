import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentSalaryHub, runSalaryAdvisor } from '@/lib/student/student-salary-hub';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const hub = await loadStudentSalaryHub(session.user.id, {
    careerId: body.careerId,
    locationId: body.locationId,
    modifierIds: body.modifierIds,
  });
  const reply = runSalaryAdvisor(String(body.prompt ?? ''), hub);
  return NextResponse.json({ reply });
}
