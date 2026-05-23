import { requireSession } from '@/lib/session';
import { loadTeacherClassStudentsHub } from '@/lib/teacher/teacher-class-students-hub';
import { TeacherClassStudentsEcosystem } from '@/components/teacher/teacher-class-students-ecosystem';

export default async function TeacherClassStudentsPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await requireSession('TEACHER');
  const { subjectId } = await params;
  const hub = await loadTeacherClassStudentsHub(session.user.id, subjectId);
  return <TeacherClassStudentsEcosystem initialHub={JSON.parse(JSON.stringify(hub))} />;
}
