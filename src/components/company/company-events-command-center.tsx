'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import type {
  CalendarEventChip,
  CompanyEventDetail,
  CompanyEventsHub,
} from '@/lib/company/company-events-hub';
import { EVENT_TYPES } from '@/lib/company/company-events-intelligence';
import type { EventSpeakerCard } from '@/lib/company/company-events-intelligence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Radio,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';

type CalView = 'month' | 'week' | 'day';

function eventsOnDay(events: CalendarEventChip[], day: Date) {
  return events.filter((e) => isSameDay(parseISO(e.startsAt), day));
}

function SpeakerCard({ speaker }: { speaker: EventSpeakerCard }) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-card to-slate-500/5 p-3 transition hover:border-cyan-500/30 hover:shadow-md">
      <div className="flex gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-cyan-700 flex items-center justify-center text-xs font-bold text-white">
          {speaker.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{speaker.name}</p>
          <p className="text-[11px] text-muted-foreground">{speaker.role}</p>
          {speaker.company && <p className="text-[10px] text-muted-foreground mt-0.5">{speaker.company}</p>}
          {speaker.expertise.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {speaker.expertise.slice(0, 2).map((ex) => (
                <span key={ex} className="rounded-full bg-muted px-2 py-0.5 text-[9px]">
                  {ex}
                </span>
              ))}
            </div>
          )}
          {speaker.networkingAvailable && (
            <p className="mt-2 text-[10px] text-cyan-600 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Pre-event networking open
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EventChip({
  event,
  onClick,
  compact,
}: {
  event: CalendarEventChip;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white truncate transition hover:scale-[1.02] hover:shadow-md',
        compact && 'px-1 py-0.5 text-[9px]'
      )}
      style={{ backgroundColor: event.color }}
      title={event.title}
    >
      {event.isLive && <span className="inline-block h-1 w-1 rounded-full bg-emerald-300 mr-1 animate-pulse" />}
      {event.title}
    </button>
  );
}

