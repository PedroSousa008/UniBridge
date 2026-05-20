import { Suspense } from 'react';
import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadPartnershipCompanyDetail } from '@/lib/student/student-partnerships-hub';
import { PartnershipCompanyView } from '@/components/student/career/partnership-company-view';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

async function CompanyContent({ partnershipId }: { partnershipId: string }) {
  const session = await requireSession('STUDENT');
  const detail = await loadPartnershipCompanyDetail(session.user.id, partnershipId);

  if (!detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/career/partnerships">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to partnerships
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Partnership not found or no longer active.</p>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-4" asChild>
        <Link href="/student/career/partnerships">
          <ChevronLeft className="mr-1 h-4 w-4" />
          All partnerships
        </Link>
      </Button>
      <PageHeader title={detail.name} subtitle={detail.partnershipTier} />
      <PartnershipCompanyView initialDetail={JSON.parse(JSON.stringify(detail))} />
    </div>
  );
}

export default async function PartnershipCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading company…</p>}>
      <CompanyContent partnershipId={id} />
    </Suspense>
  );
}
