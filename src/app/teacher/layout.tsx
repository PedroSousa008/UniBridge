import { requireSession } from '@/lib/session';
import { RoleLayout } from '@/components/layout/role-layout';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('TEACHER');
  return <RoleLayout role="TEACHER">{children}</RoleLayout>;
}
