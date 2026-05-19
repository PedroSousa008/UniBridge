import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { loadStudentCalendarEvents } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function StudentAcademicCalendarPage() {
  const session = await requireSession('STUDENT');
  const { assignments, exams, universityEvents } = await loadStudentCalendarEvents(
    session.user.id
  );

  const items = [
    ...assignments.map((a) => ({
      id: `a-${a.id}`,
      title: a.title,
      date: a.dueDate,
      type: 'Assignment',
      subject: a.subject.name,
      href: `/student/academics/subjects/${a.subjectId}/content`,
    })),
    ...exams.map((e) => ({
      id: `e-${e.id}`,
      title: e.title,
      date: e.date,
      type: 'Exam',
      subject: e.subject.name,
      href: `/student/academics/subjects/${e.subjectId}/calendar`,
    })),
    ...universityEvents.map((ev) => ({
      id: `u-${ev.id}`,
      title: ev.title,
      date: ev.startDate,
      type: ev.eventType ?? 'Event',
      subject: 'University',
      href: '/student/academics/calendar',
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <PageHeader
        title="Academic Calendar"
        subtitle="Deadlines, exams, and university events."
        action={
          <Button asChild variant="outline">
            <Link href="/student/academics/schedule">Weekly schedule</Link>
          </Button>
        }
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.type}
                  </p>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subject} · {new Date(item.date).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
