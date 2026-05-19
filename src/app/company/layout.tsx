import { requireSession } from '@/lib/session';
import { RoleShell } from '@/components/layout/role-shell';
import { companyNav } from '@/lib/navigation/roles';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('COMPANY');
  return <RoleShell nav={companyNav}>{children}</RoleShell>;
}
