import { requireCompanyWorkspace } from '@/lib/session';
import { CompanyShell } from '@/components/company/company-shell';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireCompanyWorkspace();

  return (
    <CompanyShell companyName={workspace.companyName}>{children}</CompanyShell>
  );
}
