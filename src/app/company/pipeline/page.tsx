import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyPipelineHub } from '@/lib/company/company-pipeline-hub';
import { CompanyPipelineCommandCenter } from '@/components/company/company-pipeline-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyPipelinePage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyPipelineHub(getCompanyWorkspaceUserId(session));

  return (
    <div>
      <PageHeader
        title="Pipeline"
        subtitle="Your intelligent talent operating space — curate, watch, and grow relationships with future leaders."
      />
      <CompanyPipelineCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
