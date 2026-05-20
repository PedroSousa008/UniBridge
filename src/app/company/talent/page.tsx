import { requireSession } from '@/lib/session';
import { CompanyTalentCommandCenter } from '@/components/company/company-talent-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyTalentPage() {
  await requireSession('COMPANY');

  return (
    <div>
      <PageHeader
        title="Talent discovery"
        subtitle="Select a partner university, explore a degree ecosystem, and discover future talent — not spreadsheets."
      />
      <CompanyTalentCommandCenter />
    </div>
  );
}
