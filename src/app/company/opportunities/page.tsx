import { Suspense } from 'react';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyOpportunitiesEcosystemHub } from '@/lib/company/company-opportunities-ecosystem-hub';
import { CompanyOpportunitiesCommandCenter } from '@/components/company/company-opportunities-command-center';

async function OpportunitiesContent() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyOpportunitiesEcosystemHub(getCompanyWorkspaceUserId(session));

  return (
    <CompanyOpportunitiesCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
  );
}

export default function CompanyOpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-muted-foreground animate-pulse">
          Loading your opportunity ecosystem…
        </p>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}
