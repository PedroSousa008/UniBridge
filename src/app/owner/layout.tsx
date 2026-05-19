import { requireSession } from '@/lib/session';
import { RoleLayout } from '@/components/layout/role-layout';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('OWNER');
  return <RoleLayout role="OWNER">{children}</RoleLayout>;
}
