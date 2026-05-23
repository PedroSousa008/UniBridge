import { requireSession } from '@/lib/session';
import { loadStudentSubjectGradebookData } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import type { SubjectWorkspace } from '@/lib/student/subject-context';
import { SubjectGradebookPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectGradebookPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const ws = serializeJson(
    await loadStudentSubjectGradebookData(session.user.id, subjectId)
  ) as SubjectWorkspace;
  return <SubjectGradebookPanel ws={ws} />;
}
