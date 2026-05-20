import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentCompatibilityHub, saveWorkStyleQuiz } from '@/lib/student/student-compatibility-hub';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { answers } = await request.json();
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'answers required' }, { status: 400 });
  }

  await saveWorkStyleQuiz(session.user.id, answers as Record<string, string>);
  const hub = await loadStudentCompatibilityHub(session.user.id);
  return NextResponse.json(hub);
}
