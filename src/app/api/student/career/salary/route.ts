import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentSalaryHub } from '@/lib/student/student-salary-hub';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const careerId = searchParams.get('careerId') ?? undefined;
  const locationId = searchParams.get('locationId') ?? undefined;
  const modifierIds = searchParams.get('modifiers')?.split(',').filter(Boolean);
  const compareCareerIds = searchParams.get('compare')?.split(',').filter(Boolean);
  const successProfileId = searchParams.get('successId') ?? undefined;

  const hub = await loadStudentSalaryHub(session.user.id, {
    careerId,
    locationId,
    modifierIds,
    compareCareerIds,
    successProfileId,
  });

  return NextResponse.json(hub);
}
