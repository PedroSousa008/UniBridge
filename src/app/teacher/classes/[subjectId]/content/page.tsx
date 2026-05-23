import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectContentWeeks,
  serializeJson,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectContentPanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectContentPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const weeks = serializeJson(
    await loadTeacherSubjectContentWeeks(session.user.id, subjectId)
  );
  return <TeacherSubjectContentPanel subjectId={subjectId} initialWeeks={weeks} />;
}
