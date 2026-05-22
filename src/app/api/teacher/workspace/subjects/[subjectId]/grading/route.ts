import { NextResponse } from 'next/server';
import { loadTeacherWorkspaceGradingHub } from '@/lib/teacher/teacher-workspace-grading-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const hub = await loadTeacherWorkspaceGradingHub(subjectId, session.user.id);
  if (!hub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(hub);
}
