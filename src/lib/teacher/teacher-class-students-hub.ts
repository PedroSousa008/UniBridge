import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { requireTeacherSubjectAccess } from '@/lib/teacher/teacher-subject-context';
import { loadSubjectAttendanceReport } from '@/lib/teacher/subject-attendance-report';
import { loadSubjectCurrentGradesMap } from '@/lib/teacher/teacher-students-grade-utils';
import {
  buildStudentSupportAlerts,
  engagementLabel,
  participationLabel,
  studentNeedsSupport,
  type StudentSupportAlert,
} from '@/lib/teacher/teacher-students-shared';
import {
  isPendingGradePublish,
  isStudentAssignmentMissing,
} from '@/lib/teacher/teacher-grading';

export type TeacherClassGroup = {
  id: string;
  name: string;
  notes: string | null;
  memberIds: string[];
};

export type TeacherClassStudentCard = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  courseName: string | null;
  yearOfStudy: number | null;
  attendancePercent: number | null;
  componentGrades: { name: string; display: string }[];
  overallGrade: number | null;
  overallGradeDisplay: string;
  alerts: StudentSupportAlert[];
  needsSupport: boolean;
  missingAssignments: number;
  overdueMissing: number;
  submissionsThisMonth: number;
  engagementLabel: string;
  participationLabel: string;
  privateNote: string | null;
  messageHref: string;
  profileHref: string;
};

export type TeacherClassStudentsHub = {
  subject: {
    id: string;
    name: string;
    code: string | null;
    courseName: string | null;
    academicYear: number | null;
    semester: string | null;
    minAttendancePercent: number;
  };
  students: TeacherClassStudentCard[];
  groups: TeacherClassGroup[];
  classAverageGrade: number | null;
  classAverageAttendance: number | null;
  studentsNeedingSupport: number;
  serverTime: string;
};

type GroupRow = { id: string; name: string; notes: string | null };
type MemberRow = { groupId: string; studentId: string };

export async function loadTeacherClassStudentsHub(
  actorUserId: string,
  subjectId: string
): Promise<TeacherClassStudentsHub> {
  await ensureTeacherStudentsSchema();
  const { subject, teacher } = await requireTeacherSubjectAccess(actorUserId, subjectId);
  const minAttendance = subject.minAttendancePercent ?? 75;

  const [attendanceReport, gradesMap, enrollments, assignments, groupsRaw, membersRaw, notes] =
    await Promise.all([
      loadSubjectAttendanceReport(subjectId),
      loadSubjectCurrentGradesMap(subjectId),
      prisma.subjectEnrollment.findMany({
        where: { subjectId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              studentProfile: {
                select: {
                  course: { select: { name: true } },
                  program: true,
                  yearOfStudy: true,
                  engagementScore: true,
                },
              },
            },
          },
        },
        orderBy: { student: { name: 'asc' } },
      }),
      prisma.assignment.findMany({
        where: { subjectId },
        select: {
          id: true,
          dueDate: true,
          submissions: {
            select: {
              studentId: true,
              submittedAt: true,
              gradePublished: true,
              score: true,
            },
          },
        },
      }),
      prisma.$queryRaw<GroupRow[]>`
        SELECT "id", "name", "notes" FROM "TeacherClassGroup"
        WHERE "subjectId" = ${subjectId} AND "teacherId" = ${teacher.id}
        ORDER BY "name" ASC
      `,
      prisma.$queryRaw<MemberRow[]>`
        SELECT m."groupId", m."studentId"
        FROM "TeacherClassGroupMember" m
        INNER JOIN "TeacherClassGroup" g ON g."id" = m."groupId"
        WHERE g."subjectId" = ${subjectId}
      `,
      prisma.teacherAttendanceNote.findMany({
        where: { subjectId },
        select: { studentId: true, note: true },
      }),
    ]);

  const noteByStudent = new Map(notes.map((n) => [n.studentId, n.note]));
  const attByStudent = new Map(
    attendanceReport.students.map((s) => [s.studentId, s.attendancePercent])
  );

  const now = Date.now();
  const monthAgo = Date.now() - 30 * 86400000;

  const students: TeacherClassStudentCard[] = enrollments.map((e) => {
    const studentId = e.studentId;
    const grades = gradesMap.get(studentId);
    let missingAssignments = 0;
    let overdueMissing = 0;
    let submissionsThisMonth = 0;
    let pendingGradingForStudent = false;

    for (const a of assignments) {
      const sub = a.submissions.find((s) => s.studentId === studentId);
      if (sub?.submittedAt) {
        const t = new Date(sub.submittedAt).getTime();
        if (t >= monthAgo) submissionsThisMonth += 1;
        if (isPendingGradePublish(sub)) pendingGradingForStudent = true;
      }
      const gap = isStudentAssignmentMissing(sub, a.dueDate, now);
      if (gap.pending) {
        missingAssignments += 1;
        if (gap.overdue) overdueMissing += 1;
      }
    }

    const sp = e.student.studentProfile;
    const courseName = sp?.course?.name ?? sp?.program ?? subject.course?.name ?? null;
    const engagement = sp?.engagementScore ?? null;
    const attendancePercent = attByStudent.get(studentId) ?? e.attendance ?? null;

    const alerts = buildStudentSupportAlerts({
      attendancePercent,
      minAttendance,
      missingAssignments,
      overdueMissing,
      overallGrade: grades?.overallGrade ?? null,
      pendingGradingForStudent,
      engagementScore: engagement,
    });

    return {
      id: studentId,
      name: e.student.name ?? 'Student',
      email: e.student.email ?? '',
      image: e.student.image,
      courseName,
      yearOfStudy: sp?.yearOfStudy ?? null,
      attendancePercent,
      componentGrades: (grades?.components ?? []).map((c) => ({
        name: c.name,
        display: c.display,
      })),
      overallGrade: grades?.overallGrade ?? null,
      overallGradeDisplay:
        grades?.overallGrade != null ? String(grades.overallGrade) : '—',
      alerts,
      needsSupport: studentNeedsSupport(alerts),
      missingAssignments,
      overdueMissing,
      submissionsThisMonth,
      engagementLabel: engagementLabel(engagement),
      participationLabel: participationLabel(submissionsThisMonth),
      privateNote: noteByStudent.get(studentId) ?? null,
      messageHref: `/teacher/classes/${subjectId}/messages?studentId=${studentId}&channel=direct`,
      profileHref: `/teacher/students/${subjectId}/${studentId}`,
    };
  });

  const gradeValues = students
    .map((s) => s.overallGrade)
    .filter((g): g is number => g != null);
  const attValues = students
    .map((s) => s.attendancePercent)
    .filter((a): a is number => a != null);

  const groups: TeacherClassGroup[] = groupsRaw.map((g) => ({
    id: g.id,
    name: g.name,
    notes: g.notes,
    memberIds: membersRaw.filter((m) => m.groupId === g.id).map((m) => m.studentId),
  }));

  return {
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      courseName: subject.course?.name ?? null,
      academicYear: subject.year,
      semester: subject.semester,
      minAttendancePercent: minAttendance,
    },
    students,
    groups,
    classAverageGrade:
      gradeValues.length > 0
        ? Math.round((gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length) * 10) / 10
        : null,
    classAverageAttendance: attendanceReport.classAveragePercent,
    studentsNeedingSupport: students.filter((s) => s.needsSupport).length,
    serverTime: new Date().toISOString(),
  };
}
