import { requireSession } from '@/lib/session';
import { RoleShell } from '@/components/layout/role-shell';
import { universityNav } from '@/lib/navigation/roles';

export default async function UniversityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('UNIVERSITY');
  return <RoleShell nav={universityNav}>{children}</RoleShell>;
}
