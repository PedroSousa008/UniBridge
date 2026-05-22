import { requireSession } from '@/lib/session';
import { TeacherSubjectGradebookPanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectGradebookPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  await requireSession('TEACHER');
  const { subjectId } = await params;
  return <TeacherSubjectGradebookPanel subjectId={subjectId} />;
}
