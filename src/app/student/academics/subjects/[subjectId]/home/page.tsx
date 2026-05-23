import { requireSession } from '@/lib/session';
import { loadStudentSubjectHomeData } from '@/lib/student/subject-context';
import { serializeJson } from '@/lib/student/serialize-workspace';
import { SubjectHomePanel } from '@/components/student/subject/subject-panels';

export default async function SubjectHomePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { subjectId } = await params;
  const data = serializeJson(await loadStudentSubjectHomeData(session.user.id, subjectId));
  return <SubjectHomePanel ws={data} />;
}
