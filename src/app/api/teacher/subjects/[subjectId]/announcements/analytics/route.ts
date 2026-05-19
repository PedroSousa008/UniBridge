import { NextResponse } from 'next/server';
import { getTeacherAnnouncementAnalytics } from '@/lib/student/student-announcements';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const analytics = await getTeacherAnnouncementAnalytics(subjectId);
  return NextResponse.json({ analytics });
}
