import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { loadTeacherClassStudentsHub } from '@/lib/teacher/teacher-class-students-hub';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const hub = await loadTeacherClassStudentsHub(session.user.id, subjectId);
  return NextResponse.json(hub);
}
