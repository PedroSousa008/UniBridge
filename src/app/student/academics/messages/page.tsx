import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadStudentEnrolledSubjectIds } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default async function StudentMessagesHubPage() {
  const session = await requireSession('STUDENT');
  const enrollments = await loadStudentEnrolledSubjectIds(session.user.id);

  return (
    <div>
      <PageHeader
        title="Subject messages"
        subtitle="Open a subject to read and send class messages."
      />
      {enrollments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enrolled subjects.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {enrollments.map((e) => (
            <Link
              key={e.subjectId}
              href={`/student/academics/subjects/${e.subjectId}/messages`}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-3 py-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{e.subject.name}</p>
                    {e.subject.code ? (
                      <p className="text-xs text-muted-foreground">{e.subject.code}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
