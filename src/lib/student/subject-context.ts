import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

export const SUBJECT_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'content', label: 'Content' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'gradebook', label: 'Gradebook' },
  { id: 'messages', label: 'Messages' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'career', label: 'Career / Real World' },
] as const;

export type SubjectTabId = (typeof SUBJECT_TABS)[number]['id'];

export async function requireStudentSubjectAccess(userId: string, subjectId: string) {
  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: userId } },
    include: {
      subject: {
        include: {
          course: { select: { name: true, universityId: true } },
          teacher: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      },
    },
  });

  if (!enrollment?.subject || enrollment.subject.status !== 'ACTIVE') {
    notFound();
  }

  return { enrollment, subject: enrollment.subject };
}

export async function loadSubjectWorkspace(userId: string, subjectId: string) {
  const { enrollment, subject } = await requireStudentSubjectAccess(userId, subjectId);
  const universityId = subject.universityId ?? subject.course?.universityId;

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
    internships,
    challenges,
    careerPaths,
    universityEvents,
    contentNotes,
  ] = await Promise.all([
    prisma.subjectContentWeek.findMany({
      where: { subjectId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { weekNumber: 'asc' },
    }),
    prisma.subjectAnnouncement.findMany({
      where: {
        subjectId,
        OR: [{ publishedAt: { not: null } }, { publishedAt: null, scheduledAt: null }],
      },
      include: { author: { select: { name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
    prisma.assignment.findMany({
      where: { subjectId },
      include: {
        gradeCategory: true,
        submissions: { where: { studentId: userId } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.exam.findMany({ where: { subjectId }, orderBy: { date: 'asc' } }),
    prisma.gradeCategory.findMany({
      where: { subjectId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.subjectScheduleSlot.findMany({ where: { subjectId }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.subjectOfficeHours.findMany({ where: { subjectId }, orderBy: { dayOfWeek: 'asc' } }),
    prisma.subjectAttendanceSession.findMany({
      where: { subjectId },
      include: { records: { where: { studentId: userId } } },
      orderBy: { date: 'desc' },
      take: 60,
    }),
    prisma.subjectMessage.findMany({
      where: { subjectId, channel: 'class' },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    universityId
      ? prisma.internship.findMany({
          where: {
            universityId,
            status: { in: ['ACTIVE', 'PUBLISHED'] },
            OR: [{ subjectId }, { subjectId: null }],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    universityId
      ? prisma.companyChallenge.findMany({
          where: {
            universityId,
            status: { in: ['ACTIVE', 'PUBLISHED'] },
            OR: [{ subjectId }, { subjectId: null }],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        })
      : Promise.resolve([]),
    universityId
      ? prisma.careerPath.findMany({
          where: {
            universityId,
            status: 'PUBLISHED',
            OR: [
              { requiredSubjects: { has: subject.name } },
              ...(subject.code ? [{ requiredSubjects: { has: subject.code } }] : []),
            ],
          },
          take: 10,
        })
      : Promise.resolve([]),
    universityId
      ? prisma.calendarEvent.findMany({
          where: { universityId, startDate: { gte: new Date(Date.now() - 30 * 86400000) } },
          orderBy: { startDate: 'asc' },
          take: 30,
        })
      : Promise.resolve([]),
    prisma.subjectContentNote.findMany({
      where: { studentId: userId, item: { week: { subjectId } } },
    }),
  ]);

  const subjectInternships = internships.filter(
    (i) => i.subjectId === subjectId || !i.subjectId
  );
  const subjectChallenges = challenges.filter(
    (c) => c.subjectId === subjectId || !c.subjectId
  );

  return {
    enrollment,
    subject,
    teacher: subject.teacher,
    contentWeeks,
    announcements,
    assignments,
    exams,
    gradeCategories,
    scheduleSlots,
    officeHours,
    attendanceSessions,
    messages: messages.reverse(),
    internships: subjectInternships,
    challenges: subjectChallenges,
    careerPaths,
    universityEvents,
    contentNotes: Object.fromEntries(contentNotes.map((n) => [n.itemId, n.note ?? ''])),
  };
}

export type SubjectWorkspace = Awaited<ReturnType<typeof loadSubjectWorkspace>>;
