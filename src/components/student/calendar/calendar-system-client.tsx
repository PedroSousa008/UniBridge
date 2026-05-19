'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { CalendarLayer, CalendarQuickType } from '@prisma/client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  createLocalCalendarId,
  isLocalCalendarId,
  loadLocalCalendarEvents,
  removeLocalCalendarEvent,
  saveLocalCalendarEvent,
  type LocalCalendarPayload,
} from '@/lib/student/calendar-local-storage';
import {
  activeCountdowns,
  buildAnalytics,
  buildHeatmap,
  buildStudySuggestions,
  expandEventRecurrence,
  filterEventsByLayers,
  LAYER_COLORS,
  LAYER_LABELS,
  runCalendarAssistant,
  searchEvents,
  type CalendarPreferences,
  type CalendarViewMode,
  type HeatmapDay,
  type StudySuggestion,
  type UnifiedCalendarEvent,
} from '@/lib/student/unified-calendar';
import { Loader2 } from 'lucide-react';

const VIEWS: { id: CalendarViewMode; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

const LAYERS: CalendarLayer[] = ['ACADEMIC', 'CAREER', 'STARTUP', 'PERSONAL', 'SOCIAL'];

const QUICK_TYPES: { id: CalendarQuickType; label: string; layer: CalendarLayer }[] = [
  { id: 'TASK', label: 'Task', layer: 'PERSONAL' },
  { id: 'EVENT', label: 'Event', layer: 'PERSONAL' },
  { id: 'STUDY_SESSION', label: 'Study session', layer: 'ACADEMIC' },
  { id: 'REMINDER', label: 'Reminder', layer: 'PERSONAL' },
  { id: 'MEETING', label: 'Meeting', layer: 'CAREER' },
  { id: 'EXAM', label: 'Exam', layer: 'ACADEMIC' },
];

interface CalendarSystemClientProps {
  userId: string;
  initialEvents: UnifiedCalendarEvent[];
  preferences: CalendarPreferences;
}

function mergeServerAndLocal(server: UnifiedCalendarEvent[], userId: string) {
  const rangeStart = subMonths(startOfMonth(new Date()), 2);
  const rangeEnd = addMonths(startOfMonth(new Date()), 6);
  const local = loadLocalCalendarEvents(userId);
  const expanded = local.flatMap((e) => expandEventRecurrence(e, rangeStart, rangeEnd));
  const ids = new Set(server.map((e) => e.id));
  return [...server, ...expanded.filter((e) => !ids.has(e.id))];
}

export function CalendarSystemClient({
  userId,
  initialEvents,
  preferences: initialPrefs,
}: CalendarSystemClientProps) {
  const router = useRouter();
  const [events, setEvents] = useState(() => mergeServerAndLocal(initialEvents, userId));
  const [view, setView] = useState<CalendarViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [layers, setLayers] = useState(initialPrefs.layersEnabled);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistPrompt, setAssistPrompt] = useState('');
  const [assistReply, setAssistReply] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedCalendarEvent | null>(null);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const [form, setForm] = useState({
    quickType: 'EVENT' as CalendarQuickType,
    title: '',
    start: '',
    end: '',
    color: '#6366f1',
    location: '',
    taggedEmails: '',
    recurrence: 'NONE',
  });

  const filtered = useMemo(() => {
    let list = filterEventsByLayers(events, layers);
    list = searchEvents(list, search);
    return list;
  }, [events, layers, search]);

  const monthStart = startOfMonth(cursor);
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const studySuggestions = useMemo(() => buildStudySuggestions(filtered), [filtered]);
  const heatmap = useMemo(() => buildHeatmap(filtered, monthStart), [filtered, monthStart]);
  const analytics = useMemo(() => buildAnalytics(filtered), [filtered]);
  const countdowns = useMemo(
    () => activeCountdowns(filtered, prefs.countdownMinutes),
    [filtered, prefs.countdownMinutes]
  );

  useEffect(() => {
    setEvents(mergeServerAndLocal(initialEvents, userId));
  }, [initialEvents, userId]);

  const refresh = useCallback(() => router.refresh(), [router]);

  async function savePreferences(patch: Partial<CalendarPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await fetch('/api/student/calendar/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
  }

  function buildPayload(): LocalCalendarPayload {
    const qt = QUICK_TYPES.find((t) => t.id === form.quickType)!;
    const start = new Date(form.start);
    const end = new Date(form.end);
    const allDay =
      start.getHours() === 0 &&
      start.getMinutes() === 0 &&
      end.getHours() === 23 &&
      end.getMinutes() >= 59;

    return {
      title: form.title.trim(),
      category: qt.layer,
      quickType: form.quickType,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      allDay,
      color: form.color,
      location: form.location || null,
      recurrence: form.recurrence as LocalCalendarPayload['recurrence'],
      taggedEmails: form.taggedEmails
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    };
  }

  function applyLocalEvent(id: string, payload: LocalCalendarPayload, duplicate: boolean) {
    saveLocalCalendarEvent(userId, id, payload);
    const base = {
      id,
      title: payload.title,
      description: null,
      start: payload.startAt,
      end: payload.endAt,
      allDay: payload.allDay,
      layer: payload.category,
      subType: payload.quickType.toLowerCase(),
      color: payload.color,
      location: payload.location ?? null,
      source: 'custom',
      sourceId: id.replace(/^local-/, ''),
      editable: true,
      href: null,
      professor: null,
      recurrence: payload.recurrence,
      seriesId: null,
    };
    const rangeStart = subMonths(startOfMonth(new Date()), 2);
    const rangeEnd = addMonths(startOfMonth(new Date()), 6);
    const added = expandEventRecurrence(base, rangeStart, rangeEnd);
    setEvents((list) => [...list, ...added]);

    if (duplicate) {
      const dupPayload = {
        ...payload,
        startAt: new Date(new Date(payload.startAt).getTime() + 86400000).toISOString(),
        endAt: new Date(new Date(payload.endAt).getTime() + 86400000).toISOString(),
      };
      const dupId = createLocalCalendarId();
      saveLocalCalendarEvent(userId, dupId, dupPayload);
      const dupBase = { ...base, id: dupId, start: dupPayload.startAt, end: dupPayload.endAt };
      setEvents((list) => [...list, ...expandEventRecurrence(dupBase, rangeStart, rangeEnd)]);
    }
    setSavedLocally(true);
    setQuickOpen(false);
  }

  async function createEvent(duplicate = false) {
    if (!form.title.trim()) {
      setSaveError('Please enter a title.');
      return;
    }
    if (!form.start || !form.end) {
      setSaveError('Please set start and end times.');
      return;
    }
    if (new Date(form.end) <= new Date(form.start)) {
      setSaveError('End time must be after start time.');
      return;
    }

    setSaving(true);
    setSaveError('');
    const payload = buildPayload();

    try {
      const res = await fetch('/api/student/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          startAt: payload.startAt,
          endAt: payload.endAt,
          duplicate,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSavedLocally(false);
        setQuickOpen(false);
        refresh();
        return;
      }

      if (res.status === 503 || data.code === 'CALENDAR_DB_NOT_READY') {
        const id = createLocalCalendarId();
        applyLocalEvent(id, payload, duplicate);
        return;
      }

      setSaveError(data.error || 'Could not save. Please try again.');
    } catch {
      const id = createLocalCalendarId();
      applyLocalEvent(id, payload, duplicate);
    } finally {
      setSaving(false);
    }
  }

  async function moveEvent(ev: UnifiedCalendarEvent, newStart: Date) {
    if (!ev.editable) return;
    const duration = new Date(ev.end).getTime() - new Date(ev.start).getTime();
    const newEnd = new Date(newStart.getTime() + duration);
    const baseId = ev.id.replace(/-r\d+$/, '');

    if (isLocalCalendarId(baseId)) {
      const payload: LocalCalendarPayload = {
        title: ev.title,
        category: ev.layer,
        quickType: ev.subType.toUpperCase() as CalendarQuickType,
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
        allDay: ev.allDay,
        color: ev.color,
        location: ev.location,
        recurrence: ev.recurrence,
        taggedEmails: [],
      };
      saveLocalCalendarEvent(userId, baseId, payload);
      setEvents((list) =>
        list.map((e) =>
          e.seriesId === baseId || e.id === baseId || e.id.startsWith(`${baseId}-r`)
            ? {
                ...e,
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
              }
            : e
        )
      );
      return;
    }

    await fetch(`/api/student/calendar/events/${baseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startAt: newStart.toISOString(), endAt: newEnd.toISOString() }),
    });
    refresh();
  }

  async function hideEvent(ev: UnifiedCalendarEvent) {
    if (!ev.sourceId) return;
    const type = ev.source.replace('university', 'university').split('-')[0] || ev.source;
    await fetch('/api/student/calendar/hide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: ev.source, sourceId: ev.sourceId }),
    });
    setEvents((list) => list.filter((e) => e.id !== ev.id));
    setSelected(null);
  }

  async function runAssist() {
    const res = await fetch('/api/student/calendar/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: assistPrompt }),
    });
    const data = await res.json();
    setAssistReply(data.reply ?? runCalendarAssistant(assistPrompt, filtered));
  }

  function openQuickAdd(type: CalendarQuickType) {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60000);
    const qt = QUICK_TYPES.find((t) => t.id === type)!;
    setSaveError('');
    setSaving(false);
    setForm({
      quickType: type,
      title: '',
      start: format(now, "yyyy-MM-dd'T'HH:mm"),
      end: format(end, "yyyy-MM-dd'T'HH:mm"),
      color: LAYER_COLORS[qt.layer],
      location: '',
      taggedEmails: '',
      recurrence: 'NONE',
    });
    setQuickOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Everything important in your student life — academic, startup, career and personal."
        action={
          <Button variant="outline" asChild>
            <a href="/student/academics/schedule">Weekly schedule</a>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                view === v.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search events, rooms, professors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            onClick={() => {
              const next = { ...layers, [layer]: !layers[layer] };
              setLayers(next);
              void savePreferences({ layersEnabled: next });
            }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              layers[layer] ? 'border-transparent text-white' : 'border-border bg-card text-muted-foreground'
            )}
            style={layers[layer] ? { backgroundColor: LAYER_COLORS[layer] } : undefined}
          >
            {LAYER_LABELS[layer]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateCursor(-1, view, cursor, setCursor)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold">
              {view === 'month' && format(monthStart, 'MMMM yyyy')}
              {view === 'week' && `Week of ${format(weekStart, 'MMM d, yyyy')}`}
              {view === 'day' && format(cursor, 'EEEE, MMM d')}
              {view === 'agenda' && 'Upcoming'}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigateCursor(1, view, cursor, setCursor)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {view === 'month' && (
            <MonthView
              month={monthStart}
              events={filtered}
              onSelect={setSelected}
              onDayClick={(d) => {
                setCursor(d);
                setView('day');
              }}
            />
          )}
          {view === 'week' && (
            <WeekDayView
              start={weekStart}
              days={7}
              events={filtered}
              dragId={dragId}
              setDragId={setDragId}
              onMove={moveEvent}
              onSelect={setSelected}
            />
          )}
          {view === 'day' && (
            <WeekDayView
              start={startOfDay(cursor)}
              days={1}
              events={filtered.filter((e) => isSameDay(new Date(e.start), cursor))}
              dragId={dragId}
              setDragId={setDragId}
              onMove={moveEvent}
              onSelect={setSelected}
            />
          )}
          {view === 'agenda' && <AgendaView events={filtered} onSelect={setSelected} />}
        </div>

        <aside className="space-y-4">
          <SideCard title="Countdowns">
            {countdowns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active reminders.</p>
            ) : (
              <ul className="space-y-2">
                {countdowns.map((c) => (
                  <li key={c.event.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{c.event.title}</span>
                    <span className="block text-xs text-primary">{c.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>

          <SideCard title="Deadline heatmap">
            <HeatmapGrid days={heatmap} />
          </SideCard>

          <SideCard title="Analytics">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Stat label="Most productive" value={analytics.mostProductiveDay} />
              <Stat label="Busiest day" value={analytics.busiestWeekday} />
              <Stat label="Study hours" value={`${analytics.totalStudyHours}h`} />
              <Stat label="Classes" value={String(analytics.classSessions)} />
            </dl>
          </SideCard>

          <SideCard title="AI study suggestions">
            {studySuggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No suggestions right now.</p>
            ) : (
              <ul className="space-y-2">
                {studySuggestions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border/60 p-2 text-xs">
                    {s.message}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-auto p-0 text-xs"
                      onClick={() => {
                        setForm({
                          quickType: 'STUDY_SESSION',
                          title: `${s.subjectName} revision`,
                          start: format(new Date(s.suggestedStart), "yyyy-MM-dd'T'HH:mm"),
                          end: format(new Date(s.suggestedEnd), "yyyy-MM-dd'T'HH:mm"),
                          color: LAYER_COLORS.ACADEMIC,
                          location: '',
                          taggedEmails: '',
                          recurrence: 'NONE',
                        });
                        setQuickOpen(true);
                      }}
                    >
                      Add study block
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SideCard>

          <SideCard title="AI assistant">
            <Button size="sm" variant="outline" className="w-full" onClick={() => setAssistOpen(!assistOpen)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Ask calendar AI
            </Button>
            {assistOpen ? (
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Optimize my week…"
                  value={assistPrompt}
                  onChange={(e) => setAssistPrompt(e.target.value)}
                />
                <Button size="sm" className="w-full" onClick={() => void runAssist()}>
                  Run
                </Button>
                {assistReply ? <p className="text-xs text-muted-foreground">{assistReply}</p> : null}
              </div>
            ) : null}
          </SideCard>

          <SideCard title="External sync">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={prefs.googleSyncEnabled}
                onChange={(e) => void savePreferences({ googleSyncEnabled: e.target.checked })}
              />
              Google Calendar (coming soon)
            </label>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={prefs.appleSyncEnabled}
                onChange={(e) => void savePreferences({ appleSyncEnabled: e.target.checked })}
              />
              Apple Calendar (coming soon)
            </label>
          </SideCard>
        </aside>
      </div>

      {selected ? (
        <EventDetailSheet event={selected} onClose={() => setSelected(null)} onHide={() => void hideEvent(selected)} />
      ) : null}

      {savedLocally ? (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Event saved on this device. It appears on your calendar and will sync when cloud storage is ready.
        </div>
      ) : null}

      {quickOpen ? (
        <QuickAddModal
          form={form}
          setForm={setForm}
          saving={saving}
          saveError={saveError}
          onClose={() => {
            if (!saving) {
              setQuickOpen(false);
              setSaveError('');
            }
          }}
          onSave={() => void createEvent(false)}
          onDuplicate={() => void createEvent(true)}
        />
      ) : null}

      <Button
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl"
        size="icon"
        onClick={() => openQuickAdd('EVENT')}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function navigateCursor(
  dir: -1 | 1,
  view: CalendarViewMode,
  cursor: Date,
  set: (d: Date) => void
) {
  if (view === 'month') set(dir > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1));
  else if (view === 'week') set(dir > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
  else set(addDays(cursor, dir));
}

function MonthView({
  month,
  events,
  onSelect,
  onDayClick,
}: {
  month: Date;
  events: UnifiedCalendarEvent[];
  onSelect: (e: UnifiedCalendarEvent) => void;
  onDayClick: (d: Date) => void;
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[88px] border-b border-r border-border/60 p-1 text-left transition-colors hover:bg-muted/30',
                !isSameMonth(day, month) && 'bg-muted/20 text-muted-foreground',
                isSameDay(day, new Date()) && 'bg-primary/5 ring-1 ring-inset ring-primary/20'
              )}
            >
              <span className="text-xs font-medium">{format(day, 'd')}</span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelect(e);
                    }}
                    className="block truncate rounded px-1 py-0.5 text-[10px] text-white"
                    style={{ backgroundColor: e.color }}
                  >
                    {e.title}
                  </span>
                ))}
                {dayEvents.length > 3 ? (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekDayView({
  start,
  days,
  events,
  dragId,
  setDragId,
  onMove,
  onSelect,
}: {
  start: Date;
  days: number;
  events: UnifiedCalendarEvent[];
  dragId: string | null;
  setDragId: (id: string | null) => void;
  onMove: (ev: UnifiedCalendarEvent, d: Date) => void;
  onSelect: (e: UnifiedCalendarEvent) => void;
}) {
  const dayList = Array.from({ length: days }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 16 }, (_, i) => i + 7);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div className="flex min-w-[600px]">
        <div className="w-12 shrink-0 border-r border-border pt-10">
          {hours.map((h) => (
            <div key={h} className="h-12 border-t border-border/40 pr-1 text-right text-[10px] text-muted-foreground">
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {dayList.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'relative flex-1 border-r border-border last:border-r-0',
              isSameDay(day, new Date()) && 'bg-primary/[0.04]'
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const ev = events.find((x) => x.id === dragId);
              if (!ev?.editable) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const y = e.clientY - rect.top;
              const hour = Math.min(22, Math.max(7, Math.floor(y / 48) + 7));
              const d = new Date(day);
              d.setHours(hour, 0, 0, 0);
              void onMove(ev, d);
              setDragId(null);
            }}
          >
            <div className="border-b border-border py-2 text-center text-xs font-medium">
              {format(day, days === 1 ? 'EEEE d' : 'EEE d')}
            </div>
            <div className="relative" style={{ height: hours.length * 48 }}>
              {hours.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-border/40" style={{ top: (h - 7) * 48 }} />
              ))}
              {events
                .filter((e) => isSameDay(new Date(e.start), day))
                .map((e) => (
                  <EventBlock key={e.id} event={e} onSelect={onSelect} setDragId={setDragId} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventBlock({
  event,
  onSelect,
  setDragId,
}: {
  event: UnifiedCalendarEvent;
  onSelect: (e: UnifiedCalendarEvent) => void;
  setDragId: (id: string | null) => void;
}) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const top = (start.getHours() - 7) * 48 + (start.getMinutes() / 60) * 48;
  const h = Math.max(24, ((end.getTime() - start.getTime()) / 3600000) * 48);
  const urgent = event.subType === 'exam' || event.subType === 'assignment';
  const business = event.subType === 'pitch';

  return (
    <button
      type="button"
      draggable={event.editable}
      onDragStart={() => event.editable && setDragId(event.id)}
      onClick={() => onSelect(event)}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border p-1 text-left text-[10px] text-white shadow-sm transition-shadow hover:shadow-md',
        urgent && 'ring-2 ring-red-300/50',
        business && 'border-violet-200'
      )}
      style={{ top, height: h, backgroundColor: event.color }}
    >
      {event.editable ? <GripVertical className="mb-0.5 h-3 w-3 opacity-70" /> : null}
      <span className="font-semibold">{event.title}</span>
      <span className="block opacity-90">
        {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
      </span>
    </button>
  );
}

function AgendaView({
  events,
  onSelect,
}: {
  events: UnifiedCalendarEvent[];
  onSelect: (e: UnifiedCalendarEvent) => void;
}) {
  const upcoming = events
    .filter((e) => new Date(e.start) >= new Date())
    .slice(0, 40);

  if (upcoming.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming events.</p>;
  }

  return (
    <div className="space-y-4">
      {upcoming.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelect(e)}
          className="flex w-full gap-3 rounded-xl border border-border p-4 text-left transition-shadow hover:shadow-md"
          style={{ borderLeftWidth: 4, borderLeftColor: e.color }}
        >
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{e.title}</span>
              <Badge variant="secondary" className="text-[10px]">
                {LAYER_LABELS[e.layer]}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(e.start), 'EEE, MMM d · HH:mm')}
              {e.location ? ` · ${e.location}` : ''}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function HeatmapGrid({ days }: { days: HeatmapDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.intensity));
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.exams} exams, ${d.assignments} assignments`}
          className="aspect-square rounded-sm"
          style={{
            backgroundColor: `rgba(239, 68, 68, ${0.15 + (d.intensity / max) * 0.85})`,
          }}
        />
      ))}
    </div>
  );
}

