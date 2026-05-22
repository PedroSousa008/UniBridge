import { requireSession } from '@/lib/session';
import { requireTeacherSubjectAccess } from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectAttendancePanel } from '@/components/teacher/teacher-subject-attendance-panel';
import { loadSubjectAttendanceReport } from '@/lib/teacher/subject-attendance-report';

export default async function TeacherSubjectAttendancePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  await requireTeacherSubjectAccess(session.user.id, subjectId);
  const report = await loadSubjectAttendanceReport(subjectId);

  return (
    <TeacherSubjectAttendancePanel
      subjectId={subjectId}
      initialReport={JSON.parse(JSON.stringify(report))}
    />
  );
}
