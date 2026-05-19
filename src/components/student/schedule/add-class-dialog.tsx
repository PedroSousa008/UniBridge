'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ClassSessionType } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CALENDAR_END_HOUR,
  CALENDAR_START_HOUR,
  CLASS_TYPE_LABELS,
  DEFAULT_CLASS_COLORS,
  durationMinutes,
  formatDuration,
  type CalendarClass,
  type EnrolledSubjectOption,
  WEEK_DAYS_MON_FIRST,
} from '@/lib/student/weekly-schedule';
import { Loader2 } from 'lucide-react';

const CLASS_TYPES = Object.keys(CLASS_TYPE_LABELS) as ClassSessionType[];

function timeOptions() {
  const opts: string[] = [];
  for (let h = CALENDAR_START_HOUR; h <= CALENDAR_END_HOUR; h++) {
    for (const m of [0, 30]) {
      if (h === CALENDAR_END_HOUR && m > 0) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

const TIMES = timeOptions();

export interface ClassFormState {
  subjectName: string;
  subjectId: string;
  classType: ClassSessionType;
  professor: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  repeatWeekly: boolean;
  building: string;
  room: string;
  isOnline: boolean;
  color: string;
}

function emptyForm(): ClassFormState {
  return {
    subjectName: '',
    subjectId: '',
    classType: 'LECTURE',
    professor: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:30',
    repeatWeekly: true,
    building: '',
    room: '',
    isOnline: false,
    color: DEFAULT_CLASS_COLORS.LECTURE,
  };
}

function fromClass(cls: CalendarClass): ClassFormState {
  return {
    subjectName: cls.subjectName,
    subjectId: cls.subjectId ?? '',
    classType: cls.classType,
    professor: cls.professor ?? '',
    dayOfWeek: cls.dayOfWeek,
    startTime: cls.startTime,
    endTime: cls.endTime,
    repeatWeekly: cls.repeatWeekly,
    building: cls.building ?? '',
    room: cls.room ?? '',
    isOnline: cls.isOnline,
    color: cls.color,
  };
}

interface AddClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: EnrolledSubjectOption[];
  editing: CalendarClass | null;
  onSaved: () => void;
}

export function AddClassDialog({
  open,
  onOpenChange,
  subjects,
  editing,
  onSaved,
}: AddClassDialogProps) {
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(editing ? fromClass(editing) : emptyForm());
      setError('');
    }
  }, [open, editing]);

  const duration = useMemo(
    () => durationMinutes(form.startTime, form.endTime),
    [form.startTime, form.endTime]
  );

  function setType(type: ClassSessionType) {
    setForm((f) => ({
      ...f,
      classType: type,
      color: f.color === DEFAULT_CLASS_COLORS[f.classType] ? DEFAULT_CLASS_COLORS[type] : f.color,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subjectName.trim()) {
      setError('Subject is required');
      return;
    }
    if (duration <= 0) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        subjectId: form.subjectId || null,
        professor: form.professor || null,
        building: form.building || null,
        room: form.room || null,
      };

      if (editing?.source === 'university') {
        setError('University classes cannot be edited here.');
        return;
      }

      const res = await fetch(editing ? `/api/student/schedule/${editing.id}` : '/api/student/schedule', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save class');

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit class' : 'Add class'}</DialogTitle>
            <DialogDescription>
              Fill in academic info, time, and location. Duration is calculated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Academic info</h3>
              {subjects.length > 0 ? (
                <select
                  className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                  value={form.subjectId}
                  onChange={(e) => {
                    const sub = subjects.find((s) => s.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      subjectId: e.target.value,
                      subjectName: sub?.name ?? f.subjectName,
                    }));
                  }}
                >
                  <option value="">Custom subject name</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.code ? ` (${s.code})` : ''}
                    </option>
                  ))}
                </select>
              ) : null}
              <Input
                placeholder="Subject name"
                value={form.subjectName}
                onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))}
                required
              />
              <div className="flex flex-wrap gap-2">
                {CLASS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className="rounded-full px-3 py-1 text-xs font-medium border transition-colors"
                    style={{
                      borderColor: form.classType === t ? form.color : 'var(--border)',
                      backgroundColor: form.classType === t ? `${form.color}22` : 'transparent',
                    }}
                  >
                    {CLASS_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Professor"
                value={form.professor}
                onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Time</h3>
              <select
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                value={form.dayOfWeek}
                onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))}
              >
                {WEEK_DAYS_MON_FIRST.map((d) => (
                  <option key={d.dayOfWeek} value={d.dayOfWeek}>
                    {d.full}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Start</label>
                  <select
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End</label>
                  <select
                    className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  >
                    {TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Duration:{' '}
                <strong>{duration > 0 ? formatDuration(duration) : '—'}</strong>
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.repeatWeekly}
                  onChange={(e) => setForm((f) => ({ ...f, repeatWeekly: e.target.checked }))}
                />
                Repeat weekly
              </label>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Location</h3>
              <Input
                placeholder="Building"
                value={form.building}
                disabled={form.isOnline}
                onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
              />
              <Input
                placeholder="Room"
                value={form.room}
                disabled={form.isOnline}
                onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isOnline}
                  onChange={(e) => setForm((f) => ({ ...f, isOnline: e.target.checked }))}
                />
                Online class
              </label>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Color</h3>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-14 cursor-pointer rounded border border-border"
                />
                <span className="text-xs text-muted-foreground">
                  Default: {CLASS_TYPE_LABELS[form.classType]}
                </span>
              </div>
            </section>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save' : 'Add class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
