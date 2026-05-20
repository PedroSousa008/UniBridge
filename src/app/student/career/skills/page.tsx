import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentSkillsHub } from '@/lib/student/student-skills-hub';
import { SkillsCommandCenter } from '@/components/student/career/skills-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function SkillsContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentSkillsHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Skills Tracking"
        subtitle="Your career skill tree — verified by real activity across UniBridge, not self-claims."
      />
      <SkillsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function SkillsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading skill intelligence…</p>}>
      <SkillsContent />
    </Suspense>
  );
}
