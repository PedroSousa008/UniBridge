import { requireSession } from '@/lib/session';
import { loadStudentSubjectMessages } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectMessagesPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectMessagesPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const initialMessages = serializeJson(
    await loadStudentSubjectMessages(session.user.id, subjectId)
  );
  return (
    <SubjectMessagesPanel
      subjectId={subjectId}
      userId={session.user.id}
      initialMessages={initialMessages}
    />
  );
}
