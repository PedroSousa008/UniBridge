import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentCompatibilityHub } from '@/lib/student/student-compatibility-hub';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const selectedId = searchParams.get('selectedId');

  const hub = await loadStudentCompatibilityHub(session.user.id, selectedId);
  return NextResponse.json(JSON.parse(JSON.stringify(hub)));
}
