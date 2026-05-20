import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentCompatibilityHub } from '@/lib/student/student-compatibility-hub';
import { CompatibilityCommandCenter } from '@/components/student/career/compatibility-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function CompatibilityContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentCompatibilityHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Compatibility Engine"
        subtitle="Real-time career intelligence — how close you are to the future you want."
      />
      <CompatibilityCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Analyzing your profile…</p>}>
      <CompatibilityContent />
    </Suspense>
  );
}
