import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyHomeHub } from '@/lib/company/company-home-hub';
import { CompanyHomeCommandCenter } from '@/components/company/company-home-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyHomePage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyHomeHub(getCompanyWorkspaceUserId(session));

  return (
    <div>
      <PageHeader title="Recruitment intelligence" subtitle="Discover and develop top talent across your ecosystem." />
      <CompanyHomeCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
