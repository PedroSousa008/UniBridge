import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadCompanyOpportunitiesHub } from '@/lib/company/company-opportunities-hub';
import { CompanyOpportunitiesCommandCenter } from '@/components/company/company-opportunities-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function OpportunitiesContent() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyOpportunitiesHub(session.user.id);

  return (
    <>
      <PageHeader
        title="Hiring pipeline"
        subtitle="Manage applications synced with student Opportunities — same status, both sides."
      />
      <CompanyOpportunitiesCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </>
  );
}

export default function CompanyOpportunitiesPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading pipeline…</p>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
