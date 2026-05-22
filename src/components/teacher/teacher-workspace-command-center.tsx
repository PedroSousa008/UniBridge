'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { TeacherWorkspaceHub } from '@/lib/teacher/teacher-workspace-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

type View = 'overview' | 'attendance' | 'grading' | 'progression';

type StudentRow = { id: string; name: string; email: string; attendance: number | null };
type SubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string | null;
  draftScore: number | null;
  score: number | null;
  gradePublished: boolean;
  teacherFeedback: string | null;
};

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

  const [gradeEvalId, setGradeEvalId] = useState('');
  const [gradeRows, setGradeRows] = useState<SubmissionRow[]>([]);
  const [gradeMeta, setGradeMeta] = useState<{ title: string; maxScore: number } | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >({});

  const refresh = useCallback(async () => {
    const res = await fetch('/api/teacher/workspace');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedEval = useMemo(
    () => hub.gradingQueue.find((g) => g.id === gradeEvalId),
    [hub.gradingQueue, gradeEvalId]
  );

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

  async function loadGrading(assignmentId: string) {
    setGradeEvalId(assignmentId);
    setLoading(true);
    const res = await fetch(`/api/teacher/workspace/grading/${assignmentId}`);
    if (res.ok) {
      const data = (await res.json()) as {
        assignment: { title: string; maxScore: number };
        submissions: SubmissionRow[];
      };
      setGradeMeta({ title: data.assignment.title, maxScore: data.assignment.maxScore });
      setGradeRows(data.submissions);
      const drafts: Record<string, { score: string; feedback: string }> = {};
      for (const s of data.submissions) {
        drafts[s.id] = {
          score: String(s.draftScore ?? s.score ?? ''),
          feedback: s.teacherFeedback ?? '',
        };
      }
      setGradeDrafts(drafts);
    }
    setLoading(false);
  }

  async function saveGrade(submissionId: string, publish: boolean) {
    const draft = gradeDrafts[submissionId];
    setLoading(true);
    const res = await fetch('/api/teacher/workspace/grading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        draftScore: draft?.score ? parseFloat(draft.score) : null,
        teacherFeedback: draft?.feedback ?? '',
        publish,
      }),
    });
    if (res.ok) {
      setMsg(publish ? 'Grade published — visible only to that student.' : 'Draft saved.');
      if (gradeEvalId) await loadGrading(gradeEvalId);
      await refresh();
    } else {
      const data = await res.json();
      setMsg(data.error ?? 'Grading failed.');
    }
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
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Evaluations to grade</CardTitle>
              <p className="text-xs text-muted-foreground">Created in Classes — grade only here.</p>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
              {hub.gradingQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions waiting.</p>
              ) : (
                hub.gradingQueue.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => void loadGrading(g.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left text-sm transition hover:bg-muted/40',
                      gradeEvalId === g.id && 'border-violet-500/40 bg-violet-500/5'
                    )}
                  >
                    <p className="font-medium line-clamp-1">{g.title}</p>
                    <p className="text-[10px] text-muted-foreground">{g.subjectName}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {g.pendingCount} pending
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {g.gradedCount}/{g.totalSubmissions}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {gradeMeta?.title ?? 'Select an evaluation'}
              </CardTitle>
              {selectedEval ? (
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden max-w-xs">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{
                      width: `${
                        selectedEval.totalSubmissions
                          ? (selectedEval.gradedCount / selectedEval.totalSubmissions) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 max-h-[480px] overflow-y-auto">
              {!gradeEvalId ? (
                <p className="text-sm text-muted-foreground">Choose an assignment to open the grading table.</p>
              ) : (
                gradeRows.map((row) => (
                  <div key={row.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{row.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{row.studentEmail}</p>
                      </div>
                      {row.gradePublished ? (
                        <Badge className="text-[10px]">Published</Badge>
                      ) : row.submittedAt ? (
                        <Badge variant="outline" className="text-[10px]">
                          Submitted
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Missing
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        placeholder={`Score / ${gradeMeta?.maxScore ?? 100}`}
                        value={gradeDrafts[row.id]?.score ?? ''}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [row.id]: { ...gradeDrafts[row.id], score: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Feedback"
                        value={gradeDrafts[row.id]?.feedback ?? ''}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [row.id]: { ...gradeDrafts[row.id], feedback: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => void saveGrade(row.id, false)}
                      >
                        Save draft
                      </Button>
                      <Button
                        size="sm"
                        disabled={loading || !row.submittedAt}
                        onClick={() => void saveGrade(row.id, true)}
                      >
                        Publish grade
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
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

      {view === 'overview' && hub.gradingQueue.length > 0 ? (
        <section className="rounded-2xl border p-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Grading queue highlight
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hub.gradingQueue[0].title} — {hub.gradingQueue[0].pendingCount} submissions waiting
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
