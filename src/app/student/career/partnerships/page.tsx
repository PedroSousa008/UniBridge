import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentPartnershipsHub } from '@/lib/student/student-partnerships-hub';
import { PartnershipsCommandCenter } from '@/components/student/career/partnerships-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function PartnershipsContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentPartnershipsHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Company Partnerships"
        subtitle="A premium university-connected career marketplace — curated opportunities from verified partners."
      />
      <PartnershipsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function PartnershipsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading partnerships…</p>}>
      <PartnershipsContent />
    </Suspense>
  );
}
