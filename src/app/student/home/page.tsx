import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentHomeHub } from '@/lib/student/student-home-hub';
import { StudentCommandCenter } from '@/components/student/home/student-command-center';

async function HomeContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentHomeHub(session.user.id, session.user.name ?? null);

  return (
    <StudentCommandCenter
      initialHub={JSON.parse(JSON.stringify(hub))}
      userId={session.user.id}
    />
  );
}

export default function StudentHomePage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading your command center…</p>}>
      <HomeContent />
    </Suspense>
  );
}
