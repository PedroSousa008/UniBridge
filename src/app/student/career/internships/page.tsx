import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentInternshipsHub } from '@/lib/student/student-internships-hub';
import { InternshipsCommandCenter } from '@/components/student/career/internships-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function InternshipsContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentInternshipsHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Internships"
        subtitle="Discover, prepare, track, and succeed — your professional launchpad."
      />
      <InternshipsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function InternshipsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading your internship hub…</p>}>
      <InternshipsContent />
    </Suspense>
  );
}
