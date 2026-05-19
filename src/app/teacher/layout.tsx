import { requireSession } from '@/lib/session';
import { RoleShell } from '@/components/layout/role-shell';
import { teacherNav } from '@/lib/navigation/roles';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('TEACHER');
  return <RoleShell nav={teacherNav}>{children}</RoleShell>;
}
