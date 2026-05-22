'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TeacherWorkspaceHub } from '@/lib/teacher/teacher-workspace-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TeacherWorkspaceGradingPanel } from '@/components/teacher/teacher-workspace-grading-panel';
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

type View = 'overview' | 'attendance' | 'grading' | 'progression';

type StudentRow = { id: string; name: string; email: string; attendance: number | null };
const ATT_STATUS = [
  { id: 'PRESENT', label: 'Present', icon: CheckCircle2, color: 'text-emerald-600' },
  { id: 'ABSENT', label: 'Absent', icon: XCircle, color: 'text-rose-600' },
  { id: 'EXCUSED', label: 'Justified', icon: UserCheck, color: 'text-amber-600' },
  { id: 'LATE', label: 'Late', icon: Calendar, color: 'text-violet-600' },
] as const;

export function TeacherWorkspaceCommandCenter({
  initialHub,
}: {
  initialHub: TeacherWorkspaceHub;
}) {
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as View) || 'overview';
  const initialSubject = searchParams.get('subject') ?? '';

  const [hub, setHub] = useState(initialHub);
  const [view, setView] = useState<View>(initialView);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [attSubjectId, setAttSubjectId] = useState(initialSubject || hub.subjects[0]?.id || '');
  const [attDate, setAttDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attStudents, setAttStudents] = useState<StudentRow[]>([]);
  const [attMarks, setAttMarks] = useState<Record<string, string>>({});
  const [attNote, setAttNote] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/teacher/workspace');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function loadAttendanceStudents(subjectId: string) {
    if (!subjectId) return;
    const res = await fetch(`/api/teacher/workspace/subjects/${subjectId}/students`);
    if (res.ok) {
      const data = (await res.json()) as { students: StudentRow[] };
      setAttStudents(data.students);
      const marks: Record<string, string> = {};
      for (const s of data.students) marks[s.id] = 'PRESENT';
      setAttMarks(marks);
    }
  }

  useEffect(() => {
    if (view === 'attendance' && attSubjectId) void loadAttendanceStudents(attSubjectId);
  }, [view, attSubjectId]);

  async function submitAttendance() {
    if (!attSubjectId) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch(`/api/teacher/subjects/${attSubjectId}/attendance/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: attDate,
        label: 'Workspace session',
        records: attStudents.map((s) => ({
          studentId: s.id,
          status: attMarks[s.id] ?? 'ABSENT',
        })),
      }),
    });
    if (res.ok) {
      setMsg('Attendance saved — student dashboards update live.');
      await refresh();
    } else setMsg('Could not save attendance.');
    setLoading(false);
  }

  if (!hub.linked) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
        Link your teacher account to a university to unlock Workspace.
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Hero */}
      <section className="rounded-3xl border bg-gradient-to-br from-slate-50 via-white to-violet-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-violet-950/30 px-6 py-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Operational center</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-xl">
          Manage attendance, grading, and academic flow — calm, focused, and live-synced with student
          profiles.
        </p>
        {hub.universityName ? (
          <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">{hub.universityName}</p>
        ) : null}
      </section>

      {msg ? (
        <p className="text-sm rounded-xl border bg-muted/40 px-4 py-2">{msg}</p>
      ) : null}

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-3">
        {hub.todayClasses[0] ? (
          <Link
            href={hub.todayClasses[0].calendarHref}
            className="rounded-2xl border bg-card p-4 text-left transition hover:border-violet-500/30 block"
          >
            <p className="text-2xl font-bold tabular-nums">{hub.metrics.todaysClasses}</p>
            <p className="text-xs text-muted-foreground">Today&apos;s classes</p>
            <p className="text-[10px] text-violet-600 mt-1">Open class calendar →</p>
          </Link>
        ) : (
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-2xl font-bold tabular-nums">0</p>
            <p className="text-xs text-muted-foreground">Today&apos;s classes</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setView('attendance')}
          className="rounded-2xl border bg-card p-4 text-left transition hover:border-violet-500/30"
        >
          <p className="text-2xl font-bold tabular-nums">{hub.metrics.pendingAttendance}</p>
          <p className="text-xs text-muted-foreground">Pending attendance</p>
        </button>
        <button
          type="button"
          onClick={() => setView('grading')}
          className="rounded-2xl border bg-card p-4 text-left transition hover:border-violet-500/30"
        >
          <p className="text-2xl font-bold tabular-nums">{hub.metrics.pendingGrading}</p>
          <p className="text-xs text-muted-foreground">Awaiting grading</p>
        </button>
      </section>

      {/* Quick actions */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { id: 'attendance' as View, label: 'Take attendance', icon: ClipboardCheck },
          { id: 'grading' as View, label: 'Grade submissions', icon: GraduationCap },
          { id: 'progression' as View, label: 'Student progression', icon: TrendingUp },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={cn(
              'group rounded-2xl border p-5 text-left transition hover:border-violet-500/40 hover:shadow-sm',
              view === id && 'border-violet-500/50 bg-violet-500/5'
            )}
          >
            <Icon className="h-5 w-5 text-violet-600 mb-2 group-hover:scale-105 transition" />
            <p className="font-medium text-sm">{label}</p>
          </button>
        ))}
      </section>

      {/* Today's classes strip */}
      {hub.todayClasses.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Today on your schedule
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {hub.todayClasses.map((c) => (
              <Link
                key={`${c.subjectId}-${c.startTime}`}
                href={c.calendarHref}
                className="min-w-[200px] shrink-0 rounded-xl border bg-card px-4 py-3 hover:border-violet-500/35"
              >
                <p className="font-medium text-sm">{c.subjectName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.startTime} – {c.endTime}
                  {c.room ? ` · ${c.room}` : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {view === 'attendance' ? (
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <p className="text-sm text-muted-foreground">Fast marking — syncs to student dashboards live.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-lg border px-3 py-2 text-sm bg-background min-w-[200px]"
                value={attSubjectId}
                onChange={(e) => setAttSubjectId(e.target.value)}
              >
                {hub.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <Input
              placeholder="Session note (optional)"
              value={attNote}
              onChange={(e) => setAttNote(e.target.value)}
            />
            <ul className="space-y-2 max-h-[360px] overflow-y-auto">
              {attStudents.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.attendance != null ? `${Math.round(s.attendance)}% attendance` : '—'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {ATT_STATUS.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        title={st.label}
                        onClick={() => setAttMarks({ ...attMarks, [s.id]: st.id })}
                        className={cn(
                          'rounded-lg border px-2 py-1 text-[10px] font-medium transition',
                          attMarks[s.id] === st.id && 'bg-violet-500/10 border-violet-500/40'
                        )}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <Button onClick={() => void submitAttendance()} disabled={loading || !attStudents.length}>
              Save attendance
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view === 'grading' ? (
        <TeacherWorkspaceGradingPanel
          subjects={hub.subjects.map((s) => ({ id: s.id, name: s.name }))}
          initialSubjectId={initialSubject || attSubjectId}
        />
      ) : null}

      {view === 'progression' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student progression signals
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {hub.progression.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Signals appear as attendance and grades accumulate.
              </p>
            ) : (
              hub.progression.map((p) => (
                <Link
                  key={`${p.studentId}-${p.subjectId}`}
                  href={p.href}
                  className={cn(
                    'rounded-xl border p-4 transition hover:shadow-sm',
                    p.tone === 'warning' && 'border-amber-500/30 bg-amber-500/5',
                    p.tone === 'positive' && 'border-emerald-500/30 bg-emerald-500/5',
                    p.tone === 'neutral' && 'bg-card'
                  )}
                >
                  <p className="font-medium text-sm">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground">{p.subjectName}</p>
                  <p className="text-sm mt-2">{p.signal}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === 'overview' && hub.subjects.length > 0 ? (
        <section className="rounded-2xl border p-4">
          <p className="text-sm font-medium">Grade submissions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Set up evaluation structure in Classes, then grade and publish from Workspace.
          </p>
          <Button size="sm" className="mt-3" onClick={() => setView('grading')}>
            Open grading
          </Button>
        </section>
      ) : null}

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-full border bg-card p-3 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
