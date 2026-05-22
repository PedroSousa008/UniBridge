import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectWorkspace,
  serializeTeacherSubjectWorkspace,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectAttendancePanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectAttendancePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const ws = serializeTeacherSubjectWorkspace(
    await loadTeacherSubjectWorkspace(session.user.id, subjectId)
  );
  return <TeacherSubjectAttendancePanel subjectId={subjectId} ws={ws} />;
}
