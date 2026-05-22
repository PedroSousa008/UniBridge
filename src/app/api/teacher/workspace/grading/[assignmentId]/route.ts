import { NextResponse } from 'next/server';
import { loadTeacherWorkspaceAssignmentSubmissions } from '@/lib/teacher/teacher-workspace-hub';
import { requireSession } from '@/lib/session';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await requireSession('TEACHER');
  const { assignmentId } = await params;
  const data = await loadTeacherWorkspaceAssignmentSubmissions(assignmentId, session.user.id);
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
