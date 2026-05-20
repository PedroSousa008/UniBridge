import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentCareerSimulationHub } from '@/lib/student/student-career-simulation-hub';
import { SimulationCommandCenter } from '@/components/student/career/simulation-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function SimulationContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentCareerSimulationHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Career Simulation"
        subtitle="What kind of life could you realistically have if you follow this path?"
      />
      <SimulationCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function CareerSimulationPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading future simulation…</p>}>
      <SimulationContent />
    </Suspense>
  );
}
