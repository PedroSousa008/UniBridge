import { NextResponse } from 'next/server';
import { loadTeacherWorkspaceHub } from '@/lib/teacher/teacher-workspace-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('TEACHER');
  const hub = await loadTeacherWorkspaceHub(session.user.id);
  return NextResponse.json(hub);
}
