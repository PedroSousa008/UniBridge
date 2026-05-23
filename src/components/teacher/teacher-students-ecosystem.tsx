'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Radio,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { TeacherStudentsHub } from '@/lib/teacher/teacher-students-hub';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export function TeacherStudentsEcosystem({ initialHub }: { initialHub: TeacherStudentsHub }) {
  const [hub, setHub] = useState(initialHub);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/teacher/students');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={
          hub.linked
            ? `${hub.universityName} — understand and guide student academic progression by class`
            : 'Your student understanding and academic support ecosystem'
        }
      />

      {hub.linked && hub.classes.length > 0 ? (
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
          <Radio className="h-4 w-4 text-brand animate-pulse" />
          <span className="text-muted-foreground">
            Choose a class to explore your students — attendance, grades, support signals, and private
            notes sync live with Workspace and Gradebook.
          </span>
        </div>
      ) : null}

      {!hub.linked ? (
        <EmptyState
          iconName="users"
          title="Not linked to a university"
          description="When your university assigns your classes, they appear here as academic ecosystems — organized the way you teach."
          className="py-16"
        />
      ) : hub.classes.length === 0 ? (
        <EmptyState
          iconName="users"
          title="No classes this semester"
          description="Your assigned subjects will appear here automatically. Each class opens a dedicated student support ecosystem."
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hub.classes.map((c) => (
            <Link key={c.id} href={c.classEcosystemHref} className="group block">
              <Card
                className={cn(
                  'h-full overflow-hidden border-border/70 transition-all duration-200',
                  'hover:border-brand/40 hover:shadow-md hover:shadow-brand/5'
                )}
              >
                <div className="h-1 bg-gradient-to-r from-violet-500/60 via-brand to-emerald-500/40 opacity-90" />
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold leading-tight group-hover:text-brand transition-colors">
                        {c.name}
                      </h3>
                      {c.courseName ? (
                        <p className="mt-1 text-sm text-muted-foreground">{c.courseName}</p>
                      ) : null}
                    </div>
                    {c.code ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.code}
                      </Badge>
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {[c.academicYear ? `Year ${c.academicYear}` : null, c.semester]
                      .filter(Boolean)
                      .join(' · ') || 'Current semester'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Metric icon={Users} label="Students" value={String(c.studentCount)} />
                    <Metric
                      icon={TrendingUp}
                      label="Class grade"
                      value={c.averageGrade != null ? String(c.averageGrade) : '—'}
                    />
                    <Metric icon={GraduationCap} label="Attendance" value={c.attendanceOverview} />
                    <Metric
                      icon={AlertTriangle}
                      label="Need support"
                      value={String(c.studentsNeedingSupport)}
                      highlight={c.studentsNeedingSupport > 0}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {c.indicators.map((ind) => (
                      <IndicatorChip key={ind.id} label={ind.label} tone={ind.tone} />
                    ))}
                    {c.indicators.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Class progressing well</span>
                    ) : null}
                  </div>

                  <p className="text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                    Open class student ecosystem →
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

function Metric({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className={cn('mt-0.5 font-semibold', highlight && 'text-rose-600')}>{value}</p>
    </div>
  );
}

function IndicatorChip({
  label,
  tone,
}: {
  label: string;
  tone: 'amber' | 'rose' | 'violet' | 'brand';
}) {
  const tones = {
    amber: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
    violet: 'bg-violet-500/10 text-violet-800 border-violet-500/20',
    brand: 'bg-brand/10 text-brand border-brand/20',
  };
  const Icon =
    tone === 'amber' ? ClipboardList : tone === 'rose' ? AlertTriangle : BookOpen;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone]
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
