import { prisma } from '@/lib/db';
import { ensureStudentAcademicProfileSchema } from '@/lib/db/ensure-student-academic-profile-schema';
import {
  deriveCompletionStatus,
  isCompletionStatus,
  type CompletionStatus,
} from '@/lib/academics/completion-status';
import {
  academicStatusLabel,
  formatYearOfStudyLabel,
  resolveCourseVisualTheme,
} from '@/lib/academics/course-visual-theme';
import { universitySubjectsWhere } from '@/lib/academics/enrollments';
import { sumCompletedCredits } from '@/lib/academics/student-credits';
import { formatSubjectSemester } from '@/lib/academics/subject-semester';

export type StudentAcademicProfileSubjectRow = {
  enrollmentId: string | null;
  subjectId: string;
  name: string;
  code: string | null;
  year: number | null;
  semester: string | null;
  semesterLabel: string;
  credits: number | null;
  professors: string[];
  grade: number | null;
  completionStatus: CompletionStatus;
  adminNotes: string | null;
  isEnrolled: boolean;
};

export type UniversityStudentAcademicProfile = {
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
    studentNumber: string;
    universityName: string;
    program: string | null;
    courseId: string | null;
    courseName: string | null;
    yearOfStudy: number | null;
    yearLabel: string;
    currentSemester: string | null;
    currentSemesterLabel: string;
    academicStatus: string;
    academicStatusLabel: string;
    scholarshipStatus: string | null;
    personalEmail: string | null;
    phone: string | null;
    emergencyContact: string | null;
    completedCredits: number;
    requiredCredits: number;
    gpa: number | null;
    engagementScore: number;
    employabilityScore: number;
  };
  course: {
    id: string;
    name: string;
    department: string | null;
    bannerUrl: string | null;
    themeColor: string | null;
    visualTheme: ReturnType<typeof resolveCourseVisualTheme>;
    requiredCredits: number;
  } | null;
  subjects: StudentAcademicProfileSubjectRow[];
};

type ExtProfile = {
  studentNumber: string | null;
  academicStatus: string | null;
  currentSemester: string | null;
  scholarshipStatus: string | null;
  personalEmail: string | null;
  emergencyContact: string | null;
};

type ExtCourse = {
  bannerUrl: string | null;
  themeColor: string | null;
  visualTheme: string | null;
  requiredCredits: number | null;
};

type ExtEnrollment = {
  id: string;
  subjectId: string;
  grade: number | null;
  completionStatus: string | null;
  adminNotes: string | null;
};

function parseDurationYears(duration: string | null | undefined): number {
  if (!duration) return 3;
  const match = duration.match(/(\d+)/);
  return match ? Math.max(1, parseInt(match[1], 10)) : 3;
}

function computeGpa(rows: { grade: number | null }[]): number | null {
  const graded = rows.filter((r) => r.grade != null).map((r) => r.grade as number);
  if (graded.length === 0) return null;
  const avg = graded.reduce((a, b) => a + b, 0) / graded.length;
  return Math.round(avg * 100) / 100;
}

function buildSubjectRow(
  subject: {
    id: string;
    name: string;
    code: string | null;
    year: number | null;
    semester: string | null;
    credits: number | null;
    teacher: { user: { name: string | null } } | null;
  },
  enrollment: ExtEnrollment | undefined
): StudentAcademicProfileSubjectRow {
  const isEnrolled = !!enrollment;
  const grade = enrollment?.grade ?? null;
  const completionStatus = deriveCompletionStatus({
    isEnrolled,
    grade,
    manualStatus: enrollment?.completionStatus ?? null,
  });

  return {
    enrollmentId: enrollment?.id ?? null,
    subjectId: subject.id,
    name: subject.name,
    code: subject.code,
    year: subject.year,
    semester: subject.semester,
    semesterLabel: formatSubjectSemester(subject.semester) || '—',
    credits: subject.credits,
    professors: subject.teacher?.user.name ? [subject.teacher.user.name] : [],
    grade,
    completionStatus,
    adminNotes: enrollment?.adminNotes ?? null,
    isEnrolled,
  };
}

