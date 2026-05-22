'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, MapPin, RefreshCw, X } from 'lucide-react';
import {
  MonthView,
  navigateCalendarCursor,
  WeekDayView,
  type CalendarGridEvent,
  type SubjectCalendarViewMode,
} from '@/components/calendar/calendar-grid-views';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { SubjectCalendarEventDto } from '@/lib/teacher/subject-calendar-hub';
import type { UnifiedCalendarEvent } from '@/lib/student/unified-calendar';

const VIEWS: { id: SubjectCalendarViewMode; label: string }[] = [
  { id: 'month', label: 'Monthly' },
  { id: 'week', label: 'Weekly' },
  { id: 'day', label: 'Daily' },
];

const POLL_MS = 25_000;

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

function sourceLabel(source: string): string {
  if (source === 'subject-calendar') return 'Class event';
  if (source === 'assignment') return 'Assignment deadline';
  if (source === 'exam') return 'Exam';
  return 'Event';
}

export function StudentSubjectCalendarPanel({
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
  const [events, setEvents] = useState(initialEvents);
  const [rawEvents, setRawEvents] = useState(initialRaw);
  const [view, setView] = useState<SubjectCalendarViewMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<UnifiedCalendarEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const gridEvents = useMemo(() => toGrid(events), [events]);

  const refresh = useCallback(async (silent = true) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`/api/student/subjects/${subjectId}/calendar`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        events: UnifiedCalendarEvent[];
        raw: SubjectCalendarEventDto[];
      };
      setEvents(data.events);
      setRawEvents(data.raw);
      if (selected) {
        const next = data.events.find((e) => e.id === selected.id);
        if (next) setSelected(next);
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [subjectId, selected]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const monthStart = startOfMonth(cursor);
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });

  const headerLabel =
    view === 'month'
      ? format(monthStart, 'MMMM yyyy')
      : view === 'week'
        ? `${format(weekStart, 'd MMM')} – ${format(new Date(weekStart.getTime() + 6 * 86400000), 'd MMM yyyy')}`
        : format(cursor, 'EEEE, d MMMM yyyy');

  const selectedRaw =
    selected?.source === 'subject-calendar' && selected.sourceId
      ? rawEvents.find((r) => r.id === selected.sourceId)
      : null;

  const selectedTypeLabel = selectedRaw
    ? selectedRaw.eventTypeLabel
    : selected?.source === 'assignment'
      ? 'Assignment Deadline'
      : selected?.source === 'exam'
        ? 'Exam'
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{subjectName} — Calendar</h2>
          <p className="text-sm text-muted-foreground">
            Your professor&apos;s schedule syncs here automatically — classes, exams, and deadlines.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={refreshing} onClick={() => void refresh(false)}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
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

      {events.length === 0 ? (
        <EmptyState
          iconName="book-open"
          title="No events yet"
          description="When your professor adds classes, exams, or deadlines, they will appear here automatically."
          className="py-12"
        />
      ) : view === 'month' ? (
        <MonthView
          month={monthStart}
          events={gridEvents}
          onSelect={(e) => {
            const full = events.find((x) => x.id === e.id);
            if (full) setSelected(full);
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
            if (full) setSelected(full);
          }}
        />
      )}

      {selected ? (
        <Card className="border-brand/20">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{selected.title}</CardTitle>
                {selectedTypeLabel ? <Badge variant="secondary">{selectedTypeLabel}</Badge> : null}
                <Badge variant="outline">{sourceLabel(selected.source)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {format(new Date(selected.start), 'EEEE, d MMMM yyyy')}
              </p>
              <p className="text-sm font-medium">
                {format(new Date(selected.start), 'HH:mm')} – {format(new Date(selected.end), 'HH:mm')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedRaw?.repeatWeekly ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground">
                Repeats every week
                {selectedRaw.repeatUntil
                  ? ` until ${format(new Date(selectedRaw.repeatUntil), 'd MMM yyyy')}`
                  : ' for the semester'}
                {parseInstanceId(selected.id).occurrence
                  ? ` · This session: ${format(new Date(selected.start), 'd MMM')}`
                  : ''}
              </p>
            ) : null}

            {(selected.location || selectedRaw?.room) && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  {selected.location ? <p>{selected.location}</p> : null}
                  {selectedRaw?.room ? (
                    <p className="text-muted-foreground">Room {selectedRaw.room}</p>
                  ) : null}
                </div>
              </div>
            )}

            {(selectedRaw?.description || selected.description) ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap">
                  {selectedRaw?.description || selected.description}
                </p>
              </div>
            ) : null}

            {selected.source === 'assignment' || selected.source === 'exam' ? (
              <p className="text-xs text-muted-foreground">
                Managed in the gradebook — dates update when your professor changes them.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
