import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentHomeHub } from '@/lib/student/student-home-hub';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadStudentHomeHub(session.user.id, session.user.name ?? null);
  return NextResponse.json(JSON.parse(JSON.stringify(hub)));
}
