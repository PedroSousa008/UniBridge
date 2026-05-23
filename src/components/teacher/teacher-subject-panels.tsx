'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Megaphone,
  Pin,
  Pencil,
  Plus,
  Radio,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  TeacherSubjectAnnouncements,
  TeacherSubjectContentWeeks,
  TeacherSubjectHomeData,
  TeacherSubjectMessages,
} from '@/lib/teacher/teacher-subject-context';
import { isPendingGradePublish } from '@/lib/teacher/teacher-grading';
import { AcademicFileUpload } from '@/components/ui/academic-file-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TeacherSubjectHomePanel({ ws }: { ws: TeacherSubjectHomeData }) {
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

type ContentItem = TeacherSubjectContentWeeks[number]['items'][number];

function ContentItemRow({
  subjectId,
  item,
  onUpdated,
  onDeleted,
}: {
  subjectId: string;
  item: ContentItem;
  onUpdated: (item: ContentItem) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [link, setLink] = useState(item.fileUrl || item.url || '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/content/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        url: link.trim() || null,
        fileUrl: link.trim() || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdated(data.item);
      setEditing(false);
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm(`Remove "${item.title}" from this class? Students will no longer see it.`)) return;
    setBusy(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/content/${item.id}`, {
      method: 'DELETE',
    });
    if (res.ok) onDeleted();
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="File or link URL" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void save()} disabled={busy}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const href = item.fileUrl || item.url;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-brand truncate block"
          >
            {item.title}
          </a>
        ) : (
          <span className="font-medium">{item.title}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline">{item.type}</Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setEditing(true)}
          disabled={busy}
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-rose-600 hover:text-rose-700"
          onClick={() => void remove()}
          disabled={busy}
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function TeacherSubjectContentPanel({
  subjectId,
  initialWeeks,
}: {
  subjectId: string;
  initialWeeks: TeacherSubjectContentWeeks;
}) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [weekNum, setWeekNum] = useState('1');
  const [weekTitle, setWeekTitle] = useState('Week 1');
  const [itemTitle, setItemTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [contentType, setContentType] = useState('PDF');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function addItem() {
    const url = fileUrl.trim() || linkUrl.trim();
    if (!itemTitle.trim()) return;
    if (!url) {
      setUploadError('Upload a file from your device or paste a link.');
      return;
    }
    setUploadError(null);
    setSaving(true);
    const res = await fetch(`/api/teacher/subjects/${subjectId}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekNumber: parseInt(weekNum, 10),
        weekTitle,
        itemTitle: itemTitle.trim(),
        type: contentType,
        fileUrl: fileUrl.trim() || url,
        url,
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
      setLinkUrl('');
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
            Upload any file size from your device. Materials stay visible to all enrolled students until you
            edit or remove them.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Week number" value={weekNum} onChange={(e) => setWeekNum(e.target.value)} />
          <Input placeholder="Week title" value={weekTitle} onChange={(e) => setWeekTitle(e.target.value)} />
          <Input placeholder="Material title" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <AcademicFileUpload
              folder={`subject-content/${subjectId}`}
              onUploaded={({ url, fileName, contentType: ct }) => {
                setFileUrl(url);
                setContentType(ct);
                if (!itemTitle.trim()) setItemTitle(fileName.replace(/\.[^.]+$/, ''));
                setUploadError(null);
              }}
            />
          </div>
          <Input
            placeholder="Or paste a link (optional if you uploaded a file)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="sm:col-span-2"
          />
          {uploadError ? <p className="text-sm text-rose-600 sm:col-span-2">{uploadError}</p> : null}
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
                  <ContentItemRow
                    key={item.id}
                    subjectId={subjectId}
                    item={item}
                    onUpdated={(updated) =>
                      setWeeks((prev) =>
                        prev.map((week) =>
                          week.id === w.id
                            ? {
                                ...week,
                                items: week.items.map((i) => (i.id === updated.id ? updated : i)),
                              }
                            : week
                        )
                      )
                    }
                    onDeleted={() =>
                      setWeeks((prev) =>
                        prev.map((week) =>
                          week.id === w.id
                            ? { ...week, items: week.items.filter((i) => i.id !== item.id) }
                            : week
                        )
                      )
                    }
                  />
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
  initialAnnouncements,
}: {
  subjectId: string;
  initialAnnouncements: TeacherSubjectAnnouncements;
}) {
  const [items, setItems] = useState(initialAnnouncements);
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

export function TeacherSubjectMessagesPanel({
  subjectId,
  initialMessages,
}: {
  subjectId: string;
  initialMessages: TeacherSubjectMessages;
}) {
  const [messages, setMessages] = useState(initialMessages);
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

export { TeacherSubjectCalendarPanel } from '@/components/teacher/teacher-subject-calendar-panel';

export { TeacherSubjectAttendancePanel } from '@/components/teacher/teacher-subject-attendance-panel';
