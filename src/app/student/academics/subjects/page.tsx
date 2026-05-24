import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { studentEnrollmentsWhere } from '@/lib/academics/enrollments';
import { StudentSubjectsClient } from './subjects-client';

export default async function StudentSubjectsPage() {
  const session = await requireSession('STUDENT');

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      university: { select: { name: true } },
      course: {
        select: {
          name: true,
          coordinator: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: studentEnrollmentsWhere(session.user.id, profile?.universityId ?? null),
    include: {
      subject: {
        include: {
          course: { select: { name: true } },
          teacher: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { subject: { name: 'asc' } },
  });

  const subjects = enrollments
    .filter((e) => e.subject.status === 'ACTIVE')
    .map((e) => ({
      id: e.subject.id,
      name: e.subject.name,
      code: e.subject.code,
      semester: e.subject.semester,
      year: e.subject.year,
      courseName: e.subject.course?.name ?? null,
      teacherName: e.subject.teacher?.user.name ?? null,
      teacherEmail: e.subject.teacher?.user.email ?? null,
      teacherTitle: e.subject.teacher?.title ?? null,
    }));

  const courseTeachers = new Map<string, { name: string; email: string; role: string }>();

  if (profile?.course?.coordinator?.user) {
    const c = profile.course.coordinator.user;
    courseTeachers.set(c.email, {
      name: c.name || c.email,
      email: c.email,
      role: 'Course coordinator',
    });
  }

  for (const s of subjects) {
    if (s.teacherEmail && s.teacherName) {
      courseTeachers.set(s.teacherEmail, {
        name: s.teacherName,
        email: s.teacherEmail,
        role: s.teacherTitle ? `Subject teacher · ${s.teacherTitle}` : 'Subject teacher',
      });
    }
  }

  return (
    <StudentSubjectsClient
      universityName={profile?.universityName ?? profile?.university?.name ?? null}
      courseName={profile?.course?.name ?? null}
      program={profile?.program ?? null}
      yearOfStudy={profile?.yearOfStudy ?? null}
      subjects={subjects}
      courseTeachers={Array.from(courseTeachers.values())}
    />
  );
}
