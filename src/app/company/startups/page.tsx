import { Suspense } from 'react';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyStartupsEcosystemHub } from '@/lib/company/company-startups-ecosystem-hub';
import { CompanyStartupsCommandCenter } from '@/components/company/company-startups-command-center';

async function StartupsContent() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyStartupsEcosystemHub(getCompanyWorkspaceUserId(session));

  return (
    <CompanyStartupsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
  );
}

export default function CompanyStartupHubPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-muted-foreground animate-pulse">
          Loading startup ecosystem…
        </p>
      }
    >
      <StartupsContent />
    </Suspense>
  );
}
