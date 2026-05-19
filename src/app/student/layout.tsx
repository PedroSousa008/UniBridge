import { requireSession } from '@/lib/session';
import { RoleShell } from '@/components/layout/role-shell';
import { studentNav } from '@/lib/navigation/roles';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('STUDENT');
  return <RoleShell nav={studentNav}>{children}</RoleShell>;
}
