'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  MonthView,
  navigateCalendarCursor,
  WeekDayView,
  type CalendarGridEvent,
  type SubjectCalendarViewMode,
} from '@/components/calendar/calendar-grid-views';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SubjectCalendarEventDto } from '@/lib/teacher/subject-calendar-hub';
import { SUBJECT_EVENT_TYPES } from '@/lib/teacher/subject-event-types';
import type { UnifiedCalendarEvent } from '@/lib/student/unified-calendar';
import { cn } from '@/lib/utils';

const VIEWS: { id: SubjectCalendarViewMode; label: string }[] = [
  { id: 'month', label: 'Monthly' },
  { id: 'week', label: 'Weekly' },
  { id: 'day', label: 'Daily' },
];

function toGrid(events: UnifiedCalendarEvent[]): CalendarGridEvent[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    color: e.color,
    editable: e.editable,
    subType: e.subType,
  }));
}

function parseInstanceId(id: string): { eventId: string; occurrence: string | null } {
  const idx = id.indexOf(':');
  if (idx === -1) return { eventId: id, occurrence: null };
  const occurrence = id.slice(idx + 1);
  return {
    eventId: id.slice(0, idx),
    occurrence: occurrence === 'once' ? null : occurrence,
  };
}

const emptyForm = () => ({
  title: '',
  eventType: 'CLASS',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '10:30',
  location: '',
  room: '',
  description: '',
  repeatWeekly: false,
  repeatUntilEndOfSemester: true,
  repeatUntil: '',
  notifyStudents: true,
});

