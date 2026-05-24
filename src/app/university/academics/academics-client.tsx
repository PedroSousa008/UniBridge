'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Plus, Trash2, UserPlus, X, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SectionTabs } from '@/components/university/section-tabs';
import { DataTable, type Column } from '@/components/university/data-table';
import { StudentSubjectPicker } from '@/components/university/student-subject-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatSubjectSemester,
  normalizeSubjectSemester,
  SUBJECT_SEMESTER_OPTIONS,
} from '@/lib/academics/subject-semester';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TABS = [
  { id: 'courses', label: 'Courses' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'students', label: 'Students' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'announcements', label: 'Announcements' },
];

const selectClassName =
  'flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm';

function SubjectSemesterSelect({
  name,
  defaultValue = '',
  required,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const normalized = normalizeSubjectSemester(defaultValue) || defaultValue;
  return (
    <select name={name} required={required} className={selectClassName} defaultValue={normalized}>
      <option value="" disabled>
        Select semester
      </option>
      {SUBJECT_SEMESTER_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ColumnFilterHeader({
  label,
  activeCount,
  open,
  onToggle,
  onClear,
  children,
}: {
  label: string;
  activeCount: number;
  open: boolean;
  onToggle: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60 hover:text-foreground"
      >
        {label}
        {activeCount > 0 ? (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {activeCount}
          </Badge>
        ) : null}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-xl border bg-card p-2 shadow-lg">
          {children}
          {activeCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 w-full text-xs" onClick={onClear}>
              Clear filter
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface AcademicsCourse {
  id: string;
  name: string;
  department: string | null;
  duration: string | null;
  degreeType: string | null;
  status: string;
  studentCount: number;
  subjectCount: number;
  coordinatorName: string | null;
}

export interface AcademicsSubject {
  id: string;
  name: string;
  code: string | null;
  courseId: string | null;
  courseName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  year: number | null;
  semester: string | null;
  credits: number | null;
  status: string;
}

export interface AcademicsTeacher {
  id: string;
  name: string;
  email: string;
  department: string | null;
  title: string | null;
  status: string;
}

export interface AcademicsStudent {
  id: string;
  name: string;
  email: string;
  program: string | null;
  yearOfStudy: number | null;
  courseId: string | null;
  engagementScore: number;
  employabilityScore: number;
  courseName: string | null;
  enrolledSubjectIds: string[];
  completedCredits: number;
}

type DeleteTarget = {
  kind: 'course' | 'subject' | 'student';
  id: string;
  label: string;
  detail?: string;
};

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={onDelete}
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export interface AcademicsCalendarEvent {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string | null;
}

export interface AcademicsAnnouncement {
  id: string;
  title: string;
  audience: string;
  priority: string;
  status: string;
  publishedAt: string | null;
}

export interface UniversityAcademicsClientProps {
  courses: AcademicsCourse[];
  subjects: AcademicsSubject[];
  teachers: AcademicsTeacher[];
  students: AcademicsStudent[];
  calendarEvents: AcademicsCalendarEvent[];
  announcements: AcademicsAnnouncement[];
}

export function UniversityAcademicsClient({
  courses,
  subjects,
  teachers,
  students,
  calendarEvents,
  announcements,
}: UniversityAcademicsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'courses');
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [inviteTeacherOpen, setInviteTeacherOpen] = useState(false);
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<AcademicsCourse | null>(null);
  const [editSubject, setEditSubject] = useState<AcademicsSubject | null>(null);
  const [editStudent, setEditStudent] = useState<AcademicsStudent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [subjectCourseFilter, setSubjectCourseFilter] = useState<string[]>([]);
  const [subjectYearFilter, setSubjectYearFilter] = useState<number[]>([]);
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState<string[]>([]);
  const [openSubjectColumnFilter, setOpenSubjectColumnFilter] = useState<'year' | 'semester' | null>(
    null
  );
  const [inviteSelectedSubjectIds, setInviteSelectedSubjectIds] = useState<string[]>([]);
  const [editSelectedSubjectIds, setEditSelectedSubjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filter = searchParams.get('filter');

  const filteredStudents = useCallback(() => {
    if (!filter) return students;
    switch (filter) {
      case 'improving':
        return students.filter((s) => s.employabilityScore >= 50);
      case 'at-risk':
        return students.filter((s) => s.engagementScore < 30 && s.employabilityScore < 40);
      case 'no-path':
        return students.filter((s) => s.employabilityScore < 30);
      case 'internship-ready':
        return students.filter((s) => s.employabilityScore >= 65);
      case 'engaged':
        return students.filter((s) => s.engagementScore >= 70);
      default:
        return students;
    }
  }, [students, filter]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      if (subjectCourseFilter.length > 0 && (!s.courseId || !subjectCourseFilter.includes(s.courseId))) {
        return false;
      }
      if (subjectYearFilter.length > 0 && (s.year == null || !subjectYearFilter.includes(s.year))) {
        return false;
      }
      if (subjectSemesterFilter.length > 0) {
        const sem = s.semester?.trim();
        if (!sem || !subjectSemesterFilter.includes(sem)) return false;
      }
      return true;
    });
  }, [subjects, subjectCourseFilter, subjectYearFilter, subjectSemesterFilter]);

  const subjectYearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const s of subjects) {
      if (s.year != null) years.add(s.year);
    }
    return [...years].sort((a, b) => a - b);
  }, [subjects]);

  function toggleSubjectYearFilter(year: number) {
    setSubjectYearFilter((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  }

  function toggleSubjectSemesterFilter(semester: string) {
    setSubjectSemesterFilter((prev) =>
      prev.includes(semester) ? prev.filter((s) => s !== semester) : [...prev, semester]
    );
  }

  function toggleSubjectCourseFilter(courseId: string) {
    setSubjectCourseFilter((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  }

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
    const action = searchParams.get('action');
    if (action === 'add' && t === 'courses') setAddCourseOpen(true);
    if (action === 'add' && t === 'subjects') setAddSubjectOpen(true);
    if (action === 'invite' && t === 'teachers') setInviteTeacherOpen(true);
    if (action === 'invite' && t === 'students') {
      setInviteStudentOpen(true);
      setInviteSelectedSubjectIds([]);
    }
    if (action === 'add' && t === 'announcements') setAnnouncementOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (editStudent) {
      setEditSelectedSubjectIds(editStudent.enrolledSubjectIds);
    }
  }, [editStudent]);

  async function requestJson(
    method: 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body?: Record<string, unknown>
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request failed');
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function postJson(url: string, body: Record<string, unknown>) {
    return requestJson('POST', url, body);
  }

  function courseDeleteTarget(c: AcademicsCourse): DeleteTarget {
    const parts: string[] = [];
    if (c.subjectCount > 0) parts.push(`${c.subjectCount} subject(s)`);
    if (c.studentCount > 0) parts.push(`${c.studentCount} student(s) will be unassigned`);
    return {
      kind: 'course',
      id: c.id,
      label: c.name,
      detail:
        parts.length > 0
          ? `This will permanently delete the course and its subjects. ${parts.join('. ')}.`
          : 'This will permanently delete the course.',
    };
  }

  const courseColumns: Column<AcademicsCourse>[] = [
    { key: 'name', header: 'Course', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'department', header: 'Department', cell: (r) => r.department ?? '—' },
    { key: 'coordinator', header: 'Coordinator', cell: (r) => r.coordinatorName ?? '—' },
    {
      key: 'counts',
      header: 'Students / Subjects',
      cell: (r) => `${r.studentCount} / ${r.subjectCount}`,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      cell: (r) => (
        <RowActions
          onEdit={() => {
            setError(null);
            setEditCourse(r);
          }}
          onDelete={() => {
            setError(null);
            setDeleteTarget(courseDeleteTarget(r));
          }}
        />
      ),
    },
  ];

  const subjectColumns: Column<AcademicsSubject>[] = [
    { key: 'name', header: 'Subject', cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: 'year',
      header: (
        <ColumnFilterHeader
          label="Year"
          activeCount={subjectYearFilter.length}
          open={openSubjectColumnFilter === 'year'}
          onToggle={() =>
            setOpenSubjectColumnFilter((v) => (v === 'year' ? null : 'year'))
          }
          onClear={() => setSubjectYearFilter([])}
        >
          <div className="space-y-1">
            {subjectYearOptions.map((year) => (
              <label key={year} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={subjectYearFilter.includes(year)}
                  onChange={() => toggleSubjectYearFilter(year)}
                />
                Year {year}
              </label>
            ))}
            {subjectYearOptions.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground">No years yet</p>
            ) : null}
          </div>
        </ColumnFilterHeader>
      ),
      cell: (r) => (r.year != null ? `Year ${r.year}` : '—'),
    },
    {
      key: 'semester',
      header: (
        <ColumnFilterHeader
          label="Semester"
          activeCount={subjectSemesterFilter.length}
          open={openSubjectColumnFilter === 'semester'}
          onToggle={() =>
            setOpenSubjectColumnFilter((v) => (v === 'semester' ? null : 'semester'))
          }
          onClear={() => setSubjectSemesterFilter([])}
        >
          <div className="space-y-1">
            {SUBJECT_SEMESTER_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={subjectSemesterFilter.includes(opt.value)}
                  onChange={() => toggleSubjectSemesterFilter(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </ColumnFilterHeader>
      ),
      cell: (r) => formatSubjectSemester(r.semester),
    },
    { key: 'course', header: 'Course', cell: (r) => r.courseName ?? '—' },
    {
      key: 'credits',
      header: 'Credits',
      cell: (r) => (r.credits != null ? r.credits : '—'),
    },
    { key: 'teacher', header: 'Teacher', cell: (r) => r.teacherName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      cell: (r) => (
        <RowActions
          onEdit={() => {
            setError(null);
            setEditSubject(r);
          }}
          onDelete={() => {
            setError(null);
            setDeleteTarget({
              kind: 'subject',
              id: r.id,
              label: r.name,
              detail: 'This will permanently delete the subject and related enrollments.',
            });
          }}
        />
      ),
    },
  ];

  const teacherColumns: Column<AcademicsTeacher>[] = [
    { key: 'name', header: 'Name', cell: (r) => r.name },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'department', header: 'Department', cell: (r) => r.department ?? '—' },
    { key: 'title', header: 'Title', cell: (r) => r.title ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
    },
  ];

  const studentColumns: Column<AcademicsStudent>[] = [
    { key: 'name', header: 'Student', cell: (r) => r.name },
    { key: 'program', header: 'Program', cell: (r) => r.program ?? '—' },
    { key: 'year', header: 'Year', cell: (r) => r.yearOfStudy ?? '—' },
    { key: 'course', header: 'Course', cell: (r) => r.courseName ?? '—' },
    {
      key: 'credits',
      header: 'Credits',
      cell: (r) => `${r.completedCredits} ECTS`,
    },
    {
      key: 'engagement',
      header: 'Engagement',
      cell: (r) => `${Math.round(r.engagementScore)}%`,
    },
    {
      key: 'employability',
      header: 'Employability',
      cell: (r) => `${Math.round(r.employabilityScore)}%`,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[100px]',
      cell: (r) => (
        <RowActions
          onEdit={() => {
            setError(null);
            setEditStudent(r);
          }}
          onDelete={() => {
            setError(null);
            setDeleteTarget({
              kind: 'student',
              id: r.id,
              label: r.name,
              detail:
                'This removes the student from your university. Their UniBridge account is not deleted.',
            });
          }}
        />
      ),
    },
  ];

  const scheduleColumns: Column<AcademicsCalendarEvent>[] = [
    { key: 'title', header: 'Event', cell: (r) => r.title },
    { key: 'type', header: 'Type', cell: (r) => r.eventType },
    {
      key: 'start',
      header: 'Start',
      cell: (r) => new Date(r.startDate).toLocaleString(),
    },
    {
      key: 'end',
      header: 'End',
      cell: (r) => (r.endDate ? new Date(r.endDate).toLocaleString() : '—'),
    },
  ];

  const announcementColumns: Column<AcademicsAnnouncement>[] = [
    { key: 'title', header: 'Title', cell: (r) => r.title },
    { key: 'audience', header: 'Audience', cell: (r) => r.audience },
    {
      key: 'priority',
      header: 'Priority',
      cell: (r) => <Badge variant={r.priority === 'high' ? 'brand' : 'secondary'}>{r.priority}</Badge>,
    },
    { key: 'status', header: 'Status', cell: (r) => r.status },
    {
      key: 'published',
      header: 'Published',
      cell: (r) => (r.publishedAt ? new Date(r.publishedAt).toLocaleDateString() : '—'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Academic management"
        subtitle="Courses, subjects, faculty, students, schedules, and announcements."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTabs tabs={TABS} active={tab} onChange={setTab} className="flex-1 border-0 pb-0" />
        <div className="flex gap-2">
          {tab === 'courses' ? (
            <Button size="sm" onClick={() => setAddCourseOpen(true)}>
              <Plus className="h-4 w-4" />
              Add course
            </Button>
          ) : null}
          {tab === 'subjects' ? (
            <Button
              size="sm"
              onClick={() => setAddSubjectOpen(true)}
              disabled={courses.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          ) : null}
          {tab === 'teachers' ? (
            <Button size="sm" onClick={() => setInviteTeacherOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite teacher
            </Button>
          ) : null}
          {tab === 'students' ? (
            <Button size="sm" onClick={() => setInviteStudentOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite student
            </Button>
          ) : null}
          {tab === 'announcements' ? (
            <Button size="sm" onClick={() => setAnnouncementOpen(true)}>
              <Plus className="h-4 w-4" />
              Create announcement
            </Button>
          ) : null}
        </div>
      </div>

      {filter && tab === 'students' ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Filter: <span className="font-medium text-foreground">{filter}</span>
        </p>
      ) : null}

      {tab === 'courses' ? (
        <DataTable columns={courseColumns} data={courses} emptyMessage="No courses yet." />
      ) : null}
      {tab === 'subjects' && courses.length === 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          Create a course first, then you can add subjects to it.
        </p>
      ) : null}
      {tab === 'subjects' && courses.length > 0 ? (
        <div className="mb-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Filter by course</span>
            <span className="text-xs text-muted-foreground">
              {subjectCourseFilter.length === 0
                ? 'Showing all courses'
                : `${subjectCourseFilter.length} selected`}
            </span>
            {subjectCourseFilter.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setSubjectCourseFilter([])}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {courses.map((c) => {
              const active = subjectCourseFilter.includes(c.id);
              return (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => toggleSubjectCourseFilter(c.id)}
                >
                  {c.name}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      {tab === 'subjects' ? (
        <DataTable
          columns={subjectColumns}
          data={filteredSubjects}
          emptyMessage={
            subjectCourseFilter.length > 0 ||
            subjectYearFilter.length > 0 ||
            subjectSemesterFilter.length > 0
              ? 'No subjects match the selected filters.'
              : 'No subjects yet.'
          }
        />
      ) : null}
      {tab === 'teachers' ? (
        <DataTable columns={teacherColumns} data={teachers} emptyMessage="No teachers yet." />
      ) : null}
      {tab === 'students' ? (
        <DataTable
          columns={studentColumns}
          data={filteredStudents()}
          emptyMessage="No students match this filter."
        />
      ) : null}
      {tab === 'schedules' ? (
        <DataTable columns={scheduleColumns} data={calendarEvents} emptyMessage="No events scheduled." />
      ) : null}
      {tab === 'announcements' ? (
        <DataTable columns={announcementColumns} data={announcements} emptyMessage="No announcements yet." />
      ) : null}

      <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/courses', {
                name: fd.get('name'),
                department: fd.get('department'),
                duration: fd.get('duration'),
                degreeType: fd.get('degreeType'),
              });
              if (ok) setAddCourseOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Add course</DialogTitle>
              <DialogDescription>Create a new course in your academic structure.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="name" placeholder="Course name" required />
              <Input name="department" placeholder="Department" />
              <Input name="duration" placeholder="Duration (e.g. 3 years)" />
              <Input name="degreeType" placeholder="Degree type" />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Create course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addSubjectOpen} onOpenChange={setAddSubjectOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/subjects', {
                name: fd.get('name'),
                courseId: fd.get('courseId'),
                year: fd.get('year'),
                semester: fd.get('semester'),
                credits: fd.get('credits'),
                teacherId: fd.get('teacherId') || undefined,
              });
              if (ok) setAddSubjectOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Add subject</DialogTitle>
              <DialogDescription>
                Link a subject to a course. Assign credits and semester so student progress can be
                tracked.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <select
                name="courseId"
                required
                className={selectClassName}
                defaultValue=""
              >
                <option value="" disabled>
                  Select course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input name="name" placeholder="Subject name" required />
              <div className="grid grid-cols-2 gap-3">
                <Input name="year" type="number" min={1} max={6} placeholder="Year" required />
                <SubjectSemesterSelect name="semester" required />
              </div>
              <Input
                name="credits"
                type="number"
                min={1}
                max={60}
                placeholder="Number of credits (ECTS)"
                required
              />
              <select name="teacherId" className={selectClassName} defaultValue="">
                <option value="">Assign teacher (optional)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Add subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={inviteStudentOpen}
        onOpenChange={(open) => {
          setInviteStudentOpen(open);
          if (!open) setInviteSelectedSubjectIds([]);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/students/invite', {
                email: fd.get('email'),
                program: fd.get('program'),
                yearOfStudy: fd.get('yearOfStudy'),
                courseId: fd.get('courseId') || undefined,
                subjectIds: inviteSelectedSubjectIds,
              });
              if (ok) {
                setInviteStudentOpen(false);
                setInviteSelectedSubjectIds([]);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite student</DialogTitle>
              <DialogDescription>
                Link an existing student account to your university. Choose their course and the
                subjects they are taking this semester.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="email" type="email" placeholder="Student email" required />
              <Input name="program" placeholder="Program (optional)" />
              <Input name="yearOfStudy" type="number" min={1} max={6} placeholder="Year of study" />
              <select name="courseId" required className={selectClassName} defaultValue="">
                <option value="" disabled>
                  Select course
                </option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <StudentSubjectPicker
                subjects={subjects}
                selectedIds={inviteSelectedSubjectIds}
                onChange={setInviteSelectedSubjectIds}
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting || courses.length === 0}>
                {submitting ? 'Linking…' : 'Invite student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteTeacherOpen} onOpenChange={setInviteTeacherOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/teachers/invite', {
                email: fd.get('email'),
                department: fd.get('department'),
                title: fd.get('title'),
              });
              if (ok) setInviteTeacherOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite teacher</DialogTitle>
              <DialogDescription>Link an existing teacher account to your university.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="email" type="email" placeholder="Teacher email" required />
              <Input name="department" placeholder="Department" />
              <Input name="title" placeholder="Title" />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/announcements', {
                title: fd.get('title'),
                message: fd.get('message'),
                audience: fd.get('audience'),
                priority: fd.get('priority'),
              });
              if (ok) setAnnouncementOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Create announcement</DialogTitle>
              <DialogDescription>Broadcast a message to your campus audience.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="title" placeholder="Title" required />
              <Input name="audience" placeholder="Audience (e.g. all students)" required />
              <Input name="priority" placeholder="Priority (normal / high)" defaultValue="normal" />
              <textarea
                name="message"
                placeholder="Message"
                required
                className="min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Publishing…' : 'Create announcement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCourse} onOpenChange={(open) => !open && setEditCourse(null)}>
        <DialogContent>
          {editCourse ? (
            <form
              key={editCourse.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const ok = await requestJson('PATCH', `/api/university/courses/${editCourse.id}`, {
                  name: fd.get('name'),
                  department: fd.get('department'),
                  duration: fd.get('duration'),
                  degreeType: fd.get('degreeType'),
                });
                if (ok) setEditCourse(null);
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit course</DialogTitle>
                <DialogDescription>Update course details.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <Input name="name" placeholder="Course name" required defaultValue={editCourse.name} />
                <Input
                  name="department"
                  placeholder="Department"
                  defaultValue={editCourse.department ?? ''}
                />
                <Input
                  name="duration"
                  placeholder="Duration (e.g. 3 years)"
                  defaultValue={editCourse.duration ?? ''}
                />
                <Input
                  name="degreeType"
                  placeholder="Degree type"
                  defaultValue={editCourse.degreeType ?? ''}
                />
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditCourse(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent>
          {editSubject ? (
            <form
              key={editSubject.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const ok = await requestJson('PATCH', `/api/university/subjects/${editSubject.id}`, {
                  name: fd.get('name'),
                  courseId: fd.get('courseId'),
                  year: fd.get('year'),
                  semester: fd.get('semester'),
                  credits: fd.get('credits'),
                  teacherId: fd.get('teacherId') || null,
                });
                if (ok) setEditSubject(null);
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit subject</DialogTitle>
                <DialogDescription>Update subject details and assignments.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <select
                  name="courseId"
                  required
                  className={selectClassName}
                  defaultValue={editSubject.courseId ?? ''}
                >
                  <option value="" disabled>
                    Select course
                  </option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Input name="name" placeholder="Subject name" required defaultValue={editSubject.name} />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    name="year"
                    type="number"
                    min={1}
                    max={6}
                    placeholder="Year"
                    required
                    defaultValue={editSubject.year ?? ''}
                  />
                  <SubjectSemesterSelect
                    name="semester"
                    required
                    defaultValue={editSubject.semester ?? ''}
                  />
                </div>
                <Input
                  name="credits"
                  type="number"
                  min={1}
                  max={60}
                  placeholder="Number of credits (ECTS)"
                  required
                  defaultValue={editSubject.credits ?? ''}
                />
                <select
                  name="teacherId"
                  className={selectClassName}
                  defaultValue={editSubject.teacherId ?? ''}
                >
                  <option value="">No teacher assigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditSubject(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {editStudent ? (
            <form
              key={editStudent.id}
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const ok = await requestJson('PATCH', `/api/university/students/${editStudent.id}`, {
                  program: fd.get('program'),
                  yearOfStudy: fd.get('yearOfStudy'),
                  courseId: fd.get('courseId') || null,
                  subjectIds: editSelectedSubjectIds,
                });
                if (ok) setEditStudent(null);
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit student</DialogTitle>
                <DialogDescription>
                  Update enrollment details for {editStudent.name}. Credits shown are earned when
                  final grade is 9.5 or above.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <Input value={editStudent.email} disabled className="opacity-70" />
                <Input
                  name="program"
                  placeholder="Program"
                  defaultValue={editStudent.program ?? ''}
                />
                <Input
                  name="yearOfStudy"
                  type="number"
                  min={1}
                  max={6}
                  placeholder="Year of study"
                  defaultValue={editStudent.yearOfStudy ?? ''}
                />
                <select name="courseId" className={selectClassName} defaultValue={editStudent.courseId ?? ''}>
                  <option value="">No course assigned</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm font-medium">
                  Completed credits: {editStudent.completedCredits} ECTS
                </p>
                <StudentSubjectPicker
                  subjects={subjects}
                  selectedIds={editSelectedSubjectIds}
                  onChange={setEditSelectedSubjectIds}
                />
              </div>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditStudent(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          {deleteTarget ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {deleteTarget.kind === 'student' ? 'Remove student?' : 'Delete permanently?'}
                </DialogTitle>
                <DialogDescription>
                  <span className="font-medium text-foreground">{deleteTarget.label}</span>
                  {deleteTarget.detail ? (
                    <>
                      <br />
                      <span className="mt-2 inline-block">{deleteTarget.detail}</span>
                    </>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={async () => {
                    const path =
                      deleteTarget.kind === 'course'
                        ? `/api/university/courses/${deleteTarget.id}`
                        : deleteTarget.kind === 'subject'
                          ? `/api/university/subjects/${deleteTarget.id}`
                          : `/api/university/students/${deleteTarget.id}`;
                    const ok = await requestJson('DELETE', path);
                    if (ok) setDeleteTarget(null);
                  }}
                >
                  {submitting
                    ? 'Removing…'
                    : deleteTarget.kind === 'student'
                      ? 'Remove from university'
                      : 'Delete'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
