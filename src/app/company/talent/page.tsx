import { requireSession } from '@/lib/session';
import { loadCompanyTalentHub } from '@/lib/company/company-talent-hub';
import { CompanyTalentCommandCenter } from '@/components/company/company-talent-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyTalentPage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyTalentHub(session.user.id);

  return (
    <div>
      <PageHeader title="Talent discovery" subtitle="Verified students visible to companies — filtered by profile privacy and Open To status." />
      <CompanyTalentCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
