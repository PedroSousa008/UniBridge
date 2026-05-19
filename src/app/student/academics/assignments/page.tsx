import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadStudentAssignments } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function StudentAssignmentsPage() {
  const session = await requireSession('STUDENT');
  const assignments = await loadStudentAssignments(session.user.id);
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="All assignments across your enrolled subjects."
      />
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assignments yet. Open a subject to see coursework.
        </p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const overdue = new Date(a.dueDate).getTime() < now && !a.submitted;
            return (
              <Link
                key={a.id}
                href={`/student/academics/subjects/${a.subject.id}/content`}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.subject.name}
                        {a.subject.code ? ` · ${a.subject.code}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {new Date(a.dueDate).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {a.submitted ? (
                        <Badge variant="secondary">Submitted</Badge>
                      ) : overdue ? (
                        <Badge variant="outline">Overdue</Badge>
                      ) : (
                        <Badge>Pending</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