function EventDetailSheet({
  event,
  onClose,
  onHide,
}: {
  event: UnifiedCalendarEvent;
  onClose: () => void;
  onHide: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge style={{ backgroundColor: event.color }} className="text-white border-0">
              {LAYER_LABELS[event.layer]}
            </Badge>
            <h3 className="mt-2 text-lg font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.start), 'PPp')} – {format(new Date(event.end), 'p')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {event.description ? <p className="mt-3 text-sm">{event.description}</p> : null}
        {event.location ? <p className="mt-1 text-sm text-muted-foreground">{event.location}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {!event.editable && event.sourceId ? (
            <Button size="sm" variant="outline" onClick={onHide}>
              Remove from my calendar
            </Button>
          ) : null}
          {event.href ? (
            <Button size="sm" asChild>
              <a href={event.href}>Open</a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuickAddModal({
  form,
  setForm,
  saving,
  saveError,
  onClose,
  onSave,
  onDuplicate,
}: {
  form: {
    quickType: CalendarQuickType;
    title: string;
    start: string;
    end: string;
    color: string;
    location: string;
    taggedEmails: string;
    recurrence: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <h3 className="text-lg font-semibold">Quick add</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, quickType: t.id, color: LAYER_COLORS[t.layer] }))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium',
                form.quickType === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input className="mt-4" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input type="datetime-local" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} />
          <Input type="datetime-local" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} />
        </div>
        <Input className="mt-2" placeholder="Location / room" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        <Input className="mt-2" placeholder="Tag emails (comma separated)" value={form.taggedEmails} onChange={(e) => setForm((f) => ({ ...f, taggedEmails: e.target.value }))} />
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs">Color</label>
          <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
        </div>
        <select
          className="mt-2 h-10 w-full rounded-xl border border-border px-3 text-sm"
          value={form.recurrence}
          onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
        >
          <option value="NONE">No repeat</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        {saveError ? <p className="mt-3 text-sm text-red-600">{saveError}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={onDuplicate}>
            <Copy className="mr-1 h-4 w-4" />
            Duplicate +1 day
          </Button>
          <Button type="submit" disabled={saving || !form.title.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
