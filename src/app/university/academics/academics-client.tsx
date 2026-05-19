'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SectionTabs } from '@/components/university/section-tabs';
import { DataTable, type Column } from '@/components/university/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export interface AcademicsCourse {
  id: string;
  name: string;
  department: string | null;
  status: string;
  studentCount: number;
  subjectCount: number;
  coordinatorName: string | null;
}

export interface AcademicsSubject {
  id: string;
  name: string;
  code: string | null;
  courseName: string | null;
  teacherName: string | null;
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
  engagementScore: number;
  employabilityScore: number;
  courseName: string | null;
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

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
    const action = searchParams.get('action');
    if (action === 'add' && t === 'courses') setAddCourseOpen(true);
    if (action === 'add' && t === 'subjects') setAddSubjectOpen(true);
    if (action === 'invite' && t === 'teachers') setInviteTeacherOpen(true);
    if (action === 'invite' && t === 'students') setInviteStudentOpen(true);
    if (action === 'add' && t === 'announcements') setAnnouncementOpen(true);
  }, [searchParams]);

  async function postJson(url: string, body: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
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
  ];

  const subjectColumns: Column<AcademicsSubject>[] = [
    { key: 'name', header: 'Subject', cell: (r) => r.name },
    { key: 'code', header: 'Code', cell: (r) => r.code ?? '—' },
    { key: 'course', header: 'Course', cell: (r) => r.courseName ?? '—' },
    { key: 'teacher', header: 'Teacher', cell: (r) => r.teacherName ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Badge variant="secondary">{r.status}</Badge>,
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
      key: 'engagement',
      header: 'Engagement',
      cell: (r) => `${Math.round(r.engagementScore)}%`,
    },
    {
      key: 'employability',
      header: 'Employability',
      cell: (r) => `${Math.round(r.employabilityScore)}%`,
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
      {tab === 'subjects' ? (
        <DataTable columns={subjectColumns} data={subjects} emptyMessage="No subjects yet." />
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
                code: fd.get('code'),
                courseId: fd.get('courseId'),
                year: fd.get('year'),
                semester: fd.get('semester'),
                teacherId: fd.get('teacherId') || undefined,
              });
              if (ok) setAddSubjectOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Add subject</DialogTitle>
              <DialogDescription>
                Link a subject to a course. Students enrolled in this course will see it in
                Academics.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <select
                name="courseId"
                required
                className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm"
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
              <Input name="code" placeholder="Subject code (optional)" />
              <div className="grid grid-cols-2 gap-3">
                <Input name="year" type="number" min={1} max={6} placeholder="Year" />
                <Input name="semester" placeholder="Semester (e.g. Fall)" />
              </div>
              <select
                name="teacherId"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm"
                defaultValue=""
              >
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

      <Dialog open={inviteStudentOpen} onOpenChange={setInviteStudentOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const ok = await postJson('/api/university/students/invite', {
                email: fd.get('email'),
                program: fd.get('program'),
                yearOfStudy: fd.get('yearOfStudy'),
                courseId: fd.get('courseId') || undefined,
              });
              if (ok) setInviteStudentOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Invite student</DialogTitle>
              <DialogDescription>
                Link an existing student account to your university. They must already be
                registered on UniBridge.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="email" type="email" placeholder="Student email" required />
              <Input name="program" placeholder="Program (optional)" />
              <Input name="yearOfStudy" type="number" min={1} max={6} placeholder="Year of study" />
              <select
                name="courseId"
                className="flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Assign to course (optional)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
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
    </div>
  );
}
