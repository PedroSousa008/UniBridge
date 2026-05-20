import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentCvHub } from '@/lib/student/student-cv-hub';
import { CvCommandCenter } from '@/components/student/career/cv-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function CvContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentCvHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="CV Builder"
        subtitle="Your verified professional identity — built from real ecosystem activity, not self-claims."
      />
      <CvCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function CvPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading verified CV…</p>}>
      <CvContent />
    </Suspense>
  );
}
