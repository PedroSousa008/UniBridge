'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  StickyNote,
  Target,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  buildExamAiInsights,
  PRIORITY_STYLES,
  type ExamViewMode,
  type StudentExamCard,
} from '@/lib/student/student-exams';
import {
  createLocalExamId,
  isLocalExamId,
  loadLocalExams,
  saveLocalExam,
} from '@/lib/student/exams-local-storage';
import { calculateExamPriority, examCountdown } from '@/lib/student/student-exams';

interface SubjectOption {
  id: string;
  name: string;
  code: string | null;
}

interface ExamsCommandCenterProps {
  userId: string;
  initialExams: StudentExamCard[];
  subjects: SubjectOption[];
  dbSyncNeeded?: boolean;
}

const VIEWS: { id: ExamViewMode; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'completed', label: 'Completed' },
];

function mergeExams(server: StudentExamCard[], local: StudentExamCard[]) {
  const ids = new Set(server.map((e) => e.id));
  return [...server, ...local.filter((e) => !ids.has(e.id))].sort((a, b) =>
    a.startAt.localeCompare(b.startAt)
  );
}

function formatTimeRange(start: string, end: string) {
  return `${format(parseISO(start), 'HH:mm')} – ${format(parseISO(end), 'HH:mm')}`;
}

export function ExamsCommandCenter({
  userId,
  initialExams,
  subjects,
  dbSyncNeeded = false,
}: ExamsCommandCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exams, setExams] = useState(() => mergeExams(initialExams, loadLocalExams(userId)));
  const [view, setView] = useState<ExamViewMode>('upcoming');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StudentExamCard | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [syncPending, setSyncPending] = useState(dbSyncNeeded);
  const [syncing, setSyncing] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    building: '',
    room: '',
    professor: '',
  });

  useEffect(() => {
    setExams(mergeExams(initialExams, loadLocalExams(userId)));
  }, [initialExams, userId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!syncPending) return;
    let cancelled = false;
    setSyncing(true);
    fetch('/api/student/exams')
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setSyncPending(false);
          router.refresh();
        }
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [syncPending, router]);

  useEffect(() => {
    const id = searchParams.get('exam');
    if (!id) return;
    const found = exams.find((e) => e.id === id);
    if (found) setSelected(found);
  }, [searchParams, exams]);

  const filtered = useMemo(() => {
    let list = exams;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subject?.name.toLowerCase().includes(q) ||
          e.subject?.code?.toLowerCase().includes(q)
      );
    }
    if (view === 'completed') return list.filter((e) => e.isCompleted);
    if (view === 'upcoming') return list.filter((e) => !e.isCompleted);
    return list.filter((e) => !e.isCompleted);
  }, [exams, search, view]);

  const upcomingCount = exams.filter((e) => !e.isCompleted).length;
  const criticalCount = exams.filter((e) => !e.isCompleted && e.priority === 'CRITICAL').length;

  const refresh = useCallback(() => router.refresh(), [router]);

  const persistLocal = (exam: StudentExamCard) => {
    saveLocalExam(userId, exam);
    setExams((prev) => {
      const next = prev.filter((e) => e.id !== exam.id);
      next.push(exam);
      return next.sort((a, b) => a.startAt.localeCompare(b.startAt));
    });
  };

  const handleAddExam = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    const dateStr = form.date || format(new Date(), 'yyyy-MM-dd');
    const startAt = new Date(`${dateStr}T${form.startTime}:00`);
    const endAt = new Date(`${dateStr}T${form.endTime}:00`);
    setSaving(true);

    try {
      const res = await fetch('/api/student/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          subjectId: form.subjectId || null,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          building: form.building || null,
          room: form.room || null,
          professor: form.professor || null,
        }),
      });
      if (res.status === 503) {
        const id = createLocalExamId();
        const card: StudentExamCard = {
          id,
          title: form.title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          subject: subjects.find((s) => s.id === form.subjectId) ?? null,
          professor: form.professor || null,
          building: form.building || null,
          room: form.room || null,
          seatNumber: null,
          onlineUrl: null,
          location: null,
          countdown: examCountdown(startAt),
          priority: calculateExamPriority(startAt, 0, 3, 1, 5),
          prepPercent: 0,
          lecturesDone: 0,
          workshopsDone: 0,
          documentsDone: 0,
          revisionsDone: 0,
          attendancePercent: null,
          classAverage: null,
          gradeTrend: null,
          difficulty: 3,
          weight: 1,
          contentVolume: 5,
          maxScore: 100,
          createdById: userId,
          canEdit: true,
          isCompleted: false,
          includedContent: [],
          officialAttachments: [],
          personalAttachments: [],
          personalResources: [],
          personalNotes: null,
          description: null,
        };
        persistLocal(card);
        setAddOpen(false);
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Could not save exam');
        return;
      }
      const { exam } = await res.json();
      if (exam) setExams((prev) => mergeExams([...prev.filter((e) => e.id !== exam.id), exam], loadLocalExams(userId)));
      setAddOpen(false);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleContent = async (exam: StudentExamCard, contentId: string) => {
    const checklist: Record<string, boolean> = {};
    for (const c of exam.includedContent) {
      checklist[c.id] = c.id === contentId ? !c.done : c.done;
    }
    if (isLocalExamId(exam.id)) {
      const done = Object.values(checklist).filter(Boolean).length;
      const total = exam.includedContent.length || 1;
      const updated = {
        ...exam,
        includedContent: exam.includedContent.map((c) => ({
          ...c,
          done: !!checklist[c.id],
        })),
        prepPercent: Math.round((done / total) * 100),
      };
      persistLocal(updated);
      setSelected(updated);
      return;
    }
    const res = await fetch(`/api/student/exams/${exam.id}/preparation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist }),
    });
    if (res.ok) {
      const { exam: updated } = await res.json();
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setSelected(updated);
    }
  };

  const ai = selected ? buildExamAiInsights(selected) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams"
        subtitle="Your command center for exam preparation — planning, revision, and performance."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add exam
          </Button>
        }
      />

      {syncPending && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {syncing
            ? 'Setting up exam storage in your database…'
            : 'Exam storage is not ready yet — new exams are saved only in this browser for now. Refresh in a moment, or ask your admin to run npm run db:push once on the project.'}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Upcoming</p>
          <p className="text-2xl font-semibold">{upcomingCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Critical priority</p>
          <p className="text-2xl font-semibold text-red-600">{criticalCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg. preparation</p>
          <p className="text-2xl font-semibold">
            {upcomingCount
              ? Math.round(
                  exams.filter((e) => !e.isCompleted).reduce((s, e) => s + e.prepPercent, 0) /
                    upcomingCount
                )
              : 0}
            %
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={view === v.id ? 'default' : 'outline'}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <div className="relative max-w-xs w-full">
          <Input
            placeholder="Search exams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
      </div>

      {view === 'calendar' && (
        <CalendarGrid exams={filtered} onSelect={setSelected} />
      )}

      {view === 'timeline' && (
        <TimelineView exams={filtered} onSelect={setSelected} now={now} />
      )}

      {(view === 'upcoming' || view === 'completed') && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <p className="col-span-full text-sm text-muted-foreground">No exams in this view.</p>
          ) : (
            filtered.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                now={now}
                onOpen={() => setSelected(exam)}
              />
            ))
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.subject?.name ?? 'Personal exam'}
                  {selected.subject?.code ? ` · ${selected.subject.code}` : ''}
                </p>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <Badge className={PRIORITY_STYLES[selected.priority].className}>
                  {PRIORITY_STYLES[selected.priority].label}
                </Badge>
                <Badge variant="outline">{examCountdown(parseISO(selected.startAt), now)}</Badge>
                {!selected.canEdit && (
                  <Badge variant="secondary">Official · view only</Badge>
                )}
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {format(parseISO(selected.startAt), 'PPP')} ·{' '}
                  {formatTimeRange(selected.startAt, selected.endAt)}
                </p>
                {selected.professor && <p>Professor: {selected.professor}</p>}
                {(selected.building || selected.room) && (
                  <p>
                    <MapPin className="mr-1 inline h-3.5 w-3.5" />
                    {[selected.building, selected.room].filter(Boolean).join(' · ')}
                  </p>
                )}
                {selected.seatNumber && <p>Seat: {selected.seatNumber}</p>}
                {selected.onlineUrl && (
                  <a
                    href={selected.onlineUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex items-center gap-1"
                  >
                    Online exam <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{selected.prepPercent}% prepared</span>
                  <span className="text-muted-foreground">
                    {selected.lecturesDone} lectures · {selected.workshopsDone} workshops ·{' '}
                    {selected.documentsDone} docs · {selected.revisionsDone} revisions
                  </span>
                </div>
                <Progress value={selected.prepPercent} />
              </div>

              {ai && (
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="flex items-center gap-2 font-medium text-sm">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    AI preparation assistant
                  </p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {ai.messages.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section>
                <h3 className="mb-2 font-medium text-sm">Official content (teacher)</h3>
                {selected.includedContent.filter((c) => c.isOfficial).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No official scope listed yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.includedContent
                      .filter((c) => c.isOfficial)
                      .map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-sm">
                          <button
                            type="button"
                            onClick={() => toggleContent(selected, c.id)}
                            className={cn(
                              'rounded border p-0.5',
                              c.done && 'bg-primary text-primary-foreground'
                            )}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <span className={c.done ? 'line-through text-muted-foreground' : ''}>
                            [{c.kind}] {c.label}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-2 font-medium text-sm">Your study materials</h3>
                {selected.includedContent.filter((c) => !c.isOfficial).length === 0 &&
                selected.personalResources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Add personal notes and links in resources.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selected.personalResources.map((r) => (
                      <li key={r.id}>
                        {r.kind}: {r.title}
                        {r.url && (
                          <a href={r.url} className="ml-1 text-primary" target="_blank" rel="noreferrer">
                            Open
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-2 font-medium text-sm">Study resources & attachments</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selected.officialAttachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url || a.fileUrl || '#'}
                      className="rounded-lg border p-2 text-sm hover:bg-muted/50"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText className="mb-1 h-4 w-4" />
                      {a.title} <span className="text-xs text-muted-foreground">(official)</span>
                    </a>
                  ))}
                  {selected.personalAttachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url || a.fileUrl || '#'}
                      className="rounded-lg border p-2 text-sm hover:bg-muted/50"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.title} <span className="text-xs text-muted-foreground">(private)</span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Class average</p>
                  <p className="font-medium">{selected.classAverage ?? '—'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Your grade trend</p>
                  <p className="font-medium">{selected.gradeTrend ?? '—'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="font-medium">
                    {selected.attendancePercent != null ? `${Math.round(selected.attendancePercent)}%` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Est. preparation</p>
                  <p className="font-medium">{selected.prepPercent}%</p>
                </div>
              </section>

              <div className="flex flex-wrap gap-2 pt-2">
                {selected.canEdit && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/student/academics/calendar`}>Edit in calendar</Link>
                  </Button>
                )}
                {selected.subject && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/student/academics/subjects/${selected.subject.id}`}>
                        <BookOpen className="mr-1 h-3.5 w-3.5" />
                        Subject
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/student/academics/subjects/${selected.subject.id}/content`}>
                        Materials
                      </Link>
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href="/student/academics/calendar">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    Calendar
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link
                    href={
                      selected.subject
                        ? `/student/academics/subjects/${selected.subject.id}/content`
                        : '/student/academics/calendar'
                    }
                  >
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Start study session
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Exam title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">No subject (personal)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Building"
              value={form.building}
              onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
            />
            <Input
              placeholder="Room"
              value={form.room}
              onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={handleAddExam} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save exam'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExamCard({
  exam,
  now,
  onOpen,
}: {
  exam: StudentExamCard;
  now: Date;
  onOpen: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{exam.title}</p>
          <p className="text-xs text-muted-foreground">
            {exam.subject?.name ?? 'Personal'}
            {exam.subject?.code ? ` · ${exam.subject.code}` : ''}
          </p>
        </div>
        <Badge className={cn('shrink-0', PRIORITY_STYLES[exam.priority].className)}>
          {PRIORITY_STYLES[exam.priority].label}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mb-2">
        {format(parseISO(exam.startAt), 'EEE, MMM d')} · {formatTimeRange(exam.startAt, exam.endAt)}
      </p>
      <p className="text-sm font-medium text-primary mb-2">
        {examCountdown(parseISO(exam.startAt), now)}
      </p>

      {(exam.building || exam.room) && (
        <p className="text-xs text-muted-foreground mb-1">
          <MapPin className="inline h-3 w-3 mr-0.5" />
          {[exam.building, exam.room].filter(Boolean).join(' · ')}
          {exam.seatNumber ? ` · Seat ${exam.seatNumber}` : ''}
        </p>
      )}
      {exam.professor && (
        <p className="text-xs text-muted-foreground mb-2">{exam.professor}</p>
      )}

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span>{exam.prepPercent}% prepared</span>
          {exam.attendancePercent != null && (
            <span>{Math.round(exam.attendancePercent)}% attendance</span>
          )}
        </div>
        <Progress value={exam.prepPercent} className="h-1.5" />
      </div>

      <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
        {exam.subject && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
            <Link href={`/student/academics/subjects/${exam.subject.id}/content`}>Materials</Link>
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
          <Link href="/student/academics/calendar">Calendar</Link>
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onOpen}>
          <StickyNote className="h-3 w-3 mr-1" />
          Hub
        </Button>
      </div>
    </div>
  );
}

