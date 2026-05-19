import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { buildGradeRows, computeWeightedAverage } from '@/lib/student/subject-grades';
import { loadSubjectWorkspace } from '@/lib/student/subject-context';
import { serializeSubjectWorkspace } from '@/lib/student/serialize-workspace';
import { SubjectGradebookPanel } from '@/components/student/subject/subject-panels';

export default async function StudentGradebookPage() {
  const session = await requireSession('STUDENT');

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId: session.user.id },
    include: {
      subject: {
        select: { id: true, name: true, code: true, status: true },
      },
    },
  });

  const active = enrollments.filter((e) => e.subject.status === 'ACTIVE');

  const summaries = await Promise.all(
    active.map(async (e) => {
      const ws = serializeSubjectWorkspace(
        await loadSubjectWorkspace(session.user.id, e.subject.id)
      );
      const rows = buildGradeRows(ws);
      const avg = computeWeightedAverage(
        rows,
        ws.gradeCategories.map((c) => ({ name: c.name, weight: c.weight }))
      );
      return { subject: e.subject, average: avg, ws };
    })
  );

  return (
    <div>
      <PageHeader
        title="Gradebook"
        subtitle="All your grades across subjects — synced from each subject workspace."
      />

      {summaries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Enroll in subjects via your university to see grades here.
        </p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map(({ subject, average }) => (
              <Link key={subject.id} href={`/student/academics/subjects/${subject.id}/gradebook`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-5">
                    <p className="font-medium">{subject.name}</p>
                    {subject.code ? (
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                    ) : null}
                    <p className="mt-3 text-3xl font-semibold">{average ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">average / 20</p>
                    <Progress
                      value={average != null ? (average / 20) * 100 : 0}
                      className="mt-3 h-2"
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {summaries.length === 1 ? (
            <SubjectGradebookPanel ws={summaries[0].ws} />
          ) : null}
        </div>
      )}
    </div>
  );
}
