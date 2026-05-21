import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { loadCompanyHomeEcosystemHub } from '@/lib/company/company-home-ecosystem-hub';
import { CompanyHomeEcosystemCommandCenter } from '@/components/company/company-home-ecosystem-command-center';

export default async function CompanyHomePage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyHomeEcosystemHub(getCompanyWorkspaceUserId(session));

  return <CompanyHomeEcosystemCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />;
}
