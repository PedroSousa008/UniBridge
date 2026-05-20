import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { loadStudentCompatibilityHub } from '@/lib/student/student-compatibility-hub';
import { runMentorConversation } from '@/lib/student/student-career-mentor';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  }

  const userId = session.user.id;
  const [profile, pathsHub, compatHub] = await Promise.all([
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    loadStudentCompatibilityHub(userId),
  ]);

  const reply = runMentorConversation(String(prompt), profile, pathsHub, compatHub);
  return NextResponse.json({ reply });
}
