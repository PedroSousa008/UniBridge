import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentEmployabilityHub } from '@/lib/student/student-employability-hub';
import { EmployabilityCommandCenter } from '@/components/student/career/employability-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function EmployabilityContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentEmployabilityHub(session.user.id, '1y');

  return (
    <div>
      <PageHeader
        title="Employability"
        subtitle="Am I becoming more employable? — your progression, visualized."
      />
      <EmployabilityCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function EmployabilityPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading employability…</p>}>
      <EmployabilityContent />
    </Suspense>
  );
}
