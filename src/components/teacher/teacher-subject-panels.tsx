'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Megaphone,
  Pin,
  Plus,
  Radio,
  Send,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { TeacherSubjectWorkspace } from '@/lib/teacher/teacher-subject-context';
import { EVALUATION_COMPONENT_PRESETS, validateCategoryWeights } from '@/lib/teacher/teacher-gradebook';
import { isPendingGradePublish } from '@/lib/teacher/teacher-grading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TeacherSubjectHomePanel({ ws }: { ws: TeacherSubjectWorkspace }) {
  const now = new Date();
  const pendingGrading = ws.assignments.reduce(
    (n, a) => n + a.submissions.filter((s) => isPendingGradePublish(s)).length,
    0
  );
  const upcoming = ws.assignments.filter((a) => new Date(a.dueDate) >= now).slice(0, 5);
  const nextSlot = ws.scheduleSlots[0];
  const latestAnn = ws.announcements[0];
  const enrollmentGrades = ws.enrollments.map((e) => e.grade).filter((g): g is number => g != null);
  const classAvg =
    enrollmentGrades.length > 0
      ? Math.round(
          (enrollmentGrades.reduce((a, b) => a + b, 0) / enrollmentGrades.length) * 10
        ) / 10
      : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <OverviewCard title="Next class" value={nextSlot ? DAYS[nextSlot.dayOfWeek] : '—'} sub={nextSlot ? `${nextSlot.startTime}–${nextSlot.endTime}` : 'Set schedule in Calendar'} />
        <OverviewCard title="Pending evaluations" value={String(pendingGrading)} sub="submissions awaiting publish" href={`/teacher/classes/${ws.subject.id}/gradebook`} />
        <OverviewCard title="Class average" value={classAvg != null ? String(classAvg) : '—'} sub={`out of ${ws.gradingPlan.scaleMax}`} />
        <OverviewCard title="Students needing support" value={String(ws.studentsNeedingSupport.length)} sub="low attendance signals" href={`/teacher/workspace?view=attendance&subject=${ws.subject.id}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Latest announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestAnn ? (
              <>
                <p className="font-medium">{latestAnn.title}</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{latestAnn.body}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No announcements yet</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due soon</p>
            ) : (
              upcoming.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span>{a.title}</span>
                  <span className="text-muted-foreground">{formatDate(a.dueDate)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {ws.studentsNeedingSupport.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-sm">Attendance alerts</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {ws.studentsNeedingSupport.slice(0, 5).map((e) => (
                  <li key={e.studentId}>
                    {e.student?.name} — {e.attendance != null ? `${Math.round(e.attendance)}%` : '—'}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function OverviewCard({
  title,
  value,
  sub,
  href,
}: {
  title: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <Card className={href ? 'transition-colors hover:border-brand/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function TeacherSubjectContentPanel({
  subjectId,
  ws,
}: {
  subjectId: string;
  ws: TeacherSubjectWorkspace;
}) {
  const [weeks, setWeeks] = useState(ws.contentWeeks);
  const [weekNum, setWeekNum] = useState('1');
  const [weekTitle, setWeekTitle] = useState('Week 1');
  const [itemTitle, setItemTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [saving, setSaving] = useState(false);

  async function addItem() {
    if (!itemTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekNumber: parseInt(weekNum, 10),
        weekTitle,
        itemTitle: itemTitle.trim(),
        type: 'PDF',
        fileUrl: fileUrl.trim() || null,
        url: fileUrl.trim() || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setWeeks((prev) => {
        const idx = prev.findIndex((w) => w.id === data.week.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], items: [...next[idx].items, data.item] };
          return next;
        }
        return [...prev, { ...data.week, items: [data.item] }];
      });
      setItemTitle('');
      setFileUrl('');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card className="border-brand/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Upload academic content
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Slides, PDFs, videos, links, and large files sync instantly to student subject pages and dashboards.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Week number" value={weekNum} onChange={(e) => setWeekNum(e.target.value)} />
          <Input placeholder="Week title" value={weekTitle} onChange={(e) => setWeekTitle(e.target.value)} />
          <Input placeholder="Material title" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="sm:col-span-2" />
          <Input placeholder="File or link URL" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="sm:col-span-2" />
          <Button onClick={() => void addItem()} disabled={saving} className="sm:col-span-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to subject content
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {weeks.length === 0 ? (
          <EmptyState iconName="book-open" title="No content yet" description="Upload your first lecture materials." className="py-12" />
        ) : (
          weeks.map((w) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{w.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {w.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <span>{item.title}</span>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export function TeacherSubjectAnnouncementsPanel({
  subjectId,
  ws,
}: {
  subjectId: string;
  ws: TeacherSubjectWorkspace;
}) {
  const [items, setItems] = useState(ws.announcements);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!title.trim() || !body.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, pushNotify: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [data.announcement, ...prev]);
      setTitle('');
      setBody('');
    }
    setPosting(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand animate-pulse" />
            Post live class update
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="min-h-[100px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            placeholder="Exam reminder, room change, clarification…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button onClick={() => void post()} disabled={posting}>
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publish to class
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className={a.pinned ? 'border-brand/30' : ''}>
            <CardContent className="py-4">
              <div className="flex items-start gap-2">
                {a.pinned ? <Pin className="h-4 w-4 text-brand shrink-0" /> : null}
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {a.publishedAt ? formatDate(a.publishedAt) : formatDate(a.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type GradebookState = {
  plan: { mode: string; scaleMax: number };
  categories: { id: string; name: string; weight: number; minGrade: number | null }[];
  weights: { total: number; valid: boolean; remaining: number };
};

export function TeacherSubjectGradebookPanel({ subjectId }: { subjectId: string }) {
  const [data, setData] = useState<GradebookState | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('10');
  const [mode, setMode] = useState<'single' | 'continuous_final'>('continuous_final');
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/teacher/subjects/${subjectId}/gradebook`);
    if (res.ok) {
      const json = await res.json();
      setData({
        plan: json.plan,
        categories: json.categories,
        weights: json.weights,
      });
      setMode(json.plan.mode);
    }
    setLoading(false);
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/gradebook`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || 'Could not save');
      return;
    }
    setData({
      plan: json.plan,
      categories: json.categories,
      weights: json.weights,
    });
    setMode(json.plan.mode);
  }

  const localWeights = useMemo(() => {
    if (!data) return { total: 0, valid: false, remaining: 100 };
    return validateCategoryWeights(data.categories.map((c) => c.weight));
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evaluation structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === 'single' ? 'default' : 'outline'}
              size="sm"
              onClick={() => void patch({ plan: { mode: 'single' } })}
            >
              Single evaluation
            </Button>
            <Button
              variant={mode === 'continuous_final' ? 'default' : 'outline'}
              size="sm"
              onClick={() => void patch({ plan: { mode: 'continuous_final' } })}
            >
              Continuous + final exam
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={Math.min(localWeights.total, 100)} className="h-2 flex-1" />
            <span
              className={cn(
                'text-sm font-medium tabular-nums',
                localWeights.valid ? 'text-emerald-600' : 'text-amber-600'
              )}
            >
              {localWeights.total}% / 100%
              {!localWeights.valid ? ` · ${localWeights.remaining}% left` : ''}
            </span>
          </div>
          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EVALUATION_COMPONENT_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted"
                onClick={() => setNewName(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Component name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="number" placeholder="Weight %" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
            <Button
              onClick={() =>
                void patch({
                  category: { name: newName.trim(), weight: parseFloat(newWeight) },
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add component
            </Button>
          </div>
          {data?.categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">
                {c.name} — {c.weight}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void patch({ deleteCategoryId: c.id })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Grade & publish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Published grades sync live to each student&apos;s gradebook and dashboard. Students only see their own results.
          </p>
          <Button asChild>
            <Link href={`/teacher/workspace?view=grading&subject=${subjectId}`}>
              Open grading workspace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function TeacherSubjectMessagesPanel({
  subjectId,
  ws,
}: {
  subjectId: string;
  ws: TeacherSubjectWorkspace;
}) {
  const [messages, setMessages] = useState(ws.messages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
      setBody('');
    }
    setSending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Class communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium text-xs text-muted-foreground">{m.author?.name}</p>
              <p className="mt-1">{m.body}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Message the class…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void send()}
          />
          <Button onClick={() => void send()} disabled={sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeacherSubjectCalendarPanel({
  subjectId,
  ws,
}: {
  subjectId: string;
  ws: TeacherSubjectWorkspace;
}) {
  const [slots, setSlots] = useState(ws.scheduleSlots);
  const [day, setDay] = useState('1');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:30');
  const [room, setRoom] = useState('');

  async function addSlot() {
    const res = await fetch(`/api/teacher/subjects/${subjectId}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek: parseInt(day, 10),
        startTime: start,
        endTime: end,
        room: room || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSlots((s) => [...s, data.slot]);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly class schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Repeats every week for the semester — syncs to student calendars automatically.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <select
            className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="Start" />
          <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="End" />
          <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" />
          <Button className="sm:col-span-4" onClick={() => void addSlot()}>
            <Plus className="h-4 w-4" />
            Add weekly slot
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {slots.map((sl) => (
          <Card key={sl.id}>
            <CardContent className="flex justify-between py-3 text-sm">
              <span>
                {DAYS[sl.dayOfWeek]} {sl.startTime}–{sl.endTime}
                {sl.room ? ` · ${sl.room}` : ''}
              </span>
              <Badge variant="outline">Weekly</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {ws.exams.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ws.exams.map((e) => (
              <p key={e.id} className="text-sm">
                {e.title} — {formatDate(e.date)}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function TeacherSubjectAttendancePanel({
  subjectId,
  ws,
}: {
  subjectId: string;
  ws: TeacherSubjectWorkspace;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const students = ws.enrollments.map((e) => ({
    id: e.studentId,
    name: e.student?.name ?? 'Student',
    attendance: e.attendance,
  }));

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const s of students) m[s.id] = 'PRESENT';
    setMarks(m);
  }, [ws.enrollments.length]);

  async function saveSession() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/attendance/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        records: students.map((s) => ({
          studentId: s.id,
          status: marks[s.id] || 'PRESENT',
        })),
      }),
    });
    setMsg(res.ok ? 'Attendance saved — synced to students & workspace' : 'Could not save');
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mark attendance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Connected with Workspace attendance — updates student dashboards and profiles live.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.attendance != null ? (
                    <p className="text-xs text-muted-foreground">{Math.round(s.attendance)}% term</p>
                  ) : null}
                </div>
                <select
                  className="h-9 rounded-lg border px-2 text-sm"
                  value={marks[s.id] || 'PRESENT'}
                  onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="EXCUSED">Excused</option>
                  <option value="LATE">Late</option>
                </select>
              </div>
            ))}
          </div>
          <Button onClick={() => void saveSession()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save session
          </Button>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ws.attendanceSessions.slice(0, 8).map((sess) => (
            <p key={sess.id} className="text-sm text-muted-foreground">
              {formatDate(sess.date)} — {sess.records.length} records
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
