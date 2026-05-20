import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { loadCompanyEventsHub } from '@/lib/company/company-events-hub';
import { CompanyEventsCommandCenter } from '@/components/company/company-events-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function CompanyEventsPage() {
  const session = await requireSession('COMPANY');
  const [hub, partnerships] = await Promise.all([
    loadCompanyEventsHub(session.user.id),
    prisma.companyPartnership.findMany({
      where: { companyUserId: session.user.id, status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true } } },
    }),
  ]);

  const universities = partnerships
    .filter((p) => p.university)
    .map((p) => ({ id: p.university!.id, name: p.university!.name }));

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Workshops, career fairs, and networking — university-approved, calendar-integrated."
      />
      <CompanyEventsCommandCenter
        initialHub={JSON.parse(JSON.stringify(hub))}
        universities={universities}
      />
    </div>
  );
}
