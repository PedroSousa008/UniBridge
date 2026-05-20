import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { CareerPathsCommandCenter } from '@/components/student/career/career-paths-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function CareerPathsContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentCareerPathsHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Career Paths"
        subtitle="A personalized roadmap based on your profile, academics, and goals — evolving as you grow."
      />
      <CareerPathsCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function StudentCareerPathsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading career paths…</p>}>
      <CareerPathsContent />
    </Suspense>
  );
}
