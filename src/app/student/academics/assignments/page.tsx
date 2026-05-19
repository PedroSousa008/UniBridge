import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';
import { AssignmentsCommandCenter } from '@/components/student/assignments/assignments-command-center';

export default async function StudentAssignmentsPage() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentAssignmentsHub(session.user.id);

  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading assignments…</p>}>
      <AssignmentsCommandCenter
        userId={session.user.id}
        initialHub={JSON.parse(JSON.stringify(hub))}
      />
    </Suspense>
  );
}
