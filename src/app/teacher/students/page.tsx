import { requireSession } from '@/lib/session';
import { loadTeacherStudentsHub } from '@/lib/teacher/teacher-students-hub';
import { TeacherStudentsEcosystem } from '@/components/teacher/teacher-students-ecosystem';

export default async function TeacherStudentsPage() {
  const session = await requireSession('TEACHER');
  const hub = await loadTeacherStudentsHub(session.user.id);
  return <TeacherStudentsEcosystem initialHub={JSON.parse(JSON.stringify(hub))} />;
}
