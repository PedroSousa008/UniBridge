import { requireSession } from '@/lib/session';
import { loadStudentSubjectAnnouncements } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectAnnouncementsPanel } from '@/components/student/subject/subject-panels';

export default async function SubjectAnnouncementsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const announcements = serializeJson(
    await loadStudentSubjectAnnouncements(session.user.id, subjectId)
  );
  return <SubjectAnnouncementsPanel announcements={announcements} />;
}
