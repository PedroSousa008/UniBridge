import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentMessagesHub } from '@/lib/student/student-messages';
import { MessagesHubClient } from '@/components/student/messages/messages-hub-client';

async function MessagesContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentMessagesHub(session.user.id);

  return <MessagesHubClient initialHub={JSON.parse(JSON.stringify(hub))} />;
}

export default function StudentMessagesHubPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading messages…</p>}>
      <MessagesContent />
    </Suspense>
  );
}
