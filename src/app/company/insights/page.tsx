import { requireSession } from '@/lib/session';
import { loadCompanyHomeHub } from '@/lib/company/company-home-hub';
import { loadCompanyOpportunitiesHub } from '@/lib/company/company-opportunities-hub';
import { PageHeader } from '@/components/layout/page-header';
import { CompanyInsightsClient } from './insights-client';

export default async function CompanyInsightsPage() {
  const session = await requireSession('COMPANY');
  const [home, opportunities] = await Promise.all([
    loadCompanyHomeHub(session.user.id),
    loadCompanyOpportunitiesHub(session.user.id),
  ]);

  return (
    <div>
      <PageHeader title="Recruitment insights" subtitle="Funnel and ecosystem performance at a glance." />
      <CompanyInsightsClient
        stats={home.stats}
        byStage={opportunities.byStage}
        pipelineCount={opportunities.pipeline.length}
      />
    </div>
  );
}
