import { requireSession } from '@/lib/session';
import { loadSubjectWorkspace } from '@/lib/student/subject-context';
import { serializeSubjectWorkspace } from '@/lib/student/serialize-workspace';
import { SubjectAnnouncementsPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectAnnouncementsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const ws = serializeSubjectWorkspace(
    await loadSubjectWorkspace(session.user.id, subjectId)
  );
  return <SubjectAnnouncementsPanel ws={ws} />;
}
