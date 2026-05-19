import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadStudentEnrolledSubjectIds } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default async function StudentAttendancePage() {
  const session = await requireSession('STUDENT');
  const enrollments = await loadStudentEnrolledSubjectIds(session.user.id);

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Attendance overview across all enrolled subjects."
      />
      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrolled subjects.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((e) => (
            <Link
              key={e.subjectId}
              href={`/student/academics/subjects/${e.subjectId}/attendance`}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="py-5">
                  <p className="font-medium">{e.subject.name}</p>
                  {e.subject.code ? (
                    <p className="text-xs text-muted-foreground">{e.subject.code}</p>
                  ) : null}
                  <p className="mt-3 text-2xl font-semibold">
                    {e.attendance != null ? `${Math.round(e.attendance)}%` : '—'}
                  </p>
                  <Progress
                    value={e.attendance ?? 0}
                    className="mt-3 h-2"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
