import { requireSession } from '@/lib/session';
import { resolveCompanyWorkspace } from '@/lib/company/company-workspace';
import { CompanyShell } from '@/components/company/company-shell';

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession('COMPANY');
  const workspace = await resolveCompanyWorkspace(session.user.id);

  return (
    <CompanyShell companyName={workspace?.companyName ?? 'Your company'}>
      {children}
    </CompanyShell>
  );
}
