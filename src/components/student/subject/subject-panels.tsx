'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Megaphone,
  Pin,
  Search,
  Send,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import type { SubjectWorkspace } from '@/lib/student/subject-context';
import { extractMessageMeta, searchMessages } from '@/lib/student/student-messages';
import {
  attendanceSummary,
  buildGradeRows,
  computeWeightedAverage,
  projectFinalGrade,
} from '@/lib/student/subject-grades';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(d: Date | string) {
  return new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function SubjectHomePanel({ ws }: { ws: SubjectWorkspace }) {
  const now = new Date();
  const upcomingAssignments = ws.assignments
    .filter((a) => new Date(a.dueDate) >= now)
    .slice(0, 5);
  const upcomingExams = ws.exams.filter((e) => new Date(e.date) >= now).slice(0, 3);
  const latestAnnouncement = ws.announcements[0];
  const recentFiles = ws.contentWeeks
    .flatMap((w) => w.items.map((i) => ({ ...i, weekTitle: w.title })))
    .slice(-4)
    .reverse();
  const att = attendanceSummary(ws.attendanceSessions, ws.enrollment.attendance);
  const gradeRows = buildGradeRows(ws);
  const average = computeWeightedAverage(
    gradeRows,
    ws.gradeCategories.map((c) => ({ name: c.name, weight: c.weight }))
  );

  const nextClass = ws.scheduleSlots[0];
  const dayName = nextClass ? DAYS[nextClass.dayOfWeek] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Next class</CardTitle>
          </CardHeader>
          <CardContent>
            {nextClass ? (
              <>
                <p className="text-lg font-semibold">{dayName}</p>
                <p className="text-sm text-muted-foreground">
                  {nextClass.startTime}–{nextClass.endTime}
                  {nextClass.room ? ` · ${nextClass.room}` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No schedule set</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Grade average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{average != null ? average : '—'}</p>
            <p className="text-xs text-muted-foreground">out of 20</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{att.pct != null ? `${att.pct}%` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">To do</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{upcomingAssignments.length}</p>
            <p className="text-xs text-muted-foreground">upcoming deadlines</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Next up
          </h2>
          <div className="space-y-2">
            {upcomingAssignments.length === 0 && upcomingExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing due soon.</p>
            ) : null}
            {upcomingAssignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Clock className="h-4 w-4 text-brand shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(a.dueDate)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {upcomingExams.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Calendar className="h-4 w-4 text-brand shrink-0" />
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Latest announcement
          </h2>
          {latestAnnouncement ? (
            <Card>
              <CardContent className="pt-4">
                {latestAnnouncement.pinned ? (
                  <Pin className="mb-2 h-4 w-4 text-brand" />
                ) : null}
                <p className="font-medium">{latestAnnouncement.title}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {latestAnnouncement.body}
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </section>
      </div>

      {recentFiles.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent files
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {recentFiles.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <FileText className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.weekTitle}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/student/academics/subjects/${ws.subject.id}/content`}>Content</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/student/academics/subjects/${ws.subject.id}/gradebook`}>Gradebook</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/student/academics/subjects/${ws.subject.id}/messages`}>Messages</Link>
        </Button>
      </div>
    </div>
  );
}

export function SubjectContentPanel({
  ws,
  subjectId,
}: {
  ws: SubjectWorkspace;
  subjectId: string;
}) {
  const [search, setSearch] = useState('');
  const [expandedWeek, setExpandedWeek] = useState<number | null>(
    ws.contentWeeks[0]?.weekNumber ?? null
  );
  const [notes, setNotes] = useState<Record<string, string>>(ws.contentNotes);

  const filteredWeeks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ws.contentWeeks;
    return ws.contentWeeks
      .map((w) => ({
        ...w,
        items: w.items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            (i.description?.toLowerCase().includes(q) ?? false)
        ),
      }))
      .filter((w) => w.title.toLowerCase().includes(q) || w.items.length > 0);
  }, [ws.contentWeeks, search]);

  async function saveNote(itemId: string, note: string) {
    setNotes((prev) => ({ ...prev, [itemId]: note }));
    await fetch(`/api/student/subjects/${subjectId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, note }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search content, topics, materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" disabled>
          <Download className="h-4 w-4" />
          Download all
        </Button>
      </div>

      {filteredWeeks.length === 0 ? (
        <EmptyState
          iconName="folder-kanban"
          title="No content yet"
          description="Your professor will upload weekly materials here (slides, PDFs, videos, exercises)."
          className="py-16"
        />
      ) : (
        filteredWeeks.map((week) => (
          <Card key={week.id}>
            <button
              type="button"
              className="w-full text-left"
              onClick={() =>
                setExpandedWeek(expandedWeek === week.weekNumber ? null : week.weekNumber)
              }
            >
              <CardHeader>
                <CardTitle className="text-base">
                  Week {week.weekNumber} — {week.title}
                </CardTitle>
              </CardHeader>
            </button>
            {expandedWeek === week.weekNumber ? (
              <CardContent className="space-y-3 border-t border-border/60 pt-4">
                {week.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items this week.</p>
                ) : (
                  week.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                        </div>
                        <div className="flex gap-2">
                          {item.examPriority ? (
                            <Badge variant="brand">
                              <Star className="mr-1 h-3 w-3" />
                              Exam priority
                            </Badge>
                          ) : null}
                          {(item.url || item.fileUrl) && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={item.url || item.fileUrl || '#'} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      {item.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                      ) : null}
                      <textarea
                        className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        placeholder="Your personal notes…"
                        rows={2}
                        defaultValue={notes[item.id] ?? ''}
                        onBlur={(e) => saveNote(item.id, e.target.value)}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}

export function SubjectAnnouncementsPanel({ ws }: { ws: SubjectWorkspace }) {
  return (
    <div className="space-y-4">
      {ws.announcements.length === 0 ? (
        <EmptyState
          iconName="book-open"
          title="No announcements"
          description="Class updates from your professor will appear here."
          className="py-16"
        />
      ) : (
        ws.announcements.map((a) => (
          <Card key={a.id} className={a.pinned ? 'border-brand/40' : ''}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {a.pinned ? <Pin className="h-4 w-4 text-brand" /> : null}
                <CardTitle className="text-base">{a.title}</CardTitle>
                <Badge variant={a.priority === 'high' ? 'brand' : 'secondary'}>{a.priority}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {a.author.name} ·{' '}
                {a.publishedAt ? formatDate(a.publishedAt) : formatDate(a.createdAt)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export function SubjectGradebookPanel({ ws }: { ws: SubjectWorkspace }) {
  const rows = buildGradeRows(ws);
  const categories = ws.gradeCategories.map((c) => ({ name: c.name, weight: c.weight }));
  const average = computeWeightedAverage(rows, categories);
  const missing = rows.filter((r) => !r.submitted && new Date(r.dueDate) < new Date());

  const [whatIfId, setWhatIfId] = useState(rows[0]?.id ?? '');
  const [whatIfScore, setWhatIfScore] = useState('16');
  const whatIfRow = rows.find((r) => r.id === whatIfId);
  const projected =
    whatIfRow && average != null
      ? projectFinalGrade(average, rows, {
          assignmentId: whatIfId,
          score: parseFloat(whatIfScore) || 0,
          maxScore: whatIfRow.maxScore,
        })
      : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-brand/20"
              style={{
                borderTopColor: average != null ? 'hsl(var(--brand))' : undefined,
              }}
            >
              <span className="text-4xl font-bold">{average ?? '—'}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Current average / 20</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              What-if simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <select
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
              value={whatIfId}
              onChange={(e) => setWhatIfId(e.target.value)}
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
            <Input
              type="number"
              className="w-24"
              value={whatIfScore}
              onChange={(e) => setWhatIfScore(e.target.value)}
              placeholder="Score"
            />
            <p className="self-center text-sm">
              {projected != null ? (
                <>
                  Projected final: <strong>{projected}</strong> / 20
                </>
              ) : (
                'Add grades to simulate'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weighted categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span>{c.weight}%</span>
                </div>
                <Progress value={c.weight} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {missing.length > 0 ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm">{missing.length} missing assignment(s)</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {rows.length === 0 ? (
          <EmptyState
            iconName="award"
            title="No grades yet"
            description="Assignments and scores from your professor will show here."
            className="py-12"
          />
        ) : (
          rows.map((r) => {
            const pct = r.score != null ? (r.score / r.maxScore) * 100 : 0;
            return (
              <Card key={r.id}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.categoryName}</p>
                    </div>
                    <p className="text-lg font-semibold">
                      {r.score != null ? `${r.score}/${r.maxScore}` : '—'}
                    </p>
                  </div>
                  <Progress value={pct} className="mt-3 h-2" />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Button variant="outline" size="sm" asChild>
        <Link href="/student/academics/gradebook">View full Academics gradebook</Link>
      </Button>
    </div>
  );
}

export function SubjectMessagesPanel({
  ws,
  subjectId,
  userId,
}: {
  ws: SubjectWorkspace;
  subjectId: string;
  userId: string;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState(ws.messages);

  useEffect(() => {
    fetch('/api/student/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjectId }),
    }).catch(() => {});
  }, [subjectId]);

  const searchHits = useMemo(
    () => (search.trim() ? searchMessages(messages, search) : []),
    [messages, search]
  );
  const hitIds = useMemo(() => new Set(searchHits.map((h) => h.id)), [searchHits]);
  const displayMessages = search.trim()
    ? messages.filter((m) => hitIds.has(m.id))
    : messages;

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/student/subjects/${subjectId}/messages`, {
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

  function highlightBody(text: string) {
    if (!search.trim()) return text;
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let result = text;
    for (const term of terms) {
      if (term.length < 2 || ['file', 'files', 'link', 'links'].includes(term)) continue;
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      result = result.replace(re, '«$1»');
    }
    return result;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Class chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages, links, files, keywords…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {search.trim() && (
            <p className="mb-3 text-xs text-muted-foreground">
              {searchHits.length} result{searchHits.length === 1 ? '' : 's'}
              {searchHits.some((h) => h.hasFile) ? ' · includes files' : ''}
              {searchHits.some((h) => h.hasLink) ? ' · includes links' : ''}
            </p>
          )}
          <div className="mb-4 max-h-[400px] space-y-3 overflow-y-auto">
            {displayMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {search.trim() ? 'No messages match your search.' : 'Start the conversation.'}
              </p>
            ) : (
              displayMessages.map((m) => {
                const meta = extractMessageMeta(m.body);
                return (
                  <div
                    key={m.id}
                    id={`msg-${m.id}`}
                    className={`rounded-xl p-3 text-sm ${
                      m.authorId === userId ? 'ml-8 bg-brand/10' : 'mr-8 bg-muted/50'
                    } ${search.trim() && hitIds.has(m.id) ? 'ring-1 ring-brand/30' : ''}`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {m.author.name}
                    </p>
                    <p className="whitespace-pre-wrap">{highlightBody(m.body)}</p>
                    {(meta.hasLink || meta.hasFile) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {meta.hasLink && (
                          <Badge variant="secondary" className="text-[10px]">
                            link
                          </Badge>
                        )}
                        {meta.hasFile && (
                          <Badge variant="secondary" className="text-[10px]">
                            file
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Message your class…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <Button onClick={send} disabled={sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="rounded-lg bg-foreground text-background px-3 py-2">Class chat</p>
          <p className="text-muted-foreground px-3 py-2">Direct messages (soon)</p>
          <p className="text-muted-foreground px-3 py-2">Study groups (soon)</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubjectCalendarPanel({ ws }: { ws: SubjectWorkspace }) {
  const events = [
    ...ws.assignments.map((a) => ({
      id: `a-${a.id}`,
      title: a.title,
      date: a.dueDate,
      type: 'Assignment',
    })),
    ...ws.exams.map((e) => ({
      id: `e-${e.id}`,
      title: e.title,
      date: e.date,
      type: 'Exam',
    })),
    ...ws.universityEvents.map((e) => ({
      id: `u-${e.id}`,
      title: e.title,
      date: e.startDate,
      type: e.eventType,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ws.scheduleSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No class times set.</p>
          ) : (
            ws.scheduleSlots.map((s) => (
              <p key={s.id} className="text-sm">
                <strong>{DAYS[s.dayOfWeek]}</strong> {s.startTime}–{s.endTime}
                {s.label ? ` · ${s.label}` : ''}
                {s.room ? ` · ${s.room}` : ''}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      {ws.officeHours.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Office hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {ws.officeHours.map((o) => (
              <p key={o.id}>
                {DAYS[o.dayOfWeek]} {o.startTime}–{o.endTime}
                {o.location ? ` · ${o.location}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold">All events & deadlines</h2>
        {events.length === 0 ? (
          <EmptyState
            iconName="book-open"
            title="Calendar is clear"
            description="Exams, assignments, and university events will appear here."
            className="py-12"
          />
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Calendar className="h-4 w-4 text-brand shrink-0" />
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.type} · {formatDate(e.date)} {formatTime(e.date)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function SubjectAttendancePanel({ ws }: { ws: SubjectWorkspace }) {
  const att = attendanceSummary(ws.attendanceSessions, ws.enrollment.attendance);
  const streak = att.present;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-4xl font-bold text-brand">{att.pct ?? '—'}%</p>
            <p className="text-sm text-muted-foreground">Attendance rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-4xl font-bold">{att.absent}</p>
            <p className="text-sm text-muted-foreground">Absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-4xl font-bold">{streak}</p>
            <p className="text-sm text-muted-foreground">Classes attended</p>
          </CardContent>
        </Card>
      </div>

      {att.pct != null && att.pct < 75 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex gap-3 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm">Attendance is below 75%. This may affect your final grade.</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ws.attendanceSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
          ) : (
            ws.attendanceSessions.map((s) => {
              const rec = s.records[0];
              const status = rec?.status ?? 'ABSENT';
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <span>{formatDate(s.date)}</span>
                  <Badge
                    variant={
                      status === 'PRESENT' || status === 'LATE' ? 'secondary' : 'outline'
                    }
                  >
                    {status === 'PRESENT' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SubjectCareerPanel({ ws }: { ws: SubjectWorkspace }) {
  const hasAny =
    ws.internships.length > 0 ||
    ws.challenges.length > 0 ||
    ws.careerPaths.length > 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Opportunities from companies partnered with your university — linked to this subject and
        your career path.
      </p>

      {!hasAny ? (
        <EmptyState
          iconName="briefcase"
          title="No opportunities yet"
          description="Companies can publish internships and challenges for this subject. Check Career for all paths."
          className="py-16"
        />
      ) : null}

      {ws.internships.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Internships
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ws.internships.map((i) => (
              <Card key={i.id}>
                <CardHeader>
                  <CardTitle className="text-base">{i.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{i.description}</p>
                  <Button className="mt-3" size="sm" variant="brand" asChild>
                    <Link href="/student/career">View in Career</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {ws.challenges.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Company challenges</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ws.challenges.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  {c.deadline ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Deadline {formatDate(c.deadline)}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {ws.careerPaths.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Related career paths</h2>
          <div className="space-y-2">
            {ws.careerPaths.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-4">
                  <p className="font-medium">
                    {p.roleTitle} @ {p.companyName}
                  </p>
                  <Button className="mt-2" size="sm" variant="outline" asChild>
                    <Link href="/student/career">Explore path</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
