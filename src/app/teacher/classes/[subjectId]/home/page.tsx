import { requireSession } from '@/lib/session';
import {
  loadTeacherSubjectHomeData,
  serializeTeacherSubjectHomeData,
} from '@/lib/teacher/teacher-subject-context';
import { TeacherSubjectHomePanel } from '@/components/teacher/teacher-subject-panels';

export default async function TeacherSubjectHomePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const data = serializeTeacherSubjectHomeData(
    await loadTeacherSubjectHomeData(session.user.id, subjectId)
  );
  return <TeacherSubjectHomePanel ws={data} />;
}
