import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentCareerMentorHub } from '@/lib/student/student-career-mentor';
import { MentorCommandCenter } from '@/components/student/career/mentor-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function MentorContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentCareerMentorHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="AI Career Mentor"
        subtitle="Continuous guidance toward your ideal future — academically, professionally, and strategically."
      />
      <MentorCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function CareerMentorPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Preparing your mentor…</p>}>
      <MentorContent />
    </Suspense>
  );
}
