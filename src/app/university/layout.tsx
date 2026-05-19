import { requireSession } from '@/lib/session';
import { RoleLayout } from '@/components/layout/role-layout';

export default async function UniversityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('UNIVERSITY');
  return <RoleLayout role="UNIVERSITY">{children}</RoleLayout>;
}
