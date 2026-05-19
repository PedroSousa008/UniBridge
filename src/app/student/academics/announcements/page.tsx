import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentAnnouncementsHub } from '@/lib/student/student-announcements';
import { AnnouncementsCommandCenter } from '@/components/student/announcements/announcements-command-center';

async function AnnouncementsContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentAnnouncementsHub(session.user.id);

  return (
    <AnnouncementsCommandCenter
      initialHub={JSON.parse(JSON.stringify(hub))}
    />
  );
}

export default function StudentAnnouncementsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading announcements…</p>}>
      <AnnouncementsContent />
    </Suspense>
  );
}
