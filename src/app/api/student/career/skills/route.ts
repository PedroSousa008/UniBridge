import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addSelfReportedSkill, loadStudentSkillsHub } from '@/lib/student/student-skills-hub';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hub = await loadStudentSkillsHub(session.user.id);
  return NextResponse.json(hub);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  if (body.action === 'self_report') {
    await addSelfReportedSkill(
      session.user.id,
      String(body.skillId ?? ''),
      Number(body.claimedLevel ?? 50),
      body.note
    );
  }

  const hub = await loadStudentSkillsHub(session.user.id);
  return NextResponse.json(hub);
}
