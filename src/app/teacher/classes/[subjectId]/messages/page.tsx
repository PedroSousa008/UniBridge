import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectMessages,
  serializeJson,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectMessagesPanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectMessagesPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const messages = serializeJson(
    await loadTeacherSubjectMessages(session.user.id, subjectId)
  );
  return (
    <TeacherSubjectMessagesPanel subjectId={subjectId} initialMessages={messages} />
  );
}
