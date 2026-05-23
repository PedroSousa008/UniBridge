import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { ensureTeacherAcademicSchema } from '@/lib/teacher/ensure-teacher-schema';
import { isPendingGradePublish } from '@/lib/teacher/teacher-grading';
import { loadSubjectCurrentGradesMap } from '@/lib/teacher/teacher-students-grade-utils';

export interface TeacherStudentsClassCard {
  id: string;
  name: string;
  code: string | null;
  courseName: string | null;
  academicYear: number | null;
  semester: string | null;
  studentCount: number;
  attendanceOverview: string;
  averageGrade: number | null;
  studentsNeedingSupport: number;
  indicators: { id: string; label: string; tone: 'amber' | 'rose' | 'violet' | 'brand' }[];
  classEcosystemHref: string;
}

export interface TeacherStudentsHub {
  linked: boolean;
  universityName: string | null;
  classes: TeacherStudentsClassCard[];
  serverTime: string;
}

export async function loadTeacherStudentsHub(actorUserId: string): Promise<TeacherStudentsHub> {
  await ensureTeacherAcademicSchema();
  await ensureTeacherStudentsSchema();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: actorUserId },
    include: {
      university: { select: { name: true } },
      subjects: {
        where: { status: 'ACTIVE' },
        include: {
          course: { select: { name: true } },
          enrollments: { select: { studentId: true, attendance: true } },
          assignments: {
            include: {
              submissions: {
                select: {
                  studentId: true,
                  submittedAt: true,
                  gradePublished: true,
                },
              },
            },
          },
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!teacher?.universityId) {
    return {
      linked: false,
      universityName: null,
      classes: [],
      serverTime: new Date().toISOString(),
    };
  }

  const classes: TeacherStudentsClassCard[] = [];

  for (const s of teacher.subjects) {
    const minAtt = s.minAttendancePercent ?? 75;
    let pendingGrading = 0;
    let missingWorkStudents = new Set<string>();
    const now = Date.now();

    for (const a of s.assignments) {
      const overdue = a.dueDate.getTime() < now;
      for (const sub of a.submissions) {
        if (isPendingGradePublish(sub)) pendingGrading += 1;
        if (overdue && !sub.submittedAt) missingWorkStudents.add(sub.studentId);
      }
    }

    let lowAttendance = 0;
    let supportCount = 0;
    const gradesMap = await loadSubjectCurrentGradesMap(s.id);
    const gradeSamples = [...gradesMap.values()]
      .map((g) => g.overallGrade)
      .filter((g): g is number => g != null);

    for (const e of s.enrollments) {
      if (e.attendance != null && e.attendance < minAtt) lowAttendance += 1;
      const needsAtt = e.attendance != null && e.attendance < minAtt;
      const needsWork = missingWorkStudents.has(e.studentId);
      if (needsAtt || needsWork) supportCount += 1;
    }

    const averageGrade =
      gradeSamples.length > 0
        ? Math.round((gradeSamples.reduce((a, b) => a + b, 0) / gradeSamples.length) * 10) / 10
        : null;

    const attValues = s.enrollments
      .map((e) => e.attendance)
      .filter((v): v is number => v != null);
    const classAttAvg =
      attValues.length > 0
        ? Math.round(attValues.reduce((a, b) => a + b, 0) / attValues.length)
        : null;

    const indicators: TeacherStudentsClassCard['indicators'] = [];
    if (lowAttendance > 0) {
      indicators.push({
        id: 'attendance',
        label: `${lowAttendance} low attendance`,
        tone: 'rose',
      });
    }
    if (pendingGrading > 0) {
      indicators.push({
        id: 'grading',
        label: `${pendingGrading} pending grading`,
        tone: 'amber',
      });
    }
    if (missingWorkStudents.size > 0) {
      indicators.push({
        id: 'missing',
        label: `${missingWorkStudents.size} missing work`,
        tone: 'violet',
      });
    }
    if (supportCount > 0 && indicators.length === 0) {
      indicators.push({
        id: 'support',
        label: `${supportCount} need support`,
        tone: 'rose',
      });
    }

    classes.push({
      id: s.id,
      name: s.name,
      code: s.code,
      courseName: s.course?.name ?? null,
      academicYear: s.year,
      semester: s.semester,
      studentCount: s._count.enrollments,
      attendanceOverview:
        classAttAvg != null ? `${classAttAvg}% class average` : 'Attendance building',
      averageGrade,
      studentsNeedingSupport: supportCount,
      indicators,
      classEcosystemHref: `/teacher/students/${s.id}`,
    });
  }

  return {
    linked: true,
    universityName: teacher.university?.name ?? null,
    classes,
    serverTime: new Date().toISOString(),
  };
}
