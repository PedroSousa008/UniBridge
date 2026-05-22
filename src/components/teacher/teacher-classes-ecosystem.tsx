'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Radio,
  Users,
} from 'lucide-react';
import type { TeacherClassesHub } from '@/lib/teacher/teacher-classes-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export function TeacherClassesEcosystem({ initialHub }: { initialHub: TeacherClassesHub }) {
  const [hub, setHub] = useState(initialHub);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/teacher/classes');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const notLinked = !hub.linked;
  const hasSubjects = hub.subjects.length > 0;

  return (
    <div>
      <PageHeader
        title="Classes"
        subtitle={
          notLinked
            ? 'Academic ecosystem management — link your university account to begin.'
            : `${hub.universityName} — live academic ecosystems for every subject you teach`
        }
      />

      {!notLinked && hasSubjects ? (
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
          <Radio className="h-4 w-4 text-brand animate-pulse" />
          <span className="text-muted-foreground">
            Subjects are set by your university. Open any card to manage content, grades, attendance, and
            communication — everything syncs live to students.
          </span>
        </div>
      ) : null}

      {notLinked ? (
        <EmptyState
          iconName="book-open"
          title="Not linked to a university"
          description="Ask your university to invite you with your UniBridge email. When they assign you to subjects, they will appear here automatically."
          className="py-16"
        />
      ) : !hasSubjects ? (
        <EmptyState
          iconName="book-open"
          title="No subjects this semester"
          description="Your university assigns subjects under Academics. Each subject becomes a live ecosystem between you and your students."
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hub.subjects.map((s) => (
            <Link key={s.id} href={s.ecosystemHref} className="group block">
              <Card
                className={cn(
                  'h-full overflow-hidden border-border/70 transition-all duration-200',
                  'hover:border-brand/40 hover:shadow-md hover:shadow-brand/5'
                )}
              >
                <div className="h-1 bg-gradient-to-r from-brand/60 via-brand to-brand/30 opacity-80 group-hover:opacity-100" />
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold leading-tight group-hover:text-brand transition-colors">
                        {s.name}
                      </h3>
                      {s.courseName ? (
                        <p className="mt-1 text-sm text-muted-foreground">{s.courseName}</p>
                      ) : null}
                    </div>
                    {s.code ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {s.code}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {[s.year ? `Year ${s.year}` : null, s.semester].filter(Boolean).join(' · ') ||
                      'Current semester'}
                  </p>

                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-brand" />
                    {s.studentCount} student{s.studentCount === 1 ? '' : 's'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {s.signals.pendingEvaluations > 0 ? (
                      <SignalChip
                        icon={ClipboardList}
                        label={`${s.signals.pendingEvaluations} to grade`}
                        tone="amber"
                      />
                    ) : null}
                    {s.signals.attendanceAlerts > 0 ? (
                      <SignalChip
                        icon={AlertTriangle}
                        label="Attendance"
                        tone="rose"
                      />
                    ) : null}
                    {s.signals.upcomingDeadlines > 0 ? (
                      <SignalChip
                        icon={CalendarClock}
                        label={`${s.signals.upcomingDeadlines} deadlines`}
                        tone="violet"
                      />
                    ) : null}
                    {s.signals.recentAnnouncements > 0 ? (
                      <SignalChip
                        icon={Megaphone}
                        label="Live updates"
                        tone="brand"
                      />
                    ) : null}
                    {!s.signals.pendingEvaluations &&
                    !s.signals.attendanceAlerts &&
                    !s.signals.upcomingDeadlines ? (
                      <span className="text-xs text-muted-foreground">All caught up</span>
                    ) : null}
                  </div>

                  <p className="text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                    Open subject ecosystem →
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {hub.coordinatingCourses.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <GraduationCap className="h-5 w-5 text-brand" />
            Courses I coordinate
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {hub.coordinatingCourses.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{c.name}</p>
                  {c.department ? <p className="mt-1">{c.department}</p> : null}
                  <p className="mt-2">
                    {c.studentCount} students · {c.subjectCount} subjects
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8">
        <Link
          href="/teacher/home"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function SignalChip({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: 'amber' | 'rose' | 'violet' | 'brand';
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    rose: 'bg-rose-500/10 text-rose-800 dark:text-rose-200',
    violet: 'bg-violet-500/10 text-violet-800 dark:text-violet-200',
    brand: 'bg-brand/10 text-brand',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone]
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
