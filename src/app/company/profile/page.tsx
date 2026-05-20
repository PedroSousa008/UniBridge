import { requireSession } from '@/lib/session';
import { loadCompanyProfileHub } from '@/lib/company/company-profile-hub';
import { CompanyProfileCommandCenter } from '@/components/company/company-profile-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyProfilePage() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyProfileHub(session.user.id);

  return (
    <div>
      <PageHeader title="Company profile" subtitle="Your identity across partnerships, roles, and student-facing modules." />
      <CompanyProfileCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
