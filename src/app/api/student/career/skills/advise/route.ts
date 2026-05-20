import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadStudentSkillsHub, runSkillsAdvisorFromHub } from '@/lib/student/student-skills-hub';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const hub = await loadStudentSkillsHub(session.user.id);
  const reply = runSkillsAdvisorFromHub(String(body.prompt ?? ''), hub);
  return NextResponse.json({ reply });
}
