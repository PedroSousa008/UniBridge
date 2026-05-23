import { Suspense } from 'react';
import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyOpportunitiesEcosystemHub } from '@/lib/company/company-opportunities-ecosystem-hub';
import { CompanyOpportunitiesCommandCenter } from '@/components/company/company-opportunities-command-center';

async function OpportunitiesContent() {
  const session = await requireSession('COMPANY');
  try {
    const hub = await loadCompanyOpportunitiesEcosystemHub(
      getCompanyWorkspaceUserId(session)
    );
    return (
      <CompanyOpportunitiesCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    );
  } catch (e) {
    console.error('[company/opportunities]', e);
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="font-medium text-destructive">Could not load Opportunities</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The database may still be updating. Refresh the page in a few seconds, or open Presence
          and save a role again.
        </p>
      </div>
    );
  }
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
