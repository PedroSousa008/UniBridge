import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadCompanyInsightsEcosystemHub } from '@/lib/company/company-insights-ecosystem-hub';
import { CompanyInsightsCommandCenter } from '@/components/company/company-insights-command-center';

async function InsightsContent() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyInsightsEcosystemHub(session.user.id);

  return <CompanyInsightsCommandCenter hub={JSON.parse(JSON.stringify(hub))} />;
}

export default function CompanyInsightsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-8 text-sm text-muted-foreground animate-pulse">
          Loading strategic intelligence…
        </p>
      }
    >
      <InsightsContent />
    </Suspense>
  );
}
