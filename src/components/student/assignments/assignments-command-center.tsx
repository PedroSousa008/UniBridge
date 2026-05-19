'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Link2,
  Loader2,
  Paperclip,
  Search,
  Send,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  filterAssignmentsByView,
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  type AssignmentViewFilter,
  type StudentAssignmentCard,
} from '@/lib/student/student-assignments';

interface AssignmentsHub {
  assignments: StudentAssignmentCard[];
  notifications: { id: string; assignmentId: string; title: string; message: string; severity: string }[];
  dbReady: boolean;
}

const VIEWS: { id: AssignmentViewFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'missing', label: 'Missing/Late' },
  { id: 'completed', label: 'Completed' },
];

export function AssignmentsCommandCenter({
  userId,
  initialHub,
}: {
  userId: string;
  initialHub: AssignmentsHub;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hub, setHub] = useState(initialHub);
  const [view, setView] = useState<AssignmentViewFilter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StudentAssignmentCard | null>(null);
  const [syncPending, setSyncPending] = useState(!initialHub.dbReady);
  const [submitting, setSubmitting] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [comment, setComment] = useState('');
  const [groupComment, setGroupComment] = useState('');
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const id = searchParams.get('assignment');
    if (!id) return;
    const found = hub.assignments.find((a) => a.id === id);
    if (found) setSelected(found);
  }, [searchParams, hub.assignments]);

  useEffect(() => {
    if (!syncPending) return;
    fetch('/api/student/assignments')
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((data) => {
        if (data?.assignments) {
          setHub(data);
          setSyncPending(false);
          router.refresh();
        }
      });
  }, [syncPending, router]);

  const filtered = useMemo(() => {
    let list = filterAssignmentsByView(hub.assignments, view);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subject.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [hub.assignments, view, search]);

  const stats = useMemo(() => {
    const a = hub.assignments;
    return {
      total: a.length,
      inProgress: a.filter((x) => x.status === 'IN_PROGRESS').length,
      dueSoon: a.filter(
        (x) =>
          x.countdown.includes('tomorrow') ||
          x.countdown.includes('Due in') ||
          x.countdown === 'Due soon'
      ).length,
      late: a.filter((x) => x.status === 'LATE').length,
    };
  }, [hub.assignments]);

  const updateAssignment = (updated: StudentAssignmentCard | undefined) => {
    if (!updated) return;
    setHub((h) => ({
      ...h,
      assignments: h.assignments.map((a) => (a.id === updated.id ? updated : a)),
    }));
    setSelected(updated);
  };

  const setProgress = async (id: string, progressPercent: number) => {
    const res = await fetch(`/api/student/assignments/${id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressPercent, started: true }),
    });
    if (res.ok) {
      const { assignment } = await res.json();
      updateAssignment(assignment);
    }
  };

  const submitWork = async () => {
    if (!selected) return;
    setSubmitting(true);
    const res = await fetch(`/api/student/assignments/${selected.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkUrl, comment, fileUrls: [] }),
    });
    if (res.ok) {
      const { assignment } = await res.json();
      updateAssignment(assignment);
      setLinkUrl('');
      setComment('');
    }
    setSubmitting(false);
  };

  const postGroup = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    const res = await fetch(`/api/student/assignments/${selected.id}/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    if (res.ok) {
      const { assignment } = await res.json();
      updateAssignment(assignment);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        subtitle="Your academic work execution workspace — plan, collaborate, and submit."
      />

      {syncPending && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Setting up assignment storage… Refresh shortly or run npm run db:push.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">In progress</p>
            <p className="text-2xl font-semibold">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Due soon</p>
            <p className="text-2xl font-semibold text-amber-600">{stats.dueSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Late</p>
            <p className="text-2xl font-semibold text-red-600">{stats.late}</p>
          </CardContent>
        </Card>
      </div>

      {hub.notifications.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" /> Smart notifications
            </p>
            {hub.notifications.slice(0, 4).map((n) => (
              <button
                key={n.id}
                type="button"
                className="block w-full text-left text-sm rounded-lg border px-3 py-2 hover:bg-muted/50"
                onClick={() => {
                  const a = hub.assignments.find((x) => x.id === n.assignmentId);
                  if (a) setSelected(a);
                }}
              >
                <span className="font-medium">{n.title}</span>
                <span className="text-muted-foreground"> — {n.message}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

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
          <Button size="sm" variant="ghost" disabled title="Coming soon">
            <Layers className="h-3 w-3 mr-1" />
            Kanban
          </Button>
        </div>
        <Input
          placeholder="Search assignments…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">No assignments in this view.</p>
        ) : (
          filtered.map((a) => (
            <Card
              key={a.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(a)}
            >
              <CardContent className="py-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold leading-tight">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.subject.name}</p>
                  </div>
                  <Badge className={cn('shrink-0', PRIORITY_STYLES[a.priority].className)}>
                    {PRIORITY_STYLES[a.priority].label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge className={STATUS_STYLES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                  {a.isGroup ? (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Group
                    </Badge>
                  ) : (
                    <Badge variant="outline">Individual</Badge>
                  )}
                  {a.attachmentCount > 0 && (
                    <Badge variant="outline">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {a.attachmentCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-primary font-medium">{a.countdown}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(a.dueDate), 'PPp')}
                </p>
                {a.professor && (
                  <p className="text-xs text-muted-foreground">{a.professor}</p>
                )}
                <Progress value={a.progressPercent} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{a.progressPercent}% complete</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.subject.name} · {selected.weightPercent}% of grade
                </p>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <Badge className={STATUS_STYLES[selected.status]}>
                  {STATUS_LABELS[selected.status]}
                </Badge>
                <Badge className={PRIORITY_STYLES[selected.priority].className}>
                  {PRIORITY_STYLES[selected.priority].label}
                </Badge>
              </div>

              <section className="text-sm space-y-1">
                <p>
                  <strong>Deadline:</strong> {format(parseISO(selected.dueDate), 'PPpp')}
                </p>
                {selected.allowedFormats.length > 0 && (
                  <p>
                    <strong>Allowed formats:</strong> {selected.allowedFormats.join(', ')}
                  </p>
                )}
              </section>

              {selected.instructions && (
                <section>
                  <h3 className="text-sm font-medium mb-1">Instructions</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selected.instructions}
                  </p>
                </section>
              )}

              {selected.rubric && (
                <section>
                  <h3 className="text-sm font-medium mb-1">Grading rubric</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selected.rubric}
                  </p>
                </section>
              )}

              {(selected.attachments.length > 0 || selected.links.length > 0) && (
                <section>
                  <h3 className="text-sm font-medium mb-2">Materials</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selected.attachments.map((f) => (
                      <a
                        key={f.id}
                        href={f.fileUrl || f.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted/50"
                      >
                        <FileText className="h-4 w-4" />
                        {f.title}
                      </a>
                    ))}
                    {selected.links.map((l, i) => (
                      <a
                        key={i}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted/50"
                      >
                        <Link2 className="h-4 w-4" />
                        {l.title}
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-medium mb-2">Progress timeline</h3>
                <div className="space-y-2">
                  {selected.timeline.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2
                        className={cn('h-4 w-4', step.done ? 'text-emerald-600' : 'text-muted-foreground')}
                      />
                      <span className={step.done ? '' : 'text-muted-foreground'}>{step.label}</span>
                    </div>
                  ))}
                </div>
                {selected.status !== 'GRADED' && selected.status !== 'SUBMITTED' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => setProgress(selected.id, 25)}>
                      Start (25%)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setProgress(selected.id, 75)}>
                      Draft (75%)
                    </Button>
                  </div>
                )}
              </section>

              {selected.isGroup && (
                <section className="rounded-lg border p-4 space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Group workspace
                  </h3>
                  {!selected.group ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        postGroup('comment', { body: 'Joined the group.', groupName: 'Team' })
                      }
                    >
                      Join / create group
                    </Button>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Members:{' '}
                        {selected.group.members.map((m) => m.name ?? 'Student').join(', ')}
                      </p>
                      <ul className="space-y-1 text-sm">
                        {selected.group.tasks.map((t) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={() =>
                                postGroup('toggle_task', { taskId: t.id })
                              }
                            />
                            {t.title}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <Input
                          placeholder="New task…"
                          value={newTask}
                          onChange={(e) => setNewTask(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            postGroup('task', { title: newTask });
                            setNewTask('');
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Group comment…"
                          value={groupComment}
                          onChange={(e) => setGroupComment(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            postGroup('comment', { body: groupComment });
                            setGroupComment('');
                          }}
                        >
                          Post
                        </Button>
                      </div>
                      {selected.group.comments.slice(0, 5).map((c) => (
                        <p key={c.id} className="text-xs border-l-2 pl-2 text-muted-foreground">
                          <strong>{c.studentName}:</strong> {c.body}
                        </p>
                      ))}
                    </>
                  )}
                </section>
              )}

              {selected.status !== 'GRADED' && (
                <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h3 className="text-sm font-medium">Submission</h3>
                  <Input
                    placeholder="Paste link (Google Docs, Drive, etc.)"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                  <textarea
                    className="w-full min-h-[80px] rounded-md border px-3 py-2 text-sm"
                    placeholder="Comments for your professor…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <Button onClick={submitWork} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit assignment
                      </>
                    )}
                  </Button>
                  {selected.submittedAt && (
                    <p className="text-xs text-emerald-600">
                      Submitted {format(parseISO(selected.submittedAt), 'PPp')}
                    </p>
                  )}
                </section>
              )}

              {selected.score != null && (
                <p className="text-sm font-medium">
                  Grade: {selected.score}/{selected.maxScore}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/student/academics/calendar">
                    <Calendar className="h-3 w-3 mr-1" />
                    Calendar
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/student/academics/subjects/${selected.subject.id}`}>
                    Subject
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
