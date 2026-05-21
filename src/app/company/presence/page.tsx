import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyPresenceHub } from '@/lib/company/company-presence-hub';
import { CompanyPresenceCommandCenter } from '@/components/company/company-presence-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyPresencePage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyPresenceHub(getCompanyWorkspaceUserId(session));

  return (
    <div>
      <PageHeader
        title="Company presence"
        subtitle="Your live identity page for students — culture, roles, compatibility, and ecosystem activity."
      />
      <CompanyPresenceCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
