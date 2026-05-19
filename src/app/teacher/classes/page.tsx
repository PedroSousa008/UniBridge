import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { TeacherClassesClient } from './classes-client';

export default async function TeacherClassesPage() {
  const session = await requireSession('TEACHER');

  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      university: { select: { name: true } },
      subjects: {
        where: { status: 'ACTIVE' },
        include: {
          course: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: 'asc' },
      },
      coursesCoordinated: {
        include: {
          _count: { select: { students: true, subjects: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  const teachingSubjects =
    profile?.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      courseName: s.course?.name ?? null,
      semester: s.semester,
      year: s.year,
      studentCount: s._count.enrollments,
    })) ?? [];

  const coordinatingCourses =
    profile?.coursesCoordinated.map((c) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      studentCount: c._count.students,
      subjectCount: c._count.subjects,
    })) ?? [];

  return (
    <TeacherClassesClient
      universityName={profile?.university?.name ?? null}
      teachingSubjects={teachingSubjects}
      coordinatingCourses={coordinatingCourses}
    />
  );
}
