'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BookOpen, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEACHER_SUBJECT_TABS } from '@/lib/teacher/teacher-subject-tabs';
import { Badge } from '@/components/ui/badge';

interface TeacherSubjectShellProps {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  courseName: string | null;
  semester: string | null;
  year: number | null;
  studentCount: number;
  children: React.ReactNode;
}

export function TeacherSubjectShell({
  subjectId,
  subjectName,
  subjectCode,
  courseName,
  semester,
  year,
  studentCount,
  children,
}: TeacherSubjectShellProps) {
  const pathname = usePathname();
  const base = `/teacher/classes/${subjectId}`;
  const activeTab =
    TEACHER_SUBJECT_TABS.find((t) => pathname === `${base}/${t.id}`)?.id ?? 'home';

  const meta = [courseName, year ? `Year ${year}` : null, semester]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-brand/8 via-background to-muted/30 p-6">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
        <Link
          href="/teacher/classes"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All subjects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
                <Radio className="h-3 w-3 animate-pulse" />
                Live ecosystem
              </span>
              {subjectCode ? <Badge variant="secondary">{subjectCode}</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BookOpen className="h-7 w-7 text-brand" />
              <h1 className="text-2xl font-semibold tracking-tight">{subjectName}</h1>
            </div>
            {meta ? <p className="mt-1 text-sm text-muted-foreground">{meta}</p> : null}
            <p className="mt-2 text-sm text-muted-foreground">
              {studentCount} student{studentCount === 1 ? '' : 's'} · synchronized with student dashboards
            </p>
          </div>
          <ButtonLinkWorkspace subjectId={subjectId} />
        </div>
      </div>

      <nav className="mb-6 -mx-1 flex gap-1 overflow-x-auto pb-2">
        {TEACHER_SUBJECT_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`${base}/${tab.id}`}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-foreground text-background shadow-sm'
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

function ButtonLinkWorkspace({ subjectId }: { subjectId: string }) {
  return (
    <Link
      href={`/teacher/workspace?view=attendance&subject=${subjectId}`}
      className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted/50"
    >
      Open workspace
    </Link>
  );
}