export async function loadUniversityStudentAcademicProfile(
  universityId: string,
  studentProfileId: string
): Promise<UniversityStudentAcademicProfile | null> {
  await ensureStudentAcademicProfileSchema();

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, universityId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      course: { select: { id: true, name: true, department: true, duration: true } },
      identitySettings: { select: { phone: true } },
      university: { select: { name: true } },
    },
  });
  if (!student) return null;

  const extRows = await prisma.$queryRaw<ExtProfile[]>`
    SELECT "studentNumber", "academicStatus", "currentSemester", "scholarshipStatus",
           "personalEmail", "emergencyContact"
    FROM "StudentProfile"
    WHERE id = ${studentProfileId}
    LIMIT 1
  `;
  const ext = extRows[0] ?? {
    studentNumber: null,
    academicStatus: null,
    currentSemester: null,
    scholarshipStatus: null,
    personalEmail: null,
    emergencyContact: null,
  };

  let courseExt: ExtCourse | null = null;
  if (student.courseId) {
    const rows = await prisma.$queryRaw<ExtCourse[]>`
      SELECT "bannerUrl", "themeColor", "visualTheme", "requiredCredits"
      FROM "Course"
      WHERE id = ${student.courseId}
      LIMIT 1
    `;
    courseExt = rows[0] ?? null;
  }

  const enrollmentRows = await prisma.$queryRaw<ExtEnrollment[]>`
    SELECT se.id, se."subjectId", se.grade, se."completionStatus", se."adminNotes"
    FROM "SubjectEnrollment" se
    INNER JOIN "Subject" s ON s.id = se."subjectId"
    WHERE se."studentId" = ${student.userId}
      AND (
        s."universityId" = ${universityId}
        OR EXISTS (
          SELECT 1 FROM "Course" c
          WHERE c.id = s."courseId" AND c."universityId" = ${universityId}
        )
      )
  `;
  const enrollmentBySubject = new Map(enrollmentRows.map((e) => [e.subjectId, e]));

  const curriculumSubjects = student.courseId
    ? await prisma.subject.findMany({
        where: { courseId: student.courseId, status: 'ACTIVE' },
        include: {
          teacher: { include: { user: { select: { name: true } } } },
        },
        orderBy: [{ year: 'asc' }, { semester: 'asc' }, { name: 'asc' }],
      })
    : [];

  const curriculumIds = new Set(curriculumSubjects.map((s) => s.id));

  const extraEnrolled = enrollmentRows
    .filter((e) => !curriculumIds.has(e.subjectId))
    .map((e) => e.subjectId);

  const extraSubjects =
    extraEnrolled.length > 0
      ? await prisma.subject.findMany({
          where: { id: { in: extraEnrolled }, status: 'ACTIVE' },
          include: {
            teacher: { include: { user: { select: { name: true } } } },
          },
          orderBy: { name: 'asc' },
        })
      : [];

  const allSubjects = [...curriculumSubjects, ...extraSubjects];
  const subjectRows = allSubjects.map((s) =>
    buildSubjectRow(s, enrollmentBySubject.get(s.id))
  );

  const creditsRows = enrollmentRows.map((e) => {
    const sub = allSubjects.find((s) => s.id === e.subjectId);
    return { grade: e.grade, credits: sub?.credits ?? null };
  });

  const durationYears = parseDurationYears(student.course?.duration);
  const requiredCredits =
    courseExt?.requiredCredits ??
    (curriculumSubjects.reduce((sum, s) => sum + (s.credits ?? 0), 0) || 180);

  const courseVisual = student.course
    ? resolveCourseVisualTheme({
        name: student.course.name,
        department: student.course.department,
        visualTheme: courseExt?.visualTheme,
      })
    : 'general';

  const academicStatus = (ext.academicStatus ?? 'active').toLowerCase();
  const semesterLabel = formatSubjectSemester(ext.currentSemester) || ext.currentSemester || '—';

  return {
    student: {
      id: student.id,
      userId: student.userId,
      name: student.user.name || student.user.email,
      email: student.user.email,
      image: student.user.image,
      studentNumber: ext.studentNumber?.trim() || `STU-${student.id.slice(-6).toUpperCase()}`,
      universityName: student.university?.name || student.universityName || 'University',
      program: student.program,
      courseId: student.courseId,
      courseName: student.course?.name ?? null,
      yearOfStudy: student.yearOfStudy,
      yearLabel: formatYearOfStudyLabel(student.yearOfStudy, durationYears),
      currentSemester: ext.currentSemester,
      currentSemesterLabel: semesterLabel,
      academicStatus,
      academicStatusLabel: academicStatusLabel(academicStatus),
      scholarshipStatus: ext.scholarshipStatus,
      personalEmail: ext.personalEmail,
      phone: student.identitySettings?.phone ?? null,
      emergencyContact: ext.emergencyContact,
      completedCredits: sumCompletedCredits(creditsRows),
      requiredCredits,
      gpa: computeGpa(enrollmentRows),
      engagementScore: student.engagementScore,
      employabilityScore: student.employabilityScore,
    },
    course: student.course
      ? {
          id: student.course.id,
          name: student.course.name,
          department: student.course.department,
          bannerUrl: courseExt?.bannerUrl ?? null,
          themeColor: courseExt?.themeColor ?? null,
          visualTheme: courseVisual,
          requiredCredits,
        }
      : null,
    subjects: subjectRows,
  };
}

