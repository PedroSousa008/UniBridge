import { prisma } from '@/lib/db';
import { ensureTeacherStudentsSchema } from '@/lib/db/ensure-teacher-students-schema';
import { requireTeacherSubjectAccess } from '@/lib/teacher/teacher-subject-context';
import { loadSubjectAttendanceReport } from '@/lib/teacher/subject-attendance-report';
import { loadStudentPublishedGrades } from '@/lib/teacher/teacher-students-grade-utils';
import {
  buildStudentSupportAlerts,
  engagementLabel,
  participationLabel,
} from '@/lib/teacher/teacher-students-shared';

export async function loadTeacherStudentAcademicProfile(
  actorUserId: string,
  subjectId: string,
  studentId: string
) {
  await ensureTeacherStudentsSchema();
  const { subject, teacher } = await requireTeacherSubjectAccess(actorUserId, subjectId);

  const enrollment = await prisma.subjectEnrollment.findUnique({
    where: { subjectId_studentId: { subjectId, studentId } },
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
              profileStrength: true,
            },
          },
        },
      },
    },
  });
  if (!enrollment) return null;

  const minAttendance = subject.minAttendancePercent ?? 75;
  const monthAgo = new Date(Date.now() - 30 * 86400000);

  const [
    attendanceReport,
    currentClassGrades,
    allEnrollments,
    subjectAssignments,
    announcementReads,
    officeHours,
    privateNote,
    recentSubmissions,
  ] = await Promise.all([
    loadSubjectAttendanceReport(subjectId),
    loadStudentPublishedGrades(subjectId, studentId),
    prisma.subjectEnrollment.findMany({
      where: { studentId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            teacherId: true,
            status: true,
          },
        },
      },
      orderBy: { subject: { name: 'asc' } },
    }),
    prisma.assignment.findMany({
      where: { subjectId },
      select: {
        id: true,
        title: true,
        dueDate: true,
        submissions: {
          where: { studentId },
          select: {
            submittedAt: true,
            gradePublished: true,
            score: true,
          },
        },
      },
    }),
    prisma.announcementRead.count({
      where: {
        studentId,
        announcement: { subjectId },
      },
    }),
    prisma.subjectOfficeHours.findMany({
      where: { subjectId },
      orderBy: { dayOfWeek: 'asc' },
      take: 8,
    }),
    prisma.teacherAttendanceNote.findUnique({
      where: { subjectId_studentId: { subjectId, studentId } },
      select: { note: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        studentId,
        assignment: { subjectId },
        submittedAt: { gte: monthAgo },
      },
      select: { submittedAt: true, gradePublished: true },
      orderBy: { submittedAt: 'desc' },
      take: 20,
    }),
  ]);

  const attRow = attendanceReport.students.find((s) => s.studentId === studentId);
  const now = Date.now();
  let missingAssignments = 0;
  let overdueMissing = 0;
  for (const a of subjectAssignments) {
    const sub = a.submissions[0];
    if (!sub?.submittedAt) {
      missingAssignments += 1;
      if (a.dueDate.getTime() < now) overdueMissing += 1;
    }
  }

  const sp = enrollment.student.studentProfile;
  const engagement = sp?.engagementScore ?? null;
  const submissionsThisMonth = recentSubmissions.length;

  const alerts = buildStudentSupportAlerts({
    attendancePercent: attRow?.attendancePercent ?? enrollment.attendance ?? null,
    minAttendance,
    missingAssignments,
    overdueMissing,
    overallGrade: currentClassGrades.overallGrade,
    pendingGradingForStudent: subjectAssignments.some(
      (a) => a.submissions[0]?.submittedAt && !a.submissions[0]?.gradePublished
    ),
    engagementScore: engagement,
  });

  const otherClasses = await Promise.all(
    allEnrollments
      .filter((e) => e.subject.status === 'ACTIVE')
      .map(async (e) => {
        const g = await loadStudentPublishedGrades(e.subjectId, studentId);
        return {
          subjectId: e.subjectId,
          subjectName: e.subject.name,
          isCurrentClass: e.subjectId === subjectId,
          overallGrade: g.overallGrade,
          components: g.components,
        };
      })
  );

  return {
    subject: {
      id: subject.id,
      name: subject.name,
      courseName: subject.course?.name ?? null,
    },
    student: {
      id: studentId,
      name: enrollment.student.name ?? 'Student',
      email: enrollment.student.email ?? '',
      image: enrollment.student.image,
      courseName: sp?.course?.name ?? sp?.program ?? null,
      yearOfStudy: sp?.yearOfStudy ?? null,
      profileStrength: sp?.profileStrength ?? null,
    },
    alerts,
    engagementLabel: engagementLabel(engagement),
    participationLabel: participationLabel(submissionsThisMonth),
    attendance: attRow ?? null,
    currentClassGrades,
    allClasses: otherClasses,
    assignments: subjectAssignments.map((a) => {
      const sub = a.submissions[0];
      return {
        id: a.id,
        title: a.title,
        dueDate: a.dueDate.toISOString(),
        submitted: !!sub?.submittedAt,
        grade: sub?.gradePublished ? sub.score : null,
      };
    }),
    announcementReads,
    officeHours: officeHours.map((o) => ({
      id: o.id,
      dayOfWeek: o.dayOfWeek,
      startTime: o.startTime,
      endTime: o.endTime,
      location: o.location,
    })),
    privateNote: privateNote?.note ?? null,
    activity: {
      submissionsThisMonth,
      announcementReads,
    },
    links: {
      message: `/teacher/classes/${subjectId}/messages?studentId=${studentId}&channel=direct`,
      attendance: `/teacher/classes/${subjectId}/attendance`,
      gradebook: `/teacher/classes/${subjectId}/gradebook`,
      announcements: `/teacher/classes/${subjectId}/announcements`,
      calendar: `/teacher/classes/${subjectId}/calendar`,
    },
    teacherId: teacher.id,
    serverTime: new Date().toISOString(),
  };
}
