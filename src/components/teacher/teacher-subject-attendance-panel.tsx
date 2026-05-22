'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type {
  AttendanceStatusLabel,
  SubjectAttendanceReport,
} from '@/lib/teacher/subject-attendance-report';
import { cn } from '@/lib/utils';

const POLL_MS = 25_000;

function statusBadgeClass(status: AttendanceStatusLabel): string {
  switch (status) {
    case 'Excellent':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'Good':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200';
    case 'Warning':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200';
    case 'Critical':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function TeacherSubjectAttendancePanel({
  subjectId,
  initialReport,
}: {
  subjectId: string;
  initialReport: SubjectAttendanceReport;
}) {
  const [report, setReport] = useState(initialReport);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
    async (silent = true) => {
      if (!silent) setRefreshing(true);
      try {
        const res = await fetch(`/api/teacher/subjects/${subjectId}/attendance/report`, {
          cache: 'no-store',
        });
        if (res.ok) setReport(await res.json());
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [subjectId]
  );

  useEffect(() => {
    const id = window.setInterval(() => void refresh(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const workspaceHref = `/teacher/workspace?view=attendance&subject=${subjectId}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{report.subjectName} — Attendance</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Read-only overview for this class. Mark attendance in Workspace — changes sync here,
            student profiles, and dashboards automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={refreshing} onClick={() => void refresh(false)}>
            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href={workspaceHref}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Take attendance in Workspace
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Class sessions</p>
            <p className="text-2xl font-semibold">{report.totalSessions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Class average</p>
            <p className="text-2xl font-semibold">
              {report.classAveragePercent != null ? `${report.classAveragePercent}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Required minimum</p>
            <p className="text-2xl font-semibold">{report.minAttendancePercent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Pending justifications</p>
            <p className="text-2xl font-semibold">{report.pendingJustifications}</p>
          </CardContent>
        </Card>
      </div>

      {report.students.length === 0 ? (
        <EmptyState
          iconName="book-open"
          title="No students enrolled"
          description="When students are enrolled, their attendance records will appear here after you take attendance in Workspace."
          className="py-12"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student attendance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated {format(new Date(report.updatedAt), 'PPp')}
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Account</th>
                  <th className="pb-3 pr-4 font-medium text-center">Total classes</th>
                  <th className="pb-3 pr-4 font-medium text-center">Present</th>
                  <th className="pb-3 pr-4 font-medium text-center">Absent</th>
                  <th className="pb-3 pr-4 font-medium text-center">Justified</th>
                  <th className="pb-3 pr-4 font-medium text-center">%</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last record</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.studentId} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-medium">{s.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.email}</td>
                    <td className="py-3 pr-4 text-center tabular-nums">{s.totalClasses}</td>
                    <td className="py-3 pr-4 text-center tabular-nums text-emerald-600">
                      {s.presentCount}
                    </td>
                    <td className="py-3 pr-4 text-center tabular-nums text-red-600">
                      {s.absentCount}
                    </td>
                    <td className="py-3 pr-4 text-center tabular-nums">{s.justifiedCount}</td>
                    <td className="py-3 pr-4 text-center font-semibold tabular-nums">
                      {s.attendancePercent != null ? `${s.attendancePercent}%` : '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={statusBadgeClass(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {s.lastRecord ? (
                        <span>
                          {format(new Date(s.lastRecord.date), 'd MMM yyyy')} —{' '}
                          {s.lastRecord.status}
                          {s.lastRecord.sessionLabel
                            ? ` · ${s.lastRecord.sessionLabel}`
                            : ''}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Synced from Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Present includes on-time and late arrivals. Justified counts excused absences marked in
            Workspace. Percentages match enrollment records updated when each session is saved.
          </p>
          {report.recentSessions.length === 0 ? (
            <p className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              No sessions recorded yet —{' '}
              <Link href={workspaceHref} className="font-medium text-foreground underline">
                take attendance in Workspace
              </Link>
            </p>
          ) : (
            <ul className="space-y-1">
              {report.recentSessions.map((sess) => (
                <li key={sess.id}>
                  {format(new Date(sess.date), 'EEE d MMM yyyy')}
                  {sess.label ? ` · ${sess.label}` : ''} — {sess.recordCount} students marked
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {refreshing ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}
    </div>
  );
}
