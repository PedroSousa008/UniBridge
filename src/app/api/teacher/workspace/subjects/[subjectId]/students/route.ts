import { NextResponse } from 'next/server';
import { loadTeacherWorkspaceSubjectStudents } from '@/lib/teacher/teacher-workspace-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const students = await loadTeacherWorkspaceSubjectStudents(subjectId, session.user.id);
  if (!students) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ students });
}
