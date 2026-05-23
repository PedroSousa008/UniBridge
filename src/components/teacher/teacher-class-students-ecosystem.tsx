'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Mail,
  MessageSquare,
  Plus,
  Radio,
  Search,
  StickyNote,
  Users,
} from 'lucide-react';
import type { TeacherClassStudentsHub } from '@/lib/teacher/teacher-class-students-hub';
import {
  matchesStudentFilter,
  matchesStudentSearch,
  type StudentAcademicFilter,
} from '@/lib/teacher/teacher-students-shared';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FILTERS: { id: StudentAcademicFilter; label: string }[] = [
  { id: 'all', label: 'All students' },
  { id: 'needs_support', label: 'Needing support' },
  { id: 'low_attendance', label: 'Low attendance' },
  { id: 'missing_assignments', label: 'Missing work' },
  { id: 'top_performers', label: 'Top performers' },
  { id: 'highly_active', label: 'Highly active' },
];

export function TeacherClassStudentsEcosystem({
  initialHub,
}: {
  initialHub: TeacherClassStudentsHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentAcademicFilter>('all');
  const [groupName, setGroupName] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/teacher/students/${hub.subject.id}`);
    if (res.ok) setHub(await res.json());
  }, [hub.subject.id]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 45_000);
    return () => clearInterval(id);
  }, [refresh]);

  const filtered = useMemo(() => {
    return hub.students.filter((s) => {
      if (!matchesStudentFilter(s, filter)) return false;
      return matchesStudentSearch(s, query);
    });
  }, [hub.students, filter, query]);

  async function saveNote(studentId: string, note: string) {
    await fetch(`/api/teacher/students/${hub.subject.id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, note }),
    });
    void refresh();
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    await fetch(`/api/teacher/students/${hub.subject.id}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName.trim(), memberIds: [] }),
    });
    setGroupName('');
    setShowGroupForm(false);
    void refresh();
  }

  const sub = hub.subject;

  return (
    <div>
      <Link
        href="/teacher/students"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        All classes
      </Link>

      <PageHeader
        title={sub.name}
        subtitle={[sub.courseName, sub.semester, sub.academicYear ? `Year ${sub.academicYear}` : null]
          .filter(Boolean)
          .join(' · ')}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Students" value={String(hub.students.length)} />
        <SummaryCard
          label="Class grade (published)"
          value={hub.classAverageGrade != null ? String(hub.classAverageGrade) : '—'}
        />
        <SummaryCard
          label="Need support"
          value={String(hub.studentsNeedingSupport)}
          warn={hub.studentsNeedingSupport > 0}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
        <Radio className="h-4 w-4 text-brand animate-pulse" />
        <span className="text-muted-foreground">
          Live sync with attendance, gradebook, and assignments — overall grades use only published
          components.
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name, email, course, year, attendance, engagement, support signals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === f.id
                ? 'border-brand bg-brand text-white'
                : 'border-border bg-background text-muted-foreground hover:border-brand/40'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-brand" />
            Custom groups
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowGroupForm((v) => !v)}>
            <Plus className="mr-1 h-3 w-3" />
            New group
          </Button>
        </div>
        {showGroupForm ? (
          <div className="mb-3 flex gap-2">
            <Input
              placeholder="e.g. Project Group A, Students Needing Support"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <Button onClick={() => void createGroup()}>Create</Button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {hub.groups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Create groups to organize students and add private notes.</p>
          ) : (
            hub.groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="text-xs">
                {g.name} ({g.memberIds.length})
              </Badge>
            ))
          )}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Showing {filtered.length} of {hub.students.length} students
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            scaleHint={hub.classAverageGrade != null ? `of ${hub.classAverageGrade} class avg` : undefined}
            onSaveNote={(note) => void saveNote(s.id, note)}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-semibold', warn && 'text-rose-600')}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StudentCard({
  student: s,
  onSaveNote,
}: {
  student: TeacherClassStudentsHub['students'][0];
  scaleHint?: string;
  onSaveNote: (note: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(s.privateNote ?? '');

  return (
    <Card
      className={cn(
        'overflow-hidden border-border/70 transition-shadow hover:shadow-md',
        s.needsSupport && 'border-rose-500/30'
      )}
    >
      <div
        className={cn(
          'h-1',
          s.needsSupport
            ? 'bg-gradient-to-r from-rose-500/80 to-amber-500/60'
            : 'bg-gradient-to-r from-brand/50 to-violet-500/40'
        )}
      />
      <CardContent className="space-y-3 p-4">
        <Link href={s.profileHref} className="flex items-start gap-3 group">
          <StudentAvatar name={s.name} image={s.image} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight group-hover:text-brand">{s.name}</h3>
            <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3 shrink-0" />
              {s.email}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[s.courseName, s.yearOfStudy ? `Year ${s.yearOfStudy}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-1">
          {s.alerts.map((a) => (
            <span
              key={a.id}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium border',
                a.tone === 'critical' && 'bg-rose-500/10 text-rose-800 border-rose-500/25',
                a.tone === 'warning' && 'bg-amber-500/10 text-amber-900 border-amber-500/25',
                a.tone === 'info' && 'bg-sky-500/10 text-sky-900 border-sky-500/25'
              )}
            >
              {a.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 px-2 py-1.5">
            <span className="text-muted-foreground">Attendance</span>
            <p className="font-semibold">
              {s.attendancePercent != null ? `${s.attendancePercent}%` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1.5">
            <span className="text-muted-foreground">Overall (published)</span>
            <p className="font-semibold text-brand">{s.overallGradeDisplay}</p>
          </div>
        </div>

        {s.componentGrades.length > 0 ? (
          <ul className="space-y-1 text-xs border-t border-border/60 pt-2">
            {s.componentGrades.slice(0, 4).map((c) => (
              <li key={c.name} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{c.name}</span>
                <span className="font-mono font-medium shrink-0">{c.display}</span>
              </li>
            ))}
            {s.componentGrades.length > 4 ? (
              <li className="text-muted-foreground">+{s.componentGrades.length - 4} more</li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={s.messageHref}>
              <MessageSquare className="mr-1 h-3 w-3" />
              Message
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNoteOpen((v) => !v)}
            title="Private teacher note"
          >
            <StickyNote className="h-3 w-3" />
          </Button>
        </div>

        {noteOpen ? (
          <div className="space-y-2 border-t pt-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Private — students never see this
            </p>
            <textarea
              className="w-full rounded-lg border bg-background p-2 text-xs min-h-[60px]"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Needs support, strong participation…"
            />
            <Button size="sm" className="w-full" onClick={() => onSaveNote(noteDraft)}>
              Save note
            </Button>
          </div>
        ) : s.privateNote ? (
          <p className="text-xs text-muted-foreground italic border-t pt-2 line-clamp-2">
            Note: {s.privateNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StudentAvatar({ name, image }: { name: string; image: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 rounded-full object-cover border"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand border border-brand/20">
      {initials}
    </div>
  );
}
