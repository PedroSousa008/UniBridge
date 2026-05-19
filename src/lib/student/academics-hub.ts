import { prisma } from '@/lib/db';

export async function loadStudentEnrolledSubjectIds(studentId: string) {
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: { subject: { select: { id: true, name: true, code: true, status: true } } },
  });
  return enrollments.filter((e) => e.subject.status === 'ACTIVE');
}

export async function loadStudentAssignments(studentId: string) {
  const enrollments = await loadStudentEnrolledSubjectIds(studentId);
  const subjectIds = enrollments.map((e) => e.subjectId);

  const assignments = await prisma.assignment.findMany({
    where: { subjectId: { in: subjectIds } },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      submissions: { where: { studentId } },
    },
    orderBy: { dueDate: 'asc' },
  });

  return assignments.map((a) => ({
    id: a.id,
    title: a.title,
    dueDate: a.dueDate.toISOString(),
    subject: a.subject,
    submitted: !!a.submissions[0]?.submittedAt,
    score: a.submissions[0]?.score ?? null,
    maxScore: a.maxScore,
  }));
}

export async function loadStudentExams(studentId: string) {
  const enrollments = await loadStudentEnrolledSubjectIds(studentId);
  const subjectIds = enrollments.map((e) => e.subjectId);

  const exams = await prisma.exam.findMany({
    where: { subjectId: { in: subjectIds } },
    include: { subject: { select: { id: true, name: true, code: true } } },
    orderBy: { date: 'asc' },
  });

  return exams.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    subject: e.subject!,
    location: e.location,
    maxScore: e.maxScore,
  }));
}

export async function loadStudentCalendarEvents(studentId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { universityId: true },
  });

  const enrollments = await loadStudentEnrolledSubjectIds(studentId);
  const subjectIds = enrollments.map((e) => e.subjectId);

  const [assignments, exams, universityEvents] = await Promise.all([
    prisma.assignment.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { subject: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 40,
    }),
    prisma.exam.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 40,
    }),
    profile?.universityId
      ? prisma.calendarEvent.findMany({
          where: { universityId: profile.universityId },
          orderBy: { startDate: 'asc' },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  return { assignments, exams, universityEvents };
}
