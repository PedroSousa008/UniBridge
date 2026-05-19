import { requireSession } from '@/lib/session';
import { RoleShell } from '@/components/layout/role-shell';
import { ownerNav } from '@/lib/navigation/roles';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('OWNER');
  return <RoleShell nav={ownerNav}>{children}</RoleShell>;
}
