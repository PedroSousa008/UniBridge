import { requireSession } from '@/lib/session';
import { loadCompanyStartupsHub } from '@/lib/company/company-startups-hub';
import { CompanyStartupsCommandCenter } from '@/components/company/company-startups-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyStartupHubPage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyStartupsHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Startup Hub"
        subtitle="Discover founders and ventures connected to live student profiles and traction."
      />
      <CompanyStartupsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
