import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadStudentAssignmentsHub(session.user.id);
  if (!hub.dbReady) {
    return NextResponse.json(
      { error: 'Assignments storage not ready', code: 'ASSIGNMENTS_DB_NOT_READY' },
      { status: 503 }
    );
  }

  return NextResponse.json(hub);
}
