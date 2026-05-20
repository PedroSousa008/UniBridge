import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentCareerPathsHub, runCareerAdvisor } from '@/lib/student/student-career-paths';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  const hub = await loadStudentCareerPathsHub(session.user.id);
  const reply = runCareerAdvisor(String(prompt), hub);
  return NextResponse.json({ reply, context: hub.advisorContext });
}
