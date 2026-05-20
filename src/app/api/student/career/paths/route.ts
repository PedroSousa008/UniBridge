import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadStudentCareerPathsHub(session.user.id);
  return NextResponse.json(JSON.parse(JSON.stringify(hub)));
}
