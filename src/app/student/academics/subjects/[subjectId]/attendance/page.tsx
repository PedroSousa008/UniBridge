import { requireSession } from '@/lib/session';
import { loadStudentSubjectAttendanceData } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectAttendancePanel } from '@/components/student/subject/subject-panels';

export default async function SubjectAttendancePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const { enrollment, attendanceSessions } = serializeJson(
    await loadStudentSubjectAttendanceData(session.user.id, subjectId)
  );
  return (
    <SubjectAttendancePanel enrollment={enrollment} attendanceSessions={attendanceSessions} />
  );
}