export async function updateUniversityStudentAcademicProfileMeta(
  universityId: string,
  studentProfileId: string,
  data: {
    studentNumber?: string | null;
    academicStatus?: string | null;
    currentSemester?: string | null;
    scholarshipStatus?: string | null;
    personalEmail?: string | null;
    emergencyContact?: string | null;
    yearOfStudy?: number | null;
    program?: string | null;
  }
) {
  await ensureStudentAcademicProfileSchema();

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, universityId },
  });
  if (!student) return null;

  const prismaUpdates: Record<string, unknown> = {};
  if (data.yearOfStudy !== undefined) prismaUpdates.yearOfStudy = data.yearOfStudy;
  if (data.program !== undefined) prismaUpdates.program = data.program;

  if (Object.keys(prismaUpdates).length > 0) {
    await prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: prismaUpdates,
    });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const addField = (col: string, val: unknown) => {
    sets.push(`"${col}" = $${idx}`);
    values.push(val);
    idx += 1;
  };

  if (data.studentNumber !== undefined) addField('studentNumber', data.studentNumber);
  if (data.academicStatus !== undefined) addField('academicStatus', data.academicStatus);
  if (data.currentSemester !== undefined) addField('currentSemester', data.currentSemester);
  if (data.scholarshipStatus !== undefined) addField('scholarshipStatus', data.scholarshipStatus);
  if (data.personalEmail !== undefined) addField('personalEmail', data.personalEmail);
  if (data.emergencyContact !== undefined) addField('emergencyContact', data.emergencyContact);

  if (sets.length > 0) {
    values.push(studentProfileId);
    await prisma.$executeRawUnsafe(
      `UPDATE "StudentProfile" SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE id = $${idx}`,
      ...values
    );
  }

  return loadUniversityStudentAcademicProfile(universityId, studentProfileId);
}

export async function updateStudentSubjectRecord(
  universityId: string,
  studentProfileId: string,
  subjectId: string,
  data: {
    grade?: number | null;
    completionStatus?: string | null;
    adminNotes?: string | null;
  }
) {
  await ensureStudentAcademicProfileSchema();

  const student = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, universityId },
    select: { userId: true },
  });
  if (!student) return null;

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, ...universitySubjectsWhere(universityId) },
    select: { id: true },
  });
  if (!subject) return null;

  let enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId: student.userId } },
    select: { id: true },
  });

  if (!enrollment) {
    enrollment = await prisma.subjectEnrollment.create({
      data: { subjectId, studentId: student.userId },
      select: { id: true },
    });
  }

  const prismaData: { grade?: number | null } = {};
  if (data.grade !== undefined) prismaData.grade = data.grade;

  if (Object.keys(prismaData).length > 0) {
    await prisma.subjectEnrollment.update({
      where: { id: enrollment.id },
      data: prismaData,
    });
  }

  const extSets: string[] = [];
  const extValues: unknown[] = [];
  let idx = 1;

  if (data.completionStatus !== undefined) {
    const status =
      data.completionStatus && isCompletionStatus(data.completionStatus)
        ? data.completionStatus
        : data.completionStatus;
    extSets.push(`"completionStatus" = $${idx}`);
    extValues.push(status);
    idx += 1;
  }
  if (data.adminNotes !== undefined) {
    extSets.push(`"adminNotes" = $${idx}`);
    extValues.push(data.adminNotes);
    idx += 1;
  }

  if (extSets.length > 0) {
    extValues.push(enrollment.id);
    await prisma.$executeRawUnsafe(
      `UPDATE "SubjectEnrollment" SET ${extSets.join(', ')} WHERE id = $${idx}`,
      ...extValues
    );
  }

  return loadUniversityStudentAcademicProfile(universityId, studentProfileId);
}
