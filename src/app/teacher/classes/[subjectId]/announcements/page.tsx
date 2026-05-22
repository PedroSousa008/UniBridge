import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectWorkspace,
  serializeTeacherSubjectWorkspace,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectAnnouncementsPanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectAnnouncementsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const ws = serializeTeacherSubjectWorkspace(
    await loadTeacherSubjectWorkspace(session.user.id, subjectId)
  );
  return <TeacherSubjectAnnouncementsPanel subjectId={subjectId} ws={ws} />;
}
