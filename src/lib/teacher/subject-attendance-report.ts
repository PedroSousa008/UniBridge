import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';

export type AttendanceStatusLabel = 'Excellent' | 'Good' | 'Warning' | 'Critical' | 'No data';

export type SubjectAttendanceStudentRow = {
  studentId: string;
  name: string;
  email: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
  lateCount: number;
  attendancePercent: number | null;
  status: AttendanceStatusLabel;
  lastRecord: {
    date: string;
    status: string;
    sessionLabel: string | null;
  } | null;
};

export type SubjectAttendanceSessionSummary = {
  id: string;
  date: string;
  label: string | null;
  recordCount: number;
  canceled: boolean;
};

export type SubjectAttendanceReport = {
  subjectId: string;
  subjectName: string;
  minAttendancePercent: number;
  totalSessions: number;
  classAveragePercent: number | null;
  pendingJustifications: number;
  students: SubjectAttendanceStudentRow[];
  recentSessions: SubjectAttendanceSessionSummary[];
  updatedAt: string;
};

export function attendanceStatusFromPercent(
  pct: number | null,
  minRequired: number
): AttendanceStatusLabel {
  if (pct == null) return 'No data';
  if (pct >= 90) return 'Excellent';
  if (pct >= minRequired) return 'Good';
  if (pct >= Math.max(0, minRequired - 12)) return 'Warning';
  return 'Critical';
}

function statusLabelForRecord(status: string): string {
  switch (status) {
    case 'PRESENT':
      return 'Present';
    case 'ABSENT':
      return 'Absent';
    case 'EXCUSED':
      return 'Justified';
    case 'LATE':
      return 'Late';
    default:
      return status;
  }
}

export async function loadSubjectAttendanceReport(
  subjectId: string
): Promise<SubjectAttendanceReport> {
  await ensureAttendanceTables();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      minAttendancePercent: true,
    },
  });
  if (!subject) {
    return {
      subjectId,
      subjectName: 'Subject',
      minAttendancePercent: 75,
      totalSessions: 0,
      classAveragePercent: null,
      pendingJustifications: 0,
      students: [],
      recentSessions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const minRequired = subject.minAttendancePercent ?? 75;

  const [enrollments, sessions, pendingJustifications] = await Promise.all([
    prisma.subjectEnrollment.findMany({
      where: { subjectId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { student: { name: 'asc' } },
    }),
    prisma.subjectAttendanceSession.findMany({
      where: { subjectId, canceled: false },
      include: {
        records: { select: { studentId: true, status: true, updatedAt: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.attendanceJustification.count({
      where: { subjectId, status: 'PENDING' },
    }),
  ]);

  const totalSessions = sessions.length;
  const sessionsAsc = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const students: SubjectAttendanceStudentRow[] = enrollments.map((enrollment) => {
    const studentId = enrollment.studentId;
    let presentCount = 0;
    let absentCount = 0;
    let justifiedCount = 0;
    let lateCount = 0;
    let lastRecord: SubjectAttendanceStudentRow['lastRecord'] = null;

    for (const session of sessionsAsc) {
      const rec = session.records.find((r) => r.studentId === studentId);
      if (!rec) continue;

      if (rec.status === 'PRESENT') presentCount++;
      else if (rec.status === 'ABSENT') absentCount++;
      else if (rec.status === 'EXCUSED') justifiedCount++;
      else if (rec.status === 'LATE') lateCount++;

      const recDate = session.date.toISOString();
      if (
        !lastRecord ||
        new Date(recDate).getTime() > new Date(lastRecord.date).getTime()
      ) {
        lastRecord = {
          date: recDate,
          status: statusLabelForRecord(rec.status),
          sessionLabel: session.label,
        };
      }
    }

    const recorded = presentCount + absentCount + justifiedCount + lateCount;
    const attendancePercent =
      recorded > 0
        ? enrollment.attendance != null
          ? Math.round(enrollment.attendance)
          : Math.round(
              ((presentCount + lateCount + justifiedCount) / recorded) * 100
            )
        : enrollment.attendance != null
          ? Math.round(enrollment.attendance)
          : null;

    return {
      studentId,
      name: enrollment.student?.name ?? 'Student',
      email: enrollment.student?.email ?? '',
      totalClasses: totalSessions,
      presentCount: presentCount + lateCount,
      absentCount,
      justifiedCount,
      lateCount,
      attendancePercent,
      status: attendanceStatusFromPercent(attendancePercent, minRequired),
      lastRecord,
    };
  });

  const withPct = students.filter((s) => s.attendancePercent != null);
  const classAveragePercent =
    withPct.length > 0
      ? Math.round(
          withPct.reduce((sum, s) => sum + (s.attendancePercent ?? 0), 0) / withPct.length
        )
      : null;

  const recentSessions: SubjectAttendanceSessionSummary[] = sessions.slice(0, 12).map(
    (s) => ({
      id: s.id,
      date: s.date.toISOString(),
      label: s.label,
      recordCount: s.records.length,
      canceled: s.canceled,
    })
  );

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    minAttendancePercent: minRequired,
    totalSessions,
    classAveragePercent,
    pendingJustifications,
    students,
    recentSessions,
    updatedAt: new Date().toISOString(),
  };
}