function CalendarGrid({
  exams,
  onSelect,
}: {
  exams: StudentExamCard[];
  onSelect: (e: StudentExamCard) => void;
}) {
  const monthStart = startOfMonth(new Date());
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) });

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50 text-center text-xs font-medium py-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const dayExams = exams.filter((e) => isSameDay(parseISO(e.startAt), day));
          return (
            <div
              key={day.toISOString()}
              className="min-h-[72px] bg-background p-1 text-xs"
            >
              <span className="text-muted-foreground">{format(day, 'd')}</span>
              {dayExams.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onSelect(e)}
                  className="mt-0.5 block w-full truncate rounded bg-red-100 px-1 py-0.5 text-left text-[10px] text-red-900 dark:bg-red-950 dark:text-red-100"
                >
                  {e.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({
  exams,
  onSelect,
  now,
}: {
  exams: StudentExamCard[];
  onSelect: (e: StudentExamCard) => void;
  now: Date;
}) {
  const sorted = [...exams].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return (
    <div className="relative border-l-2 border-primary/30 ml-4 space-y-6 py-2">
      {sorted.map((exam) => (
        <div key={exam.id} className="relative pl-6">
          <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
          <button
            type="button"
            onClick={() => onSelect(exam)}
            className="w-full rounded-lg border p-4 text-left hover:bg-muted/40"
          >
            <p className="text-xs text-primary font-medium">{examCountdown(parseISO(exam.startAt), now)}</p>
            <p className="font-semibold">{exam.title}</p>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(exam.startAt), 'PPP')} · {exam.subject?.name}
            </p>
            <Progress value={exam.prepPercent} className="mt-2 h-1" />
          </button>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground pl-6">No exams on the timeline.</p>
      )}
    </div>
  );
}
