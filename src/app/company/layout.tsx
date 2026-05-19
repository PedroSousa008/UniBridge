import { requireSession } from '@/lib/session';
import { RoleLayout } from '@/components/layout/role-layout';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('COMPANY');
  return <RoleLayout role="COMPANY">{children}</RoleLayout>;
}
