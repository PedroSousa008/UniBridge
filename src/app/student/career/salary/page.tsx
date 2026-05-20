import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentSalaryHub } from '@/lib/student/student-salary-hub';
import { SalaryCommandCenter } from '@/components/student/career/salary-command-center';
import { PageHeader } from '@/components/layout/page-header';

async function SalaryContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentSalaryHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Salary Simulator"
        subtitle="What kind of life could your future career realistically give you?"
      />
      <SalaryCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}

export default function SalaryPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading salary simulation…</p>}>
      <SalaryContent />
    </Suspense>
  );
}