export function CompanyEventsCommandCenter({
  initialHub,
  universities,
}: {
  initialHub: CompanyEventsHub;
  universities: { id: string; name: string }[];
}) {
  const [hub, setHub] = useState(initialHub);
  const [calView, setCalView] = useState<CalView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<CompanyEventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { studentUserId: string; name: string; program: string | null; compatibility: number }[]
  >([]);

  const [form, setForm] = useState({
    universityId: universities[0]?.id ?? '',
    title: '',
    eventType: 'networking',
    description: '',
    location: '',
    eventFormat: 'hybrid',
    isOnline: false,
    coverUrl: '',
    targetDegrees: '',
    targetYears: '2,3',
    speakers: '',
    goals: 'Build ecosystem connections, Attract high-potential talent',
    agenda: '18:00 — Welcome\n18:30 — Main session\n19:30 — Networking',
    registrationDeadline: '',
    startsAt: '',
    endsAt: '',
    capacity: '80',
  });

  const openEvent = useCallback(async (eventId: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/company/events/${eventId}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }, []);

  async function refreshHub() {
    const res = await fetch('/api/company/events');
    if (res.ok) setHub(await res.json());
  }

  async function createEvent() {
    setLoading(true);
    const speakers: EventSpeakerCard[] = form.speakers
      .split(',')
      .map((name, i) => ({
        id: `sp-${i}`,
        name: name.trim(),
        role: 'Speaker',
        company: hub.companyName,
        university: null,
        image: null,
        bio: null,
        expertise: [],
        networkingAvailable: true,
      }))
      .filter((s) => s.name);

    const res = await fetch('/api/company/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        universityId: form.universityId,
        title: form.title,
        eventType: form.eventType,
        description: form.description,
        coverUrl: form.coverUrl || undefined,
        location: form.location,
        isOnline: form.isOnline,
        eventFormat: form.eventFormat,
        registrationDeadline: form.registrationDeadline || undefined,
        targetDegrees: form.targetDegrees.split(',').map((s) => s.trim()).filter(Boolean),
        targetYears: form.targetYears
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n)),
        capacity: parseInt(form.capacity, 10),
        speakers,
        goals: form.goals.split(',').map((s) => s.trim()).filter(Boolean),
        agenda: form.agenda
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [time, ...rest] = line.split('—').map((s) => s.trim());
            return { time: time ?? '', label: rest.join(' — ') || line };
          }),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      }),
    });
    if (res.ok) {
      setHub(await res.json());
      setShowCreate(false);
    }
    setLoading(false);
  }

  async function inviteStudent(studentUserId: string) {
    if (!detail) return;
    setLoading(true);
    const res = await fetch(`/api/company/events/${detail.card.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUserIds: [studentUserId] }),
    });
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }

  async function markAttendance(studentUserId: string, attended: boolean) {
    if (!detail) return;
    setLoading(true);
    const res = await fetch(`/api/company/events/${detail.card.id}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUserId, attended }),
    });
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }

  async function searchStudents(q: string) {
    if (!detail) return;
    const res = await fetch(
      `/api/company/events/search-students?universityId=${detail.card.universityId}&q=${encodeURIComponent(q)}`
    );
    if (res.ok) {
      const data = await res.json();
      setSearchResults(data.results ?? []);
    }
  }

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 1 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
  });

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayEvents = useMemo(
    () => eventsOnDay(hub.calendarEvents, selectedDay),
    [hub.calendarEvents, selectedDay]
  );

  function navigate(dir: -1 | 1) {
    if (calView === 'month') setCursor((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
    else if (calView === 'week') setCursor((d) => (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)));
    else setSelectedDay((d) => addDays(d, dir === 1 ? 1 : -1));
  }

  const headerLabel =
    calView === 'month'
      ? format(cursor, 'MMMM yyyy')
      : calView === 'week'
        ? `Week of ${format(weekStart, 'MMM d')}`
        : format(selectedDay, 'EEEE, MMM d');

  if (!universities.length) {
    return (
      <div className="rounded-2xl border border-dashed p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-semibold">Connect universities to launch ecosystem events</p>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Events sync to student calendars, notifications, and talent pipelines once a partnership is active.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/company/presence">Open Presence</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 px-6 py-10 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/45">Live ecosystem hub</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{hub.heroTitle}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Not scheduling — live coordination between {hub.companyName}, universities, founders, and ambitious
              students.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {hub.liveSignals.map((sig) => (
                <span
                  key={sig}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px]"
                >
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                  {sig}
                </span>
              ))}
            </div>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 bg-white text-slate-900 hover:bg-white/90 shadow-lg"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Launch ecosystem event
          </Button>
        </div>
      </section>

      {/* Analytics */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: 'Registrations', value: hub.analytics.totalRsvps },
          { label: 'Live events', value: hub.analytics.approvedEvents },
          { label: 'Pending approval', value: hub.analytics.pendingApproval },
          { label: 'Avg attendance', value: `${hub.analytics.avgAttendance}%` },
          { label: 'This week', value: hub.analytics.registrationsThisWeek },
          { label: 'Networking links', value: hub.analytics.networkingConnections },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-xl border bg-card px-4 py-3 hover:border-cyan-500/30 transition shadow-sm"
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{m.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* Calendar */}
        <section className="rounded-2xl border bg-card/50 p-4 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center">{headerLabel}</h2>
              <Button variant="outline" size="icon" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex rounded-full border p-0.5 bg-muted/30">
              {(['month', 'week', 'day'] as CalView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalView(v)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-all duration-300',
                    calView === v ? 'bg-slate-900 text-white shadow' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div
            key={calView}
            className="animate-in fade-in slide-in-from-bottom-2 duration-400"
          >
            {calView === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {gridDays.map((day) => {
                    const dayEv = eventsOnDay(hub.calendarEvents, day);
                    const inMonth = isSameMonth(day, cursor);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDay(day);
                          setCalView('day');
                        }}
                        className={cn(
                          'min-h-[88px] rounded-lg border p-1 text-left transition hover:border-cyan-500/40 hover:bg-cyan-500/5',
                          !inMonth && 'opacity-40',
                          isSameDay(day, new Date()) && 'ring-1 ring-cyan-500/50'
                        )}
                      >
                        <span className="text-[11px] font-medium tabular-nums">{format(day, 'd')}</span>
                        <div className="mt-1 space-y-0.5">
                          {dayEv.slice(0, 3).map((ev) => (
                            <EventChip key={ev.id} event={ev} onClick={() => void openEvent(ev.id)} compact />
                          ))}
                          {dayEv.length > 3 && (
                            <p className="text-[9px] text-muted-foreground px-1">+{dayEv.length - 3} more</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {calView === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayEv = eventsOnDay(hub.calendarEvents, day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'rounded-xl border min-h-[200px] p-2 transition',
                        isSameDay(day, new Date()) && 'border-cyan-500/50 bg-cyan-500/5'
                      )}
                    >
                      <p className="text-xs font-semibold mb-2">{format(day, 'EEE d')}</p>
                      <div className="space-y-1">
                        {dayEv.map((ev) => (
                          <EventChip key={ev.id} event={ev} onClick={() => void openEvent(ev.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {calView === 'day' && (
              <div className="space-y-3">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No events this day — launch one.</p>
                ) : (
                  dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => void openEvent(ev.id)}
                      className="w-full flex items-center gap-4 rounded-xl border p-4 text-left hover:border-cyan-500/40 hover:shadow-md transition"
                    >
                      <div
                        className="h-12 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: ev.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(ev.startsAt), 'HH:mm')} – {format(parseISO(ev.endsAt), 'HH:mm')} ·{' '}
                          {ev.typeLabel}
                        </p>
                      </div>
                      <Badge variant="outline">{ev.rsvpCount} registered</Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* Trending */}
        <aside className="space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Trending momentum
          </p>
          {hub.trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Approved events with RSVPs appear here.</p>
          ) : (
            hub.trending.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => void openEvent(ev.id)}
                className="w-full rounded-xl border p-3 text-left hover:border-violet-500/30 transition group"
              >
                <div
                  className="h-1 w-full rounded-full mb-2 opacity-80 group-hover:opacity-100"
                  style={{ backgroundColor: ev.color }}
                />
                <p className="font-medium text-sm line-clamp-2">{ev.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{ev.typeLabel}</p>
                <p className="text-xs mt-2 tabular-nums">{ev.rsvpCount} registered</p>
                {ev.momentumSignals[0] && (
                  <p className="text-[10px] text-cyan-600 mt-1">{ev.momentumSignals[0]}</p>
                )}
              </button>
            ))
          )}
        </aside>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              type="button"
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreate(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold">Launch ecosystem activity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted events enter university approval — then calendars and notifications sync live.
            </p>
            <div className="mt-6 space-y-3">
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.universityId}
                onChange={(e) => setForm({ ...form, universityId: e.target.value })}
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm bg-background"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="w-full min-h-[72px] rounded-lg border px-3 py-2 text-sm bg-background"
                placeholder="Description — aspirational, not bureaucratic"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="rounded-lg border px-3 py-2 text-sm bg-background"
                  value={form.eventFormat}
                  onChange={(e) => setForm({ ...form, eventFormat: e.target.value })}
                >
                  <option value="physical">Physical</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <Input
                  placeholder="Capacity"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <Input
                type="datetime-local"
                placeholder="Registration deadline"
                value={form.registrationDeadline}
                onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
              />
              <Input
                placeholder="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Input
                placeholder="Banner URL (optional)"
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
              />
              <Input
                placeholder="Speakers (comma-separated names)"
                value={form.speakers}
                onChange={(e) => setForm({ ...form, speakers: e.target.value })}
              />
              <Input
                placeholder="Target degrees"
                value={form.targetDegrees}
                onChange={(e) => setForm({ ...form, targetDegrees: e.target.value })}
              />
              <Button className="w-full" onClick={() => void createEvent()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit for university approval'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl h-full overflow-y-auto bg-background border-l shadow-2xl animate-in slide-in-from-right duration-300">
            {detailLoading && !detail ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-8">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <Badge
                      className="mb-2"
                      style={{ backgroundColor: detail.card.color, color: '#fff' }}
                    >
                      {detail.card.typeLabel}
                    </Badge>
                    <h2 className="text-2xl font-bold">{detail.card.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{detail.card.statusLabel}</p>
                  </div>
                  <button type="button" onClick={() => setDetail(null)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {detail.card.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.card.coverUrl}
                    alt=""
                    className="w-full h-40 object-cover rounded-xl"
                  />
                )}

                <p className="text-sm leading-relaxed">{detail.card.description}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">When</p>
                    <p className="font-medium mt-1">
                      {new Date(detail.card.startsAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">Host</p>
                    <p className="font-medium mt-1">{detail.card.companyName}</p>
                  </div>
                  <div className="rounded-lg border p-3 flex gap-2">
                    <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">University</p>
                      <p className="font-medium">{detail.card.universityName}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 flex gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Format</p>
                      <p className="font-medium capitalize">
                        {detail.card.eventFormat} · {detail.card.capacity ?? '∞'} cap
                      </p>
                    </div>
                  </div>
                </div>

                {detail.card.momentumSignals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detail.card.momentumSignals.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] rounded-full border px-2 py-1 bg-emerald-500/5 text-emerald-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Analytics */}
                <section>
                  <h3 className="text-sm font-semibold mb-3">Event intelligence</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: 'Attendance rate', v: `${detail.analytics.attendanceRate}%` },
                      { l: 'Pipeline movement', v: detail.analytics.pipelineMovement },
                      { l: 'Compatibility lift', v: `+${detail.analytics.compatibilityLift}` },
                      { l: 'Founders attending', v: detail.analytics.founderAttendees },
                    ].map((a) => (
                      <div key={a.l} className="rounded-lg border px-3 py-2">
                        <p className="text-[10px] text-muted-foreground">{a.l}</p>
                        <p className="font-bold tabular-nums">{a.v}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Goals & agenda */}
                {detail.card.goals.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2">Objectives</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                      {detail.card.goals.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {detail.card.agenda.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2">Agenda</h3>
                    <div className="space-y-2">
                      {detail.card.agenda.map((a, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-muted-foreground tabular-nums w-14 shrink-0">{a.time}</span>
                          <span>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Speakers */}
                {detail.card.speakers.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-3">Ecosystem hosts</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {detail.card.speakers.map((sp) => (
                        <SpeakerCard key={sp.id} speaker={sp} />
                      ))}
                    </div>
                  </section>
                )}

                {/* AI recommendations */}
                <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    AI attendee recommendations
                  </p>
                  <div className="mt-3 space-y-2">
                    {detail.recommendedAttendees.map((r) => (
                      <div
                        key={r.studentUserId}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">{r.reasons[0]}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-violet-600">{r.compatibility}%</span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => void inviteStudent(r.studentUserId)}
                          >
                            Invite
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Tag students */}
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tag & invite students
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search students…"
                      value={inviteQuery}
                      onChange={(e) => setInviteQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void searchStudents(inviteQuery)}
                    />
                    <Button variant="outline" onClick={() => void searchStudents(inviteQuery)}>
                      Search
                    </Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {searchResults.map((s) => (
                      <div
                        key={s.studentUserId}
                        className="flex justify-between items-center rounded-lg border px-3 py-2 text-sm"
                      >
                        <span>
                          {s.name}
                          {s.program && (
                            <span className="text-muted-foreground text-xs ml-1">· {s.program}</span>
                          )}
                        </span>
                        <Button size="sm" variant="ghost" onClick={() => void inviteStudent(s.studentUserId)}>
                          Tag
                        </Button>
                      </div>
                    ))}
                  </div>
                  {detail.invites.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {detail.invites.length} personalized invites sent
                    </p>
                  )}
                </section>

                {/* Attendees & attendance */}
                <section>
                  <h3 className="text-sm font-semibold mb-3">Attendees & pre-event network</h3>
                  {detail.attendees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">RSVPs appear here — invite high-fit students first.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.attendees.filter(Boolean).map((a) => (
                        <div
                          key={a.studentUserId}
                          className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {a.universityName} · {a.compatibilityScore ?? '—'}% fit
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/company/talent?student=${a.studentUserId}`}>Profile</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={loading}
                              onClick={() => void markAttendance(a.studentUserId, true)}
                            >
                              Present
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {detail.relatedOpportunities.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2">Related opportunities</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.relatedOpportunities.map((o) => (
                        <Button key={o.id} variant="outline" size="sm" asChild>
                          <Link href={o.href}>{o.title}</Link>
                        </Button>
                      ))}
                    </div>
                  </section>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href="/company/pipeline">Pipeline</Link>
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => void refreshHub()}>
                    Refresh hub
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
