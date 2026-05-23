import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { loadTeacherStudentsHub } from '@/lib/teacher/teacher-students-hub';

export async function GET() {
  const session = await requireSession('TEACHER');
  const hub = await loadTeacherStudentsHub(session.user.id);
  return NextResponse.json(hub);
}
