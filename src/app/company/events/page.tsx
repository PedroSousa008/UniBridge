import { getCompanyWorkspaceUserId, requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { loadCompanyEventsHub } from '@/lib/company/company-events-hub';
import { CompanyEventsCommandCenter } from '@/components/company/company-events-command-center';

export default async function CompanyEventsPage() {
  const session = await requireSession('COMPANY');
  const [hub, partnerships] = await Promise.all([
    loadCompanyEventsHub(getCompanyWorkspaceUserId(session)),
    prisma.companyPartnership.findMany({
      where: { companyUserId: getCompanyWorkspaceUserId(session), status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true } } },
    }),
  ]);

  const universities = partnerships
    .filter((p) => p.university)
    .map((p) => ({ id: p.university!.id, name: p.university!.name }));

  return (
    <CompanyEventsCommandCenter
      initialHub={JSON.parse(JSON.stringify(hub))}
      universities={universities}
    />
  );
}
