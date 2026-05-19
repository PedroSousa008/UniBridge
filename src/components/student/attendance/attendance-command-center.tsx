'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock,
  FileUp,
  Minus,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  AttendanceHub,
  AttendanceJustificationRow,
  SubjectAttendanceCard,
} from '@/lib/student/student-attendance';
import {
  createLocalJustificationId,
  loadLocalJustifications,
  saveLocalJustification,
} from '@/lib/student/attendance-local-storage';

type TabId = 'overview' | 'subjects' | 'justifications' | 'insights';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'justifications', label: 'Justifications' },
  { id: 'insights', label: 'Insights' },
];

const RISK_STYLES = {
  safe: 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30',
  warning: 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30',
  risk: 'border-red-200/80 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30',
};

const RISK_BADGE = {
  safe: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  risk: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'PRESENT') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'LATE') return <Clock className="h-4 w-4 text-amber-600" />;
  if (status === 'EXCUSED') return <ShieldAlert className="h-4 w-4 text-sky-600" />;
  if (status === 'ABSENT') return <XCircle className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function AttendanceCommandCenter({ initialHub }: { initialHub: AttendanceHub }) {
  const searchParams = useSearchParams();
  const [hub, setHub] = useState(initialHub);
  const [tab, setTab] = useState<TabId>('overview');
  const [selected, setSelected] = useState<SubjectAttendanceCard | null>(null);
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [syncPending, setSyncPending] = useState(!initialHub.dbReady);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    subjectId: '',
    sessionId: '',
    reason: '',
    fileUrl: '',
    documentUrl: '',
  });

  useEffect(() => {
    if (!syncPending) return;
    fetch('/api/student/attendance')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.overview) {
          setHub(data);
          setSyncPending(false);
        }
      });
  }, [syncPending]);

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    if (!subjectId) return;
    const found = hub.subjects.find((s) => s.subjectId === subjectId);
    if (found) {
      setSelected(found);
      setTab('subjects');
    }
  }, [searchParams, hub.subjects]);

  const localJustifications = useMemo(() => {
    if (hub.dbReady) return [];
    return loadLocalJustifications();
  }, [hub.dbReady]);

  const allJustifications: AttendanceJustificationRow[] = useMemo(() => {
    const local: AttendanceJustificationRow[] = localJustifications.map((j) => ({
      id: j.id,
      subjectId: j.subjectId,
      subjectName: j.subjectName,
      sessionId: j.sessionId,
      reason: j.reason,
      fileUrl: j.fileUrl,
      documentUrl: j.documentUrl,
      status: j.status,
      teacherNote: null,
      createdAt: j.createdAt,
      reviewedAt: null,
    }));
    return [...hub.justifications, ...local];
  }, [hub.justifications, localJustifications]);

  const openJustify = (subject?: SubjectAttendanceCard) => {
    setForm({
      subjectId: subject?.subjectId ?? hub.subjects[0]?.subjectId ?? '',
      sessionId: '',
      reason: '',
      fileUrl: '',
      documentUrl: '',
    });
    setError(null);
    setJustifyOpen(true);
  };

  const submitJustification = useCallback(async () => {
    if (!form.subjectId || !form.reason.trim()) {
      setError('Select a subject and write an explanation.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const subject = hub.subjects.find((s) => s.subjectId === form.subjectId);

    const res = await fetch('/api/student/attendance/justifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectId: form.subjectId,
        sessionId: form.sessionId || null,
        reason: form.reason.trim(),
        fileUrl: form.fileUrl || null,
        documentUrl: form.documentUrl || null,
      }),
    });

    if (res.status === 503) {
      saveLocalJustification({
        id: createLocalJustificationId(),
        subjectId: form.subjectId,
        subjectName: subject?.subjectName ?? 'Subject',
        sessionId: form.sessionId || null,
        reason: form.reason.trim(),
        fileUrl: form.fileUrl || null,
        documentUrl: form.documentUrl || null,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      setJustifyOpen(false);
      setSubmitting(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not submit justification.');
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    if (data.justification) {
      setHub((h) => ({
        ...h,
        justifications: [data.justification, ...h.justifications],
      }));
    }
    setJustifyOpen(false);
    setSubmitting(false);
  }, [form, hub.subjects]);

  const { overview } = hub;
  const TrendIcon =
    overview.trendDirection === 'up'
      ? ArrowUpRight
      : overview.trendDirection === 'down'
        ? ArrowDownRight
        : Minus;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Academic presence and consistency — risks, discipline, and engagement at a glance."
        action={
          <Button size="sm" onClick={() => openJustify()}>
            <FileUp className="mr-2 h-4 w-4" />
            Submit justification
          </Button>
        }
      />

      {!hub.dbReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Syncing attendance data… Justifications may save locally until the database is ready.
        </p>
      )}

      <OverviewStats overview={overview} TrendIcon={TrendIcon} />

      {hub.notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Smart alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                className={cn(
                  'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50',
                  n.severity === 'high' && 'border-red-200/60',
                  n.severity === 'medium' && 'border-amber-200/60'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    n.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                  )}
                />
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground">{n.message}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab subjects={hub.subjects} onSelect={setSelected} />
      )}
      {tab === 'subjects' && (
        <SubjectsGrid subjects={hub.subjects} onSelect={setSelected} />
      )}
      {tab === 'justifications' && (
        <JustificationsTab
          rows={allJustifications}
          onNew={() => openJustify()}
        />
      )}
      {tab === 'insights' && <InsightsTab overview={overview} subjects={hub.subjects} />}

      {hub.teacherNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Teacher feedback (private)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hub.teacherNotes.map((n) => (
              <div key={n.subjectId} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{n.subjectName}</p>
                <p className="mt-1 text-muted-foreground">{n.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Updated {format(parseISO(n.updatedAt), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <SubjectDetailDialog
        subject={selected}
        onClose={() => setSelected(null)}
        onJustify={(s) => openJustify(s)}
      />

      <Dialog open={justifyOpen} onOpenChange={setJustifyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Justified absence</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <label className="text-sm">
              Subject
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.subjectId}
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              >
                {hub.subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>
                    {s.subjectName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Class session (optional)
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.sessionId}
                onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
              >
                <option value="">General / not linked to a session</option>
                {hub.subjects
                  .find((s) => s.subjectId === form.subjectId)
                  ?.sessions.filter((x) => x.status === 'ABSENT')
                  .map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {format(parseISO(sess.date), 'MMM d')}
                      {sess.label ? ` — ${sess.label}` : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Explanation
              <textarea
                className="mt-1 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Describe the reason for your absence…"
              />
            </label>
            <label className="text-sm">
              Document URL (medical proof, etc.)
              <Input
                className="mt-1"
                value={form.documentUrl}
                onChange={(e) => setForm((f) => ({ ...f, documentUrl: e.target.value }))}
                placeholder="https://…"
              />
            </label>
            <label className="text-sm">
              Additional file URL
              <Input
                className="mt-1"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                placeholder="https://…"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={submitJustification} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit for teacher review'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Your submission will appear in your teacher&apos;s attendance review queue when that
              workspace is available.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewStats({
  overview,
  TrendIcon,
}: {
  overview: AttendanceHub['overview'];
  TrendIcon: typeof ArrowUpRight;
}) {
  const items = [
    {
      label: 'Global attendance',
      value: overview.globalPercent != null ? `${overview.globalPercent}%` : '—',
      icon: UserCheck,
    },
    {
      label: 'Best subject',
      value: overview.bestSubject
        ? `${overview.bestSubject.name} (${overview.bestSubject.percent}%)`
        : '—',
      icon: TrendingUp,
    },
    {
      label: 'At risk',
      value: overview.worstSubject
        ? `${overview.worstSubject.name} (${overview.worstSubject.percent}%)`
        : '—',
      icon: AlertTriangle,
    },
    {
      label: 'Presences / absences',
      value: `${overview.totalPresences} / ${overview.totalAbsences}`,
      icon: CheckCircle2,
    },
    {
      label: 'Late arrivals',
      value: String(overview.lateArrivals),
      icon: Clock,
    },
    {
      label: 'Trend',
      value: overview.trendDirection,
      icon: TrendIcon,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-3 py-4">
            <item.icon className="h-8 w-8 text-primary/80" />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold capitalize">{item.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubjectCard({
  subject,
  onSelect,
}: {
  subject: SubjectAttendanceCard;
  onSelect: (s: SubjectAttendanceCard) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(subject)}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-shadow hover:shadow-md',
        RISK_STYLES[subject.risk]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{subject.subjectName}</p>
          {subject.subjectCode && (
            <p className="text-xs text-muted-foreground">{subject.subjectCode}</p>
          )}
          {subject.professor && (
            <p className="mt-1 text-xs text-muted-foreground">{subject.professor}</p>
          )}
        </div>
        <Badge className={RISK_BADGE[subject.risk]}>{subject.risk}</Badge>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">
        {subject.attendancePercent != null ? `${subject.attendancePercent}%` : '—'}
      </p>
      <Progress value={subject.attendancePercent ?? 0} className="mt-2 h-2" />
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>{subject.totalClasses} classes</span>
        <span>{subject.totalAbsences} absences</span>
        <span>{subject.totalPresences} present</span>
        <span>{subject.lateArrivals} late</span>
      </div>
      {subject.absenceLimit != null && (
        <p className="mt-2 text-xs font-medium">
          Absence limit: {subject.totalAbsences}/{subject.absenceLimit}
        </p>
      )}
    </button>
  );
}

function OverviewTab({
  subjects,
  onSelect,
}: {
  subjects: SubjectAttendanceCard[];
  onSelect: (s: SubjectAttendanceCard) => void;
}) {
  const atRisk = subjects.filter((s) => s.risk !== 'safe');
  return (
    <div className="space-y-4">
      {atRisk.length > 0 && (
        <Card className="border-amber-200/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attention needed</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {atRisk.map((s) => (
              <SubjectCard key={s.subjectId} subject={s} onSelect={onSelect} />
            ))}
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <SubjectCard key={s.subjectId} subject={s} onSelect={onSelect} />
        ))}
      </div>
      {subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">No enrolled subjects yet.</p>
      )}
    </div>
  );
}

function SubjectsGrid({
  subjects,
  onSelect,
}: {
  subjects: SubjectAttendanceCard[];
  onSelect: (s: SubjectAttendanceCard) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <SubjectCard key={s.subjectId} subject={s} onSelect={onSelect} />
      ))}
    </div>
  );
}

function JustificationsTab({
  rows,
  onNew,
}: {
  rows: AttendanceJustificationRow[];
  onNew: () => void;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No justifications yet.{' '}
          <button type="button" className="text-primary underline" onClick={onNew}>
            Submit one
          </button>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((j) => (
        <Card key={j.id}>
          <CardContent className="flex flex-wrap items-start justify-between gap-2 py-4">
            <div>
              <p className="font-medium">{j.subjectName}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{j.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(parseISO(j.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <Badge
              variant={j.status === 'APPROVED' ? 'default' : 'secondary'}
              className={j.status === 'REJECTED' ? 'bg-red-100 text-red-800' : undefined}
            >
              {j.status}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InsightsTab({
  overview,
  subjects,
}: {
  overview: AttendanceHub['overview'];
  subjects: SubjectAttendanceCard[];
}) {
  const chartData = overview.trend;
  const bySubject = subjects
    .filter((s) => s.attendancePercent != null)
    .map((s) => ({ name: s.subjectName.slice(0, 12), percent: s.attendancePercent }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance trend (8 weeks)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="percent" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Participation by subject</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bySubject.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="font-medium">{s.percent}%</span>
              </div>
              <Progress value={s.percent ?? 0} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SubjectDetailDialog({
  subject,
  onClose,
  onJustify,
}: {
  subject: SubjectAttendanceCard | null;
  onClose: () => void;
  onJustify: (s: SubjectAttendanceCard) => void;
}) {
  return (
    <Dialog open={!!subject} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {subject && (
          <>
            <DialogHeader>
              <DialogTitle>{subject.subjectName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{subject.attendancePercent ?? '—'}%</span>
                <Badge className={RISK_BADGE[subject.risk]}>{subject.risk}</Badge>
              </div>
              <Progress value={subject.attendancePercent ?? 0} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span>Classes: {subject.totalClasses}</span>
                <span>Absences: {subject.totalAbsences}</span>
                <span>Present: {subject.totalPresences}</span>
                <span>Late: {subject.lateArrivals}</span>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Session history</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                  {subject.sessions.slice(0, 20).map((sess) => (
                    <li
                      key={sess.id}
                      className="flex items-center justify-between rounded border px-2 py-1"
                    >
                      <span>
                        {format(parseISO(sess.date), 'MMM d, yyyy')}
                        {sess.label ? ` · ${sess.label}` : ''}
                        {sess.canceled && ' (canceled)'}
                        {sess.isOnline && ' · online'}
                      </span>
                      <StatusIcon status={sess.status} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={subject.href}>Open subject</Link>
                </Button>
                <Button onClick={() => onJustify(subject)}>Justify absence</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
