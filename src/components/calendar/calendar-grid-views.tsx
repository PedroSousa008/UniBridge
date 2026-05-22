'use client';

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
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarGridEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  editable?: boolean;
  subType?: string;
};

export type SubjectCalendarViewMode = 'month' | 'week' | 'day';

export function navigateCalendarCursor(
  dir: -1 | 1,
  view: SubjectCalendarViewMode,
  cursor: Date,
  set: (d: Date) => void
) {
  if (view === 'month') set(dir > 0 ? addMonths(cursor, 1) : subMonths(cursor, 1));
  else if (view === 'week') set(dir > 0 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
  else set(addDays(cursor, dir));
}

export function MonthView({
  month,
  events,
  onSelect,
  onDayClick,
}: {
  month: Date;
  events: CalendarGridEvent[];
  onSelect: (e: CalendarGridEvent) => void;
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

export function WeekDayView({
  start,
  days,
  events,
  onSelect,
}: {
  start: Date;
  days: number;
  events: CalendarGridEvent[];
  onSelect: (e: CalendarGridEvent) => void;
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
                  <EventBlock key={e.id} event={e} onSelect={onSelect} />
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
}: {
  event: CalendarGridEvent;
  onSelect: (e: CalendarGridEvent) => void;
}) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const top = (start.getHours() - 7) * 48 + (start.getMinutes() / 60) * 48;
  const h = Math.max(24, ((end.getTime() - start.getTime()) / 3600000) * 48);
  const urgent = event.subType === 'exam' || event.subType === 'assignment';

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border p-1 text-left text-[10px] text-white shadow-sm transition-shadow hover:shadow-md',
        urgent && 'ring-2 ring-red-300/50'
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
