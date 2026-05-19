'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AddClassDialog } from '@/components/student/schedule/add-class-dialog';
import {
  CALENDAR_START_HOUR,
  calendarHours,
  CLASS_TYPE_LABELS,
  currentTimeLineTopPx,
  gridTotalHeightPx,
  heightPx,
  minutesUntilClass,
  nextClassToday,
  parseTimeToMinutes,
  shouldShowCountdown,
  topOffsetPx,
  type CalendarClass,
  type EnrolledSubjectOption,
  WEEK_DAYS_MON_FIRST,
} from '@/lib/student/weekly-schedule';

type ViewMode = 'week' | 'day' | 'agenda';

interface WeeklyScheduleClientProps {
  initialClasses: CalendarClass[];
  subjects: EnrolledSubjectOption[];
  dbSyncNeeded?: boolean;
}

export function WeeklyScheduleClient({
  initialClasses,
  subjects,
  dbSyncNeeded = false,
}: WeeklyScheduleClientProps) {
  const router = useRouter();
  const [classes, setClasses] = useState(initialClasses);
  const [view, setView] = useState<ViewMode>('week');
  const [mobileDay, setMobileDay] = useState<number>(() => new Date().getDay());
  const [now, setNow] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarClass | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const touchRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const today = now.getDay();
  const hours = calendarHours();
  const gridHeight = gridTotalHeightPx();
  const timeLineTop = currentTimeLineTopPx(now);
  const nextClass = nextClassToday(classes, now);

  useEffect(() => {
    setClasses(initialClasses);
  }, [initialClasses]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setView('day');
      setMobileDay(today);
    }
  }, [today]);

  const visibleDays = useMemo(() => {
    if (view === 'day') {
      return WEEK_DAYS_MON_FIRST.filter((w) => w.dayOfWeek === mobileDay);
    }
    return WEEK_DAYS_MON_FIRST;
  }, [view, mobileDay]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(cls: CalendarClass) {
    if (!cls.canEdit) return;
    setEditing(cls);
    setDialogOpen(true);
  }

  async function deleteClass(cls: CalendarClass) {
    if (!cls.canEdit) return;
    if (!confirm('Remove this class from your schedule?')) return;
    await fetch(`/api/student/schedule/${cls.id}`, { method: 'DELETE' });
    setClasses((list) => list.filter((c) => c.id !== cls.id));
    refresh();
  }

  function classesForDay(dayOfWeek: number) {
    return classes
      .filter((c) => c.dayOfWeek === dayOfWeek)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }

  function swipeDay(dir: -1 | 1) {
    const order: number[] = WEEK_DAYS_MON_FIRST.map((d) => d.dayOfWeek);
    const idx = order.indexOf(mobileDay);
    const next = order[(idx + dir + order.length) % order.length];
    setMobileDay(next);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: Math.hypot(dx, dy) };
    } else if (e.touches.length === 1) {
      touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && touchRef.current?.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - touchRef.current.dist;
      setScale((s) => Math.min(2, Math.max(0.6, s + delta * 0.002)));
      touchRef.current = { ...touchRef.current, dist };
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches.length === 1 && touchRef.current && touchRef.current.dist === 0) {
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      if (Math.abs(dx) > 60) swipeDay(dx > 0 ? -1 : 1);
    }
    touchRef.current = null;
  }

  const hasClasses = classes.length > 0;

  return (
    <div>
      {dbSyncNeeded ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Custom classes need a database update. The calendar still works — run{' '}
          <code className="rounded bg-amber-100 px-1">npm run db:push</code> against your Neon database
          to enable saving new classes.
        </div>
      ) : null}

      <PageHeader
        title="Weekly Schedule"
        subtitle="Your classes, workshops, labs and seminars — all in one calendar."
        action={
          <Button className="hidden sm:inline-flex" onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add class
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['week', 'day', 'agenda'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setView(mode)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              view === mode
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {mode === 'week' ? 'Week view' : mode === 'day' ? 'Day view' : 'Agenda'}
          </button>
        ))}
        {view === 'day' ? (
          <div className="flex w-full flex-wrap gap-1 sm:w-auto">
            {WEEK_DAYS_MON_FIRST.map((d) => (
              <button
                key={d.dayOfWeek}
                type="button"
                onClick={() => setMobileDay(d.dayOfWeek)}
                className={cn(
                  'rounded-lg px-2 py-1 text-xs font-medium',
                  mobileDay === d.dayOfWeek
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : null}
        {view === 'day' ? (
          <span className="w-full text-xs text-muted-foreground sm:hidden">
            Swipe left or right to change day · pinch to zoom
          </span>
        ) : null}
      </div>

      {!hasClasses && view !== 'agenda' ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
          No classes scheduled.
        </p>
      ) : null}

      {view === 'agenda' ? (
        <AgendaView
          classes={classes}
          nextClass={nextClass}
          now={now}
          onEdit={openEdit}
          onDelete={deleteClass}
        />
      ) : (
        <div
          ref={gridRef}
          className="overflow-auto rounded-xl border border-border bg-card touch-pan-y"
          style={{ maxHeight: 'min(75vh, 720px)' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` }}
          >
            <div className="flex min-w-[640px]">
              <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-border bg-card">
                <div className="h-10 border-b border-border" />
                <div className="relative" style={{ height: gridHeight }}>
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute right-2 text-[10px] text-muted-foreground -translate-y-1/2"
                      style={{ top: topOffsetPx(h) }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-1">
                {visibleDays.map((day) => {
                  const isToday = day.dayOfWeek === today;
                  const dayClasses = classesForDay(day.dayOfWeek);

                  return (
                    <div
                      key={day.dayOfWeek}
                      className={cn(
                        'relative min-w-0 flex-1 border-r border-border last:border-r-0',
                        isToday && 'bg-primary/[0.04]'
                      )}
                    >
                      <div
                        className={cn(
                          'sticky top-0 z-10 border-b border-border px-1 py-2 text-center text-xs font-semibold',
                          isToday && 'text-primary'
                        )}
                      >
                        <span className="hidden sm:inline">{day.full}</span>
                        <span className="sm:hidden">{day.label}</span>
                      </div>

                      <div className="relative" style={{ height: gridHeight }}>
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 border-t border-border/60"
                            style={{ top: topOffsetPx(h) }}
                          />
                        ))}
                        {hours.map((h) => {
                          const half = topOffsetPx(h.replace(':00', ':30'));
                          if (!h.endsWith(':00')) return null;
                          return (
                            <div
                              key={`${h}-half`}
                              className="absolute left-0 right-0 border-t border-dashed border-border/30"
                              style={{ top: half }}
                            />
                          );
                        })}

                        {isToday && timeLineTop != null ? (
                          <div
                            className="absolute left-0 right-0 z-30 border-t-2 border-red-500"
                            style={{ top: timeLineTop }}
                          >
                            <span className="absolute -left-1 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                          </div>
                        ) : null}

                        {dayClasses.length === 0 && view === 'day' ? (
                          <p className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
                            No classes scheduled.
                          </p>
                        ) : null}

                        {dayClasses.map((cls) => (
                          <ClassBlock
                            key={cls.id}
                            cls={cls}
                            expanded={expandedId === cls.id}
                            showCountdown={shouldShowCountdown(cls, nextClass, now)}
                            minutesUntil={
                              shouldShowCountdown(cls, nextClass, now)
                                ? minutesUntilClass(cls, now)
                                : null
                            }
                            onTap={() =>
                              setExpandedId((id) => (id === cls.id ? null : cls.id))
                            }
                            onEdit={() => openEdit(cls)}
                            onDelete={() => void deleteClass(cls)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg sm:hidden"
        size="icon"
        onClick={openAdd}
        aria-label="Add class"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subjects={subjects}
        editing={editing}
        onSaved={() => {
          refresh();
        }}
      />
    </div>
  );
}

function ClassBlock({
  cls,
  expanded,
  showCountdown,
  minutesUntil,
  onTap,
  onEdit,
  onDelete,
}: {
  cls: CalendarClass;
  expanded: boolean;
  showCountdown: boolean;
  minutesUntil: number | null;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const top = topOffsetPx(cls.startTime);
  const h = heightPx(cls.startTime, cls.endTime);
  const location = cls.isOnline
    ? 'Online'
    : [cls.building, cls.room].filter(Boolean).join(' · ') || cls.room || '—';

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border border-white/20 p-1.5 text-left text-white shadow-sm transition-shadow hover:shadow-md sm:p-2',
        expanded && 'z-20 ring-2 ring-white/50'
      )}
      style={{
        top,
        height: Math.max(h, expanded ? 120 : h),
        backgroundColor: cls.color,
      }}
    >
      <p className="truncate text-[11px] font-semibold leading-tight sm:text-xs">{cls.subjectName}</p>
      <Badge
        className="mt-0.5 border-0 bg-black/20 px-1 py-0 text-[9px] text-white hover:bg-black/20"
        variant="secondary"
      >
        {CLASS_TYPE_LABELS[cls.classType]}
      </Badge>
      <p className="mt-0.5 text-[9px] opacity-90 sm:text-[10px]">
        {cls.startTime} – {cls.endTime}
      </p>
      {!expanded ? (
        <p className="truncate text-[9px] opacity-80">{location}</p>
      ) : (
        <div className="mt-1 space-y-0.5 text-[10px] opacity-95">
          <p>{location}</p>
          {cls.professor ? <p>Prof. {cls.professor}</p> : null}
          {cls.attendancePercent != null ? (
            <p>Attendance {Math.round(cls.attendancePercent)}%</p>
          ) : null}
          {cls.canEdit ? (
            <span className="mt-1 flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button type="button" size="sm" variant="secondary" className="h-6 text-[10px]" onClick={onEdit}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-6 px-1"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          ) : null}
        </div>
      )}
      {showCountdown && minutesUntil != null ? (
        <p className="mt-0.5 text-[9px] font-medium text-white/95">
          Starts in {minutesUntil} min
        </p>
      ) : null}
    </button>
  );
}

function AgendaView({
  classes,
  nextClass,
  now,
  onEdit,
  onDelete,
}: {
  classes: CalendarClass[];
  nextClass: CalendarClass | null;
  now: Date;
  onEdit: (c: CalendarClass) => void;
  onDelete: (c: CalendarClass) => void;
}) {
  if (classes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
        No classes scheduled.
      </p>
    );
  }

  const sorted = [...classes].sort((a, b) => {
    const dayA = WEEK_DAYS_MON_FIRST.findIndex((d) => d.dayOfWeek === a.dayOfWeek);
    const dayB = WEEK_DAYS_MON_FIRST.findIndex((d) => d.dayOfWeek === b.dayOfWeek);
    if (dayA !== dayB) return dayA - dayB;
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });

  return (
    <div className="space-y-3">
      {sorted.map((cls) => {
        const day = WEEK_DAYS_MON_FIRST.find((d) => d.dayOfWeek === cls.dayOfWeek);
        const location = cls.isOnline
          ? 'Online'
          : [cls.building, cls.room].filter(Boolean).join(' · ') || '—';
        return (
          <div
            key={cls.id}
            className="rounded-xl border border-border p-4"
            style={{ borderLeftWidth: 4, borderLeftColor: cls.color }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{cls.subjectName}</p>
                <p className="text-xs text-muted-foreground">
                  {day?.full} · {cls.startTime} – {cls.endTime}
                </p>
              </div>
              <Badge variant="secondary">{CLASS_TYPE_LABELS[cls.classType]}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{location}</p>
            {cls.professor ? <p className="text-sm">Professor: {cls.professor}</p> : null}
            {cls.attendancePercent != null ? (
              <p className="text-xs text-muted-foreground">
                Attendance {Math.round(cls.attendancePercent)}%
              </p>
            ) : null}
            {shouldShowCountdown(cls, nextClass, now) ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Starts in {minutesUntilClass(cls, now)} min
              </p>
            ) : null}
            {cls.canEdit ? (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(cls)}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => void onDelete(cls)}>
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
