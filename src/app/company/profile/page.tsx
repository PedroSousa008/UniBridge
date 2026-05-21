import { requireCompanyWorkspace } from '@/lib/session';
import { loadCompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import { CompanyProfileEcosystemCommandCenter } from '@/components/company/company-profile-ecosystem-command-center';

export default async function CompanyProfilePage() {
  const { session } = await requireCompanyWorkspace();
  const hub = await loadCompanyProfileEcosystemHub(session.user.id);
  if (!hub) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
        Company workspace not found.
      </div>
    );
  }

  return (
    <CompanyProfileEcosystemCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
  );
}
