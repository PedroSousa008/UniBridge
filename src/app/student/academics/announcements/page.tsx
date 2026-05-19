import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { loadStudentEnrolledSubjectIds } from '@/lib/student/academics-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default async function StudentAnnouncementsPage() {
  const session = await requireSession('STUDENT');
  const enrollments = await loadStudentEnrolledSubjectIds(session.user.id);
  const subjectIds = enrollments.map((e) => e.subjectId);

  const announcements = await prisma.subjectAnnouncement.findMany({
    where: {
      subjectId: { in: subjectIds },
      OR: [{ publishedAt: { not: null } }, { publishedAt: null, scheduledAt: null }],
    },
    include: {
      subject: { select: { id: true, name: true } },
      author: { select: { name: true } },
    },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
    take: 50,
  });

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Updates from your teachers." />
      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/student/academics/subjects/${a.subject.id}/announcements`}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <p className="text-xs text-muted-foreground">{a.subject.name}</p>
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
