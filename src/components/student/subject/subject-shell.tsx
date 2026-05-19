'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUBJECT_TABS } from '@/lib/student/subject-context';
import { Badge } from '@/components/ui/badge';

interface SubjectShellProps {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  courseName: string | null;
  teacherName: string | null;
  children: React.ReactNode;
}

export function SubjectShell({
  subjectId,
  subjectName,
  subjectCode,
  courseName,
  teacherName,
  children,
}: SubjectShellProps) {
  const pathname = usePathname();
  const base = `/student/academics/subjects/${subjectId}`;
  const activeTab =
    SUBJECT_TABS.find((t) => pathname === `${base}/${t.id}`)?.id ??
    (pathname === base ? 'home' : 'home');

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/student/academics/subjects"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All subjects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-6 w-6 text-brand" />
              <h1 className="text-2xl font-semibold tracking-tight">{subjectName}</h1>
              {subjectCode ? <Badge variant="secondary">{subjectCode}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[courseName, teacherName ? `Prof. ${teacherName}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      </div>

      <nav className="mb-6 -mx-1 flex gap-1 overflow-x-auto pb-2">
        {SUBJECT_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`${base}/${tab.id}`}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
