import { prisma } from '@/lib/db';

export function universitySubjectsWhere(universityId: string) {
  return {
    OR: [{ universityId }, { course: { universityId } }],
  };
}

/** Validate subject ids belong to the university and are active. */
export async function validateUniversitySubjectIds(
  universityId: string,
  subjectIds: string[]
): Promise<string[]> {
  if (subjectIds.length === 0) return [];
  const unique = [...new Set(subjectIds)];
  const rows = await prisma.subject.findMany({
    where: {
      id: { in: unique },
      status: 'ACTIVE',
      ...universitySubjectsWhere(universityId),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Set exactly which subjects a student is enrolled in at a university.
 * Replaces automatic course-wide enrollment.
 */
export async function setStudentSubjectEnrollments(
  userId: string,
  universityId: string,
  subjectIds: string[]
) {
  const targetIds = await validateUniversitySubjectIds(universityId, subjectIds);

  const scoped = await prisma.subject.findMany({
    where: universitySubjectsWhere(universityId),
    select: { id: true },
  });
  const scopeIds = scoped.map((s) => s.id);
  const targetSet = new Set(targetIds);
  const toRemove = scopeIds.filter((id) => !targetSet.has(id));

  if (toRemove.length > 0) {
    await prisma.subjectEnrollment.deleteMany({
      where: { studentId: userId, subjectId: { in: toRemove } },
    });
  }

  if (targetIds.length > 0) {
    await prisma.subjectEnrollment.createMany({
      data: targetIds.map((subjectId) => ({ subjectId, studentId: userId })),
      skipDuplicates: true,
    });
  }
}

export async function getStudentEnrolledSubjectIds(
  userId: string,
  universityId: string
): Promise<string[]> {
  const scoped = await prisma.subject.findMany({
    where: universitySubjectsWhere(universityId),
    select: { id: true },
  });
  const scopeIds = scoped.map((s) => s.id);
  if (scopeIds.length === 0) return [];

  const rows = await prisma.subjectEnrollment.findMany({
    where: { studentId: userId, subjectId: { in: scopeIds } },
    select: { subjectId: true },
  });
  return rows.map((r) => r.subjectId);
}

/** Active subjects on a course; optional year filter matches student year or open subjects. */
export async function eligibleSubjectIdsForCourse(
  courseId: string,
  yearOfStudy?: number | null
) {
  const subjects = await prisma.subject.findMany({
    where: {
      courseId,
      status: 'ACTIVE',
      ...(yearOfStudy != null
        ? { OR: [{ year: null }, { year: yearOfStudy }] }
        : {}),
    },
    select: { id: true },
  });
  return subjects.map((s) => s.id);
}

/**
 * Keeps SubjectEnrollment in sync with the student's university + course assignment.
 * Students on a course are enrolled in all eligible subjects for that course.
 */
export async function syncStudentEnrollments(
  userId: string,
  opts: {
    universityId: string | null;
    courseId: string | null;
    yearOfStudy?: number | null;
  }
) {
  const { universityId, courseId, yearOfStudy } = opts;

  if (!universityId) {
    return;
  }

  const scoped = await prisma.subject.findMany({
    where: universitySubjectsWhere(universityId),
    select: { id: true },
  });
  const scopeIds = scoped.map((s) => s.id);

  let targetIds: string[] = [];
  if (courseId) {
    targetIds = await eligibleSubjectIdsForCourse(courseId, yearOfStudy);
  }

  const targetSet = new Set(targetIds);
  const toRemove = scopeIds.filter((id) => !targetSet.has(id));

  if (toRemove.length > 0) {
    await prisma.subjectEnrollment.deleteMany({
      where: { studentId: userId, subjectId: { in: toRemove } },
    });
  }

  if (targetIds.length > 0) {
    await prisma.subjectEnrollment.createMany({
      data: targetIds.map((subjectId) => ({ subjectId, studentId: userId })),
      skipDuplicates: true,
    });
  }
}

/** Enroll all students assigned to a course into a subject (respects subject year). */
export async function enrollCourseStudentsInSubject(
  subjectId: string,
  courseId: string,
  subjectYear: number | null
) {
  const students = await prisma.studentProfile.findMany({
    where: { courseId, universityId: { not: null } },
    select: { userId: true, yearOfStudy: true, universityId: true, courseId: true },
  });

  const rows = students
    .filter((s) => {
      if (subjectYear == null) return true;
      if (s.yearOfStudy == null) return true;
      return s.yearOfStudy === subjectYear;
    })
    .map((s) => ({ subjectId, studentId: s.userId }));

  if (rows.length === 0) return;

  await prisma.subjectEnrollment.createMany({
    data: rows,
    skipDuplicates: true,
  });
}

/** Re-sync every student on a course (e.g. after subject year/course change). */
export async function syncAllStudentsInCourse(courseId: string) {
  const students = await prisma.studentProfile.findMany({
    where: { courseId },
    select: {
      userId: true,
      universityId: true,
      courseId: true,
      yearOfStudy: true,
    },
  });

  for (const s of students) {
    await syncStudentEnrollments(s.userId, {
      universityId: s.universityId,
      courseId: s.courseId,
      yearOfStudy: s.yearOfStudy,
    });
  }
}

export async function clearStudentEnrollmentsForUniversity(
  userId: string,
  universityId: string
) {
  const scoped = await prisma.subject.findMany({
    where: universitySubjectsWhere(universityId),
    select: { id: true },
  });
  if (scoped.length === 0) return;

  await prisma.subjectEnrollment.deleteMany({
    where: {
      studentId: userId,
      subjectId: { in: scoped.map((s) => s.id) },
    },
  });
}

/** Self-heal enrollments for an existing linked student (e.g. before this feature). */
export async function ensureStudentEnrollments(userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { universityId: true, courseId: true, yearOfStudy: true },
  });
  if (!profile?.universityId) return;

  await syncStudentEnrollments(userId, {
    universityId: profile.universityId,
    courseId: profile.courseId,
    yearOfStudy: profile.yearOfStudy,
  });
}
