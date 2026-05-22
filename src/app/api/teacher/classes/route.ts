import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadTeacherClassesHub } from '@/lib/teacher/teacher-classes-hub';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadTeacherClassesHub(session.user.id);
  return NextResponse.json(hub);
}