export function TeacherSubjectCalendarPanel({
  subjectId,
  subjectName,
  initialEvents,
  initialRaw,
}: {
  subjectId: string;
  subjectName: string;
  initialEvents: UnifiedCalendarEvent[];
  initialRaw: SubjectCalendarEventDto[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [rawEvents, setRawEvents] = useState(initialRaw);
  const [view, setView] = useState<SubjectCalendarViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedCalendarEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const gridEvents = useMemo(() => toGrid(events), [events]);

  const applyHub = useCallback(
    (data: { events: UnifiedCalendarEvent[]; raw: SubjectCalendarEventDto[] }) => {
      setEvents(data.events);
      setRawEvents(data.raw);
      router.refresh();
    },
    [router]
  );

  const monthStart = startOfMonth(cursor);
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });

  function openAdd(day?: Date) {
    setEditingId(null);
    setEditingOccurrence(null);
    setForm({
      ...emptyForm(),
      date: (day ?? new Date()).toISOString().slice(0, 10),
    });
    setError('');
    setModalOpen(true);
  }

  function openEdit(ev: UnifiedCalendarEvent) {
    if (!ev.editable || !ev.sourceId) {
      setSelected(ev);
      return;
    }
    const { eventId, occurrence } = parseInstanceId(ev.id);
    const raw = rawEvents.find((r) => r.id === eventId);
    if (!raw) {
      setSelected(ev);
      return;
    }
    setEditingId(eventId);
    setEditingOccurrence(occurrence);
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    setForm({
      title: raw.title,
      eventType: raw.eventType,
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
      location: raw.location ?? '',
      room: raw.room ?? '',
      description: raw.description ?? '',
      repeatWeekly: raw.repeatWeekly,
      repeatUntilEndOfSemester: !raw.repeatUntil,
      repeatUntil: raw.repeatUntil ? raw.repeatUntil.slice(0, 10) : '',
      notifyStudents: raw.notifyOnChange,
    });
    setSelected(null);
    setError('');
    setModalOpen(true);
  }

  async function saveEvent() {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        eventType: form.eventType,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        location: form.location || null,
        room: form.room || null,
        description: form.description || null,
        repeatWeekly: form.eventType === 'CLASS' && form.repeatWeekly,
        repeatUntilEndOfSemester: form.repeatUntilEndOfSemester,
        repeatUntil: form.repeatUntil || null,
        notifyStudents: form.notifyStudents,
      };

      const url = editingId
        ? `/api/teacher/subjects/${subjectId}/calendar/${editingId}`
        : `/api/teacher/subjects/${subjectId}/calendar`;

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Could not save event');
        return;
      }

      const data = await res.json();
      applyHub(data);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(scope: 'series' | 'occurrence') {
    if (!editingId && !selected?.sourceId) return;
    const eventId = editingId ?? selected!.sourceId!;
    const occurrence =
      scope === 'occurrence' ? editingOccurrence ?? parseInstanceId(selected!.id).occurrence : null;

    if (!confirm(scope === 'occurrence' ? 'Remove only this occurrence?' : 'Delete this event for everyone?')) {
      return;
    }

    setSaving(true);
    try {
      const q = occurrence ? `?occurrence=${occurrence}` : '';
      const res = await fetch(`/api/teacher/subjects/${subjectId}/calendar/${eventId}${q}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError('Could not delete');
        return;
      }
      const data = await res.json();
      applyHub(data);
      setModalOpen(false);
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  const headerLabel =
    view === 'month'
      ? format(monthStart, 'MMMM yyyy')
      : view === 'week'
        ? `${format(weekStart, 'd MMM')} – ${format(new Date(weekStart.getTime() + 6 * 86400000), 'd MMM yyyy')}`
        : format(cursor, 'EEEE, d MMMM yyyy');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{subjectName} — Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Events sync live to your calendar and every enrolled student.
          </p>
        </div>
        <Button onClick={() => openAdd()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <Button
            key={v.id}
            variant={view === v.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateCalendarCursor(-1, view, cursor, setCursor)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{headerLabel}</span>
        <Button variant="outline" size="icon" onClick={() => navigateCalendarCursor(1, view, cursor, setCursor)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {view === 'month' ? (
        <MonthView
          month={monthStart}
          events={gridEvents}
          onSelect={(e) => {
            const full = events.find((x) => x.id === e.id);
            if (full) openEdit(full);
          }}
          onDayClick={(d) => {
            setView('day');
            setCursor(d);
          }}
        />
      ) : (
        <WeekDayView
          start={view === 'week' ? weekStart : cursor}
          days={view === 'week' ? 7 : 1}
          events={gridEvents}
          onSelect={(e) => {
            const full = events.find((x) => x.id === e.id);
            if (full) openEdit(full);
          }}
        />
      )}

      {selected && !modalOpen ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{selected.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selected.start), 'PPp')} — {format(new Date(selected.end), 'p')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {!selected.editable ? (
              <Badge variant="outline">Synced from gradebook — edit in Exams or Assignments</Badge>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openEdit(selected)}>
                  Edit
                </Button>
                {selected.recurrence === 'WEEKLY' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(selected.sourceId!);
                      setEditingOccurrence(parseInstanceId(selected.id).occurrence);
                      void deleteEvent('occurrence');
                    }}
                  >
                    Remove this week only
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setEditingId(selected.sourceId!);
                    void deleteEvent('series');
                  }}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{editingId ? 'Edit event' : 'Add event'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => !saving && setModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <select
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                value={form.eventType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    eventType: e.target.value,
                    repeatWeekly: e.target.value === 'CLASS' ? f.repeatWeekly : false,
                  }))
                }
              >
                {SUBJECT_EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
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
                placeholder="Location (optional)"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
              <Input
                placeholder="Room (optional)"
                value={form.room}
                onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              />
              <textarea
                className="min-h-[72px] w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />

              {form.eventType === 'CLASS' ? (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={form.repeatWeekly}
                      onChange={(e) => setForm((f) => ({ ...f, repeatWeekly: e.target.checked }))}
                    />
                    Repeat weekly
                  </label>
                  {form.repeatWeekly ? (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.repeatUntilEndOfSemester}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, repeatUntilEndOfSemester: e.target.checked }))
                          }
                        />
                        Repeat until end of semester
                      </label>
                      {!form.repeatUntilEndOfSemester ? (
                        <Input
                          type="date"
                          value={form.repeatUntil}
                          onChange={(e) => setForm((f) => ({ ...f, repeatUntil: e.target.value }))}
                          placeholder="End date"
                        />
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Each week appears on your calendar and all enrolled students. Use &quot;Remove this
                        week only&quot; to exclude a date.
                      </p>
                    </>
                  ) : null}
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyStudents}
                  onChange={(e) => setForm((f) => ({ ...f, notifyStudents: e.target.checked }))}
                />
                Notify students when saved
              </label>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button disabled={saving} onClick={() => void saveEvent()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingId ? 'Save changes' : 'Create event'}
                </Button>
                {editingId ? (
                  <>
                    {form.repeatWeekly && editingOccurrence ? (
                      <Button
                        variant="outline"
                        disabled={saving}
                        onClick={() => void deleteEvent('occurrence')}
                      >
                        Remove this date
                      </Button>
                    ) : null}
                    <Button variant="destructive" disabled={saving} onClick={() => void deleteEvent('series')}>
                      Delete all
                    </Button>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
