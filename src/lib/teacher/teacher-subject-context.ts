import { cache } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ensureTeacherAcademicSchema } from '@/lib/teacher/ensure-teacher-schema';
import { getSubjectGradingPlan } from '@/lib/teacher/teacher-gradebook';

export const requireTeacherSubjectAccess = cache(async function requireTeacherSubjectAccess(
  actorUserId: string,
  subjectId: string
) {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: actorUserId },
  });
  if (!teacher?.universityId) notFound();

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      status: 'ACTIVE',
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId }],
    },
    include: {
      course: { select: { name: true, universityId: true } },
      teacher: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!subject) notFound();
  return { teacher, subject };
});

export type TeacherSubjectAnnouncements = Awaited<
  ReturnType<typeof loadTeacherSubjectAnnouncements>
>;

export async function loadTeacherSubjectAnnouncements(actorUserId: string, subjectId: string) {
  await ensureTeacherAcademicSchema();
  await requireTeacherSubjectAccess(actorUserId, subjectId);
  return prisma.subjectAnnouncement.findMany({
    where: { subjectId },
    include: { author: { select: { name: true, image: true } } },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 80,
  });
}

export type TeacherSubjectContentWeeks = Awaited<ReturnType<typeof loadTeacherSubjectContentWeeks>>;

export async function loadTeacherSubjectContentWeeks(actorUserId: string, subjectId: string) {
  await ensureTeacherAcademicSchema();
  await requireTeacherSubjectAccess(actorUserId, subjectId);
  return prisma.subjectContentWeek.findMany({
    where: { subjectId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { weekNumber: 'asc' },
  });
}

export type TeacherSubjectMessages = Awaited<ReturnType<typeof loadTeacherSubjectMessages>>;

export async function loadTeacherSubjectMessages(actorUserId: string, subjectId: string) {
  await ensureTeacherAcademicSchema();
  await requireTeacherSubjectAccess(actorUserId, subjectId);
  const messages = await prisma.subjectMessage.findMany({
    where: { subjectId },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return messages.reverse();
}

export const loadTeacherSubjectHomeData = cache(async function loadTeacherSubjectHomeData(
  actorUserId: string,
  subjectId: string
) {
  await ensureTeacherAcademicSchema();
  const { subject } = await requireTeacherSubjectAccess(actorUserId, subjectId);
  const gradingPlan = await getSubjectGradingPlan(subjectId);

  const [announcements, assignments, scheduleSlots, enrollments] = await Promise.all([
    prisma.subjectAnnouncement.findMany({
      where: { subjectId },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    }),
    prisma.assignment.findMany({
      where: { subjectId },
      include: {
        submissions: {
          include: { student: { select: { id: true, name: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.subjectScheduleSlot.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
      take: 1,
    }),
    prisma.subjectEnrollment.findMany({
      where: { subjectId },
      include: { student: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { student: { name: 'asc' } },
    }),
  ]);

  const minAtt = subject.minAttendancePercent ?? 75;
  const studentsNeedingSupport = enrollments.filter(
    (e) => e.attendance != null && e.attendance < minAtt
  );

  return {
    subject,
    gradingPlan,
    announcements,
    assignments,
    scheduleSlots,
    enrollments,
    studentsNeedingSupport,
  };
});

export type TeacherSubjectHomeData = Awaited<ReturnType<typeof loadTeacherSubjectHomeData>>;

export const loadTeacherSubjectWorkspace = cache(async function loadTeacherSubjectWorkspace(
  actorUserId: string,
  subjectId: string
) {
  await ensureTeacherAcademicSchema();
  const { subject } = await requireTeacherSubjectAccess(actorUserId, subjectId);
  const gradingPlan = await getSubjectGradingPlan(subjectId);

  const [
    contentWeeks,
    announcements,
    assignments,
    exams,
    gradeCategories,
    scheduleSlots,
    officeHours,
    attendanceSessions,
    messages,
    enrollments,
  ] = await Promise.all([
    prisma.subjectContentWeek.findMany({
      where: { subjectId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { weekNumber: 'asc' },
    }),
    prisma.subjectAnnouncement.findMany({
      where: { subjectId },
      include: { author: { select: { name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 80,
    }),
    prisma.assignment.findMany({
      where: { subjectId },
      include: {
        gradeCategory: true,
        submissions: {
          include: { student: { select: { id: true, name: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.exam.findMany({ where: { subjectId }, orderBy: { date: 'asc' } }),
    prisma.gradeCategory.findMany({
      where: { subjectId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.subjectScheduleSlot.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.subjectOfficeHours.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.subjectAttendanceSession.findMany({
      where: { subjectId },
      include: {
        records: {
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: 60,
    }),
    prisma.subjectMessage.findMany({
      where: { subjectId },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.subjectEnrollment.findMany({
      where: { subjectId },
      include: { student: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { student: { name: 'asc' } },
    }),
  ]);

  const minAtt = subject.minAttendancePercent ?? 75;
  const studentsNeedingSupport = enrollments.filter(
    (e) => e.attendance != null && e.attendance < minAtt
  );

  return {
    subject,
    gradingPlan,
    contentWeeks,
    announcements,
    assignments,
    exams,
    gradeCategories,
    scheduleSlots,
    officeHours,
    attendanceSessions,
    messages: messages.reverse(),
    enrollments,
    studentsNeedingSupport,
  };
});

export type TeacherSubjectWorkspace = Awaited<ReturnType<typeof loadTeacherSubjectWorkspace>>;

export function serializeTeacherSubjectWorkspace(ws: TeacherSubjectWorkspace): TeacherSubjectWorkspace {
  return JSON.parse(JSON.stringify(ws)) as TeacherSubjectWorkspace;
}

export function serializeTeacherSubjectHomeData(ws: TeacherSubjectHomeData): TeacherSubjectHomeData {
  return JSON.parse(JSON.stringify(ws)) as TeacherSubjectHomeData;
}

export function serializeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
