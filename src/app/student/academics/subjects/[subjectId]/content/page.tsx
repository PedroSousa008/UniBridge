import { requireSession } from '@/lib/session';
import { loadStudentSubjectContent } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectContentPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectContentPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const { contentWeeks, contentNotes } = serializeJson(
    await loadStudentSubjectContent(session.user.id, subjectId)
  );
  return (
    <SubjectContentPanel
      subjectId={subjectId}
      contentWeeks={contentWeeks}
      contentNotes={contentNotes}
    />
  );
}
