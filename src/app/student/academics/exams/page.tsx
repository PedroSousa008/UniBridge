import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadStudentExams } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function StudentExamsPage() {
  const session = await requireSession('STUDENT');
  const exams = await loadStudentExams(session.user.id);
  const now = Date.now();

  return (
    <div>
      <PageHeader title="Exams" subtitle="Upcoming and past exams across all subjects." />
      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exams scheduled.</p>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => {
            const upcoming = new Date(e.date).getTime() >= now;
            return (
              <Link
                key={e.id}
                href={`/student/academics/subjects/${e.subject.id}/calendar`}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.subject.name}
                        {e.subject.code ? ` · ${e.subject.code}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleString()}
                        {e.location ? ` · ${e.location}` : ''}
                      </p>
                    </div>
                    <Badge variant={upcoming ? 'default' : 'secondary'}>
                      {upcoming ? 'Upcoming' : 'Past'}
                    </Badge>
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
