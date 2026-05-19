import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { prisma } from '@/lib/db';
import { UniversityAcademicsClient } from './academics-client';

export default async function UniversityAcademicsPage() {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);
  const universityId = ctx?.university.id;

  if (!universityId) {
    return (
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
        <UniversityAcademicsClient
          courses={[]}
          subjects={[]}
          teachers={[]}
          students={[]}
          calendarEvents={[]}
          announcements={[]}
        />
      </Suspense>
    );
  }

  const [courses, subjects, teachers, students, calendarEvents, announcements] =
    await Promise.all([
      prisma.course.findMany({
        where: { universityId },
        include: {
          coordinator: { include: { user: { select: { name: true } } } },
          _count: { select: { students: true, subjects: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.subject.findMany({
        where: { course: { universityId } },
        include: {
          course: { select: { name: true } },
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.teacherProfile.findMany({
        where: { universityId },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.studentProfile.findMany({
        where: { universityId },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { name: true } },
        },
      }),
      prisma.calendarEvent.findMany({
        where: { universityId },
        orderBy: { startDate: 'asc' },
      }),
      prisma.universityAnnouncement.findMany({
        where: { universityId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
    <UniversityAcademicsClient
      courses={courses.map((c) => ({
        id: c.id,
        name: c.name,
        department: c.department,
        status: c.status,
        studentCount: c._count.students,
        subjectCount: c._count.subjects,
        coordinatorName: c.coordinator?.user.name ?? null,
      }))}
      subjects={subjects.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        courseName: s.course?.name ?? null,
        teacherName: s.teacher?.user.name ?? null,
        status: s.status,
      }))}
      teachers={teachers.map((t) => ({
        id: t.id,
        name: t.user.name || t.user.email,
        email: t.user.email,
        department: t.department,
        title: t.title,
        status: t.status,
      }))}
      students={students.map((s) => ({
        id: s.id,
        name: s.user.name || s.user.email,
        email: s.user.email,
        program: s.program,
        yearOfStudy: s.yearOfStudy,
        engagementScore: s.engagementScore,
        employabilityScore: s.employabilityScore,
        courseName: s.course?.name ?? null,
      }))}
      calendarEvents={calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.eventType,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
      }))}
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        audience: a.audience,
        priority: a.priority,
        status: a.status,
        publishedAt: a.publishedAt?.toISOString() ?? null,
      }))}
    />
    </Suspense>
  );
}
