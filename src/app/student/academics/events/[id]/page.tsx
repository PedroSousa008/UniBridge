import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { loadStudentCompanyEventPage } from '@/lib/student/student-company-event-hub';
import { StudentCompanyEventClient } from '@/components/student/calendar/student-company-event-client';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default async function StudentCompanyEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { id } = await params;
  const page = await loadStudentCompanyEventPage(session.user.id, id);
  if (!page) notFound();

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1" asChild>
        <Link href="/student/academics/calendar">
          <ChevronLeft className="h-4 w-4" />
          Back to calendar
        </Link>
      </Button>
      <StudentCompanyEventClient initialPage={JSON.parse(JSON.stringify(page))} />
    </div>
  );
}
