import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentResourcesHub } from '@/lib/student/student-resources';
import { ResourcesHubClient } from '@/components/student/resources/resources-hub-client';

async function ResourcesContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentResourcesHub(session.user.id);

  return (
    <ResourcesHubClient initialHub={JSON.parse(JSON.stringify(hub))} />
  );
}

export default function StudentResourcesPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading resources…</p>}>
      <ResourcesContent />
    </Suspense>
  );
}
