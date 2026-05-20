import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentEmployabilityHub } from '@/lib/student/student-employability-hub';
import type { EmployabilityRange } from '@/lib/career/employability-intelligence';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get('range') as EmployabilityRange) ?? '1y';

  const hub = await loadStudentEmployabilityHub(session.user.id, range);
  return NextResponse.json(hub);
}
