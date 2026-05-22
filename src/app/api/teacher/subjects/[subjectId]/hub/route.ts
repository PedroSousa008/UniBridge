import { NextResponse } from 'next/server';
import { loadTeacherSubjectWorkspace } from '@/lib/teacher/teacher-subject-context';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const ws = await loadTeacherSubjectWorkspace(auth.session.user.id, subjectId);
  return NextResponse.json(ws);
}
