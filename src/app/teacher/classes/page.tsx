import { requireSession } from '@/lib/session';
import { loadTeacherClassesHub } from '@/lib/teacher/teacher-classes-hub';
import { TeacherClassesEcosystem } from '@/components/teacher/teacher-classes-ecosystem';

export default async function TeacherClassesPage() {
  const session = await requireSession('TEACHER');
  const hub = await loadTeacherClassesHub(session.user.id);
  return <TeacherClassesEcosystem initialHub={hub} />;
}
