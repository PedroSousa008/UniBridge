import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentOpportunitiesHub } from '@/lib/student/student-opportunities-hub';
import { OpportunitiesCommandCenter } from '@/components/student/career/opportunities-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function OpportunitiesContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentOpportunitiesHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Track every application, interview, and offer in one strategic pipeline."
      />
      <OpportunitiesCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading opportunities…</p>}>
      <OpportunitiesContent />
    </Suspense>
  );
}
