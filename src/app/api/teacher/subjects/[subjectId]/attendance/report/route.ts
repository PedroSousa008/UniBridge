import { NextResponse } from 'next/server';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';
import { loadSubjectAttendanceReport } from '@/lib/teacher/subject-attendance-report';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const report = await loadSubjectAttendanceReport(subjectId);
  return NextResponse.json(report);
}
