import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { ensureTeacherAcademicSchema } from '@/lib/teacher/ensure-teacher-schema';
import {
  isPendingGradePublish,
  isStudentAssignmentMissing,
} from '@/lib/teacher/teacher-grading';
import { loadSubjectAttendanceReport } from '@/lib/teacher/subject-attendance-report';
import { loadSubjectCurrentGradesMap } from '@/lib/teacher/teacher-students-grade-utils';
import {
  isTeacherLowAttendance,
  resolveStudentAttendancePercent,
} from '@/lib/teacher/teacher-students-shared';

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
                  score: true,
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
    let pendingGrading = 0;
    let missingWorkStudents = new Set<string>();
    const now = Date.now();

    for (const a of s.assignments) {
      for (const sub of a.submissions) {
        if (isPendingGradePublish(sub)) pendingGrading += 1;
        const gap = isStudentAssignmentMissing(sub, a.dueDate, now);
        if (gap.overdue) missingWorkStudents.add(sub.studentId);
      }
    }

    let lowAttendance = 0;
    let supportCount = 0;
    const [gradesMap, attendanceReport] = await Promise.all([
      loadSubjectCurrentGradesMap(s.id),
      loadSubjectAttendanceReport(s.id),
    ]);
    const attByStudent = new Map(
      attendanceReport.students.map((row) => [row.studentId, row.attendancePercent])
    );
    const gradeSamples = [...gradesMap.values()]
      .map((g) => g.overallGrade)
      .filter((g): g is number => g != null);

    for (const e of s.enrollments) {
      const att = resolveStudentAttendancePercent(
        e.studentId,
        attByStudent,
        e.attendance
      );
      if (isTeacherLowAttendance(att)) lowAttendance += 1;
      const needsAtt = isTeacherLowAttendance(att);
      const needsWork = missingWorkStudents.has(e.studentId);
      if (needsAtt || needsWork) supportCount += 1;
    }

    const averageGrade =
      gradeSamples.length > 0
        ? Math.round((gradeSamples.reduce((a, b) => a + b, 0) / gradeSamples.length) * 10) / 10
        : null;

    const classAttAvg = attendanceReport.classAveragePercent;

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
