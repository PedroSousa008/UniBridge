import { addDays, format, isAfter, isBefore, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { prisma } from '@/lib/db';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';
import { attendanceSummary } from '@/lib/student/gradebook-engine';
import { loadStudentWeeklySchedule } from '@/lib/student/weekly-schedule';

export type AttendanceRiskLevel = 'safe' | 'warning' | 'risk';

export interface AttendanceSessionRow {
  id: string;
  date: string;
  label: string | null;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE' | 'UNMARKED';
  canceled: boolean;
  isOnline: boolean;
  movedTo: string | null;
}

export interface SubjectAttendanceCard {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  professor: string | null;
  attendancePercent: number | null;
  totalClasses: number;
  totalPresences: number;
  totalAbsences: number;
  lateArrivals: number;
  excused: number;
  absenceLimit: number | null;
  minAttendancePercent: number;
  risk: AttendanceRiskLevel;
  sessions: AttendanceSessionRow[];
  href: string;
}

export interface AttendanceJustificationRow {
  id: string;
  subjectId: string;
  subjectName: string;
  sessionId: string | null;
  reason: string;
  fileUrl: string | null;
  documentUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface TeacherNoteRow {
  subjectId: string;
  subjectName: string;
  note: string;
  updatedAt: string;
}

export interface AttendanceNotification {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  href: string;
  subjectId?: string;
}

export interface AttendanceOverview {
  globalPercent: number | null;
  bestSubject: { name: string; percent: number } | null;
  worstSubject: { name: string; percent: number } | null;
  totalAbsences: number;
  totalPresences: number;
  lateArrivals: number;
  totalClasses: number;
  trend: { week: string; percent: number }[];
  trendDirection: 'up' | 'down' | 'stable';
}

export interface AttendanceHub {
  overview: AttendanceOverview;
  subjects: SubjectAttendanceCard[];
  justifications: AttendanceJustificationRow[];
  teacherNotes: TeacherNoteRow[];
  notifications: AttendanceNotification[];
  dbReady: boolean;
}

export function resolveAttendanceRisk(
  pct: number | null,
  minPct: number,
  absences: number,
  absenceLimit: number | null
): AttendanceRiskLevel {
  if (absenceLimit != null && absences >= absenceLimit) return 'risk';
  if (pct == null) return 'safe';
  if (pct < minPct) return 'risk';
  if (pct < minPct + 8) return 'warning';
  return 'safe';
}

function mapSession(
  session: {
    id: string;
    date: Date;
    label: string | null;
    canceled: boolean;
    isOnline: boolean;
    movedTo: Date | null;
    records: { status: string }[];
  }
): AttendanceSessionRow {
  const rec = session.records[0];
  return {
    id: session.id,
    date: session.date.toISOString(),
    label: session.label,
    status: rec
      ? (rec.status as AttendanceSessionRow['status'])
      : 'UNMARKED',
    canceled: session.canceled,
    isOnline: session.isOnline,
    movedTo: session.movedTo?.toISOString() ?? null,
  };
}

function buildTrend(
  sessions: { date: Date; status: AttendanceSessionRow['status']; canceled: boolean }[]
): { week: string; percent: number }[] {
  const active = sessions.filter((s) => !s.canceled && s.status !== 'UNMARKED');
  const weeks: { week: string; percent: number }[] = [];

  for (let i = 7; i >= 0; i--) {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const end = addDays(start, 7);
    const label = format(start, 'MMM d');
    const inWeek = active.filter((s) => {
      const d = s.date;
      return !isBefore(d, start) && isBefore(d, end);
    });
    const present = inWeek.filter(
      (s) => s.status === 'PRESENT' || s.status === 'LATE' || s.status === 'EXCUSED'
    ).length;
    weeks.push({
      week: label,
      percent: inWeek.length > 0 ? Math.round((present / inWeek.length) * 100) : 0,
    });
  }

  return weeks;
}

function trendDirection(trend: { percent: number }[]): 'up' | 'down' | 'stable' {
  if (trend.length < 2) return 'stable';
  const recent = trend.slice(-3).filter((t) => t.percent > 0);
  if (recent.length < 2) return 'stable';
  const first = recent[0]!.percent;
  const last = recent[recent.length - 1]!.percent;
  if (last > first + 3) return 'up';
  if (last < first - 3) return 'down';
  return 'stable';
}

export function buildAttendanceNotifications(input: {
  subjects: SubjectAttendanceCard[];
  scheduleClasses: Awaited<ReturnType<typeof loadStudentWeeklySchedule>>['classes'];
}): AttendanceNotification[] {
  const out: AttendanceNotification[] = [];
  const now = new Date();
  const tomorrow = addDays(now, 1);

  for (const s of input.subjects) {
    if (s.attendancePercent != null && s.attendancePercent < s.minAttendancePercent) {
      out.push({
        id: `below-min-${s.subjectId}`,
        severity: 'high',
        title: 'Attendance below threshold',
        message: `${s.subjectName} is at ${s.attendancePercent}% (minimum ${s.minAttendancePercent}%).`,
        href: `/student/academics/attendance?subject=${s.subjectId}`,
        subjectId: s.subjectId,
      });
    }

    if (s.absenceLimit != null && s.totalAbsences >= s.absenceLimit - 1) {
      out.push({
        id: `abs-limit-${s.subjectId}`,
        severity: s.totalAbsences >= s.absenceLimit ? 'high' : 'medium',
        title: 'Absence limit',
        message:
          s.totalAbsences >= s.absenceLimit
            ? `${s.subjectName}: absence limit reached (${s.absenceLimit}).`
            : `${s.subjectName}: ${s.absenceLimit - s.totalAbsences} absence(s) remaining.`,
        href: `/student/academics/attendance?subject=${s.subjectId}`,
        subjectId: s.subjectId,
      });
    }

    const sorted = [...s.sessions]
      .filter((x) => !x.canceled && x.status !== 'UNMARKED')
      .sort((a, b) => b.date.localeCompare(a.date));
    let consecutive = 0;
    for (const row of sorted) {
      if (row.status === 'ABSENT') consecutive++;
      else break;
    }
    if (consecutive >= 3) {
      out.push({
        id: `consecutive-${s.subjectId}`,
        severity: 'high',
        title: 'Consecutive absences',
        message: `You missed ${consecutive} consecutive classes in ${s.subjectName}.`,
        href: `/student/academics/attendance?subject=${s.subjectId}`,
        subjectId: s.subjectId,
      });
    }
  }

  for (const c of input.scheduleClasses) {
    if (c.source !== 'university' || !c.subjectId) continue;
    const day = now.getDay();
    const tomorrowDay = tomorrow.getDay();
    if (c.dayOfWeek !== day && c.dayOfWeek !== tomorrowDay) continue;
    const isTomorrow = c.dayOfWeek === tomorrowDay;
    out.push({
      id: `class-${c.id}-${isTomorrow ? 'tomorrow' : 'today'}`,
      severity: 'low',
      title: isTomorrow ? 'Mandatory class tomorrow' : 'Class today',
      message: `${c.subjectName} — ${c.classType}${c.room ? ` · ${c.room}` : ''}`,
      href: '/student/academics/schedule',
      subjectId: c.subjectId,
    });
  }

  return out.slice(0, 12);
}

export async function loadStudentAttendanceHub(studentId: string): Promise<AttendanceHub> {
  const dbReady = await ensureAttendanceTables();

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: {
      subject: {
        include: {
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
    },
  });

  const active = enrollments.filter((e) => e.subject.status === 'ACTIVE');
  const subjectIds = active.map((e) => e.subjectId);

  const [sessions, justifications, teacherNotes, schedule] = await Promise.all([
    prisma.subjectAttendanceSession.findMany({
      where: { subjectId: { in: subjectIds } },
      include: { records: { where: { studentId } } },
      orderBy: { date: 'desc' },
    }),
    dbReady
      ? prisma.attendanceJustification.findMany({
          where: { studentId },
          include: { subject: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 40,
        })
      : Promise.resolve([]),
    dbReady
      ? prisma.teacherAttendanceNote.findMany({
          where: { studentId },
          include: { subject: { select: { name: true } } },
        })
      : Promise.resolve([]),
    loadStudentWeeklySchedule(studentId),
  ]);

  const sessionsBySubject = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const list = sessionsBySubject.get(s.subjectId) ?? [];
    list.push(s);
    sessionsBySubject.set(s.subjectId, list);
  }

  const subjects: SubjectAttendanceCard[] = active.map((e) => {
    const subSessions = (sessionsBySubject.get(e.subjectId) ?? []).filter((s) => !s.canceled);
    const mapped = subSessions.map(mapSession);
    const att = attendanceSummary(subSessions, e.attendance);
    const late = subSessions.flatMap((s) => s.records).filter((r) => r.status === 'LATE').length;
    const minPct = e.subject.minAttendancePercent ?? 75;
    const absenceLimit = e.subject.absenceLimit ?? null;

    return {
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      subjectCode: e.subject.code,
      professor: e.subject.teacher?.user?.name ?? null,
      attendancePercent: att.pct,
      totalClasses: att.total,
      totalPresences: att.present,
      totalAbsences: att.absent,
      lateArrivals: late,
      excused: att.excused,
      absenceLimit,
      minAttendancePercent: minPct,
      risk: resolveAttendanceRisk(att.pct, minPct, att.absent, absenceLimit),
      sessions: mapped,
      href: `/student/academics/subjects/${e.subjectId}/attendance`,
    };
  });

  const allRecords = subjects.flatMap((s) =>
    s.sessions
      .filter((x) => !x.canceled && x.status !== 'UNMARKED')
      .map((x) => ({
        date: parseISO(x.date),
        status: x.status,
        canceled: x.canceled,
      }))
  );

  const globalPresent = subjects.reduce((a, s) => a + s.totalPresences, 0);
  const globalAbsent = subjects.reduce((a, s) => a + s.totalAbsences, 0);
  const globalLate = subjects.reduce((a, s) => a + s.lateArrivals, 0);
  const globalTotal = subjects.reduce((a, s) => a + s.totalClasses, 0);
  const globalPercent =
    globalTotal > 0
      ? Math.round((globalPresent / globalTotal) * 100)
      : active.length > 0
        ? Math.round(
            active.reduce((a, e) => a + (e.attendance ?? 0), 0) / active.length
          )
        : null;

  const ranked = subjects
    .filter((s) => s.attendancePercent != null)
    .sort((a, b) => (b.attendancePercent ?? 0) - (a.attendancePercent ?? 0));

  const trend = buildTrend(allRecords);

  const overview: AttendanceOverview = {
    globalPercent,
    bestSubject: ranked[0]
      ? { name: ranked[0].subjectName, percent: ranked[0].attendancePercent! }
      : null,
    worstSubject:
      ranked.length > 0
        ? {
            name: ranked[ranked.length - 1]!.subjectName,
            percent: ranked[ranked.length - 1]!.attendancePercent!,
          }
        : null,
    totalAbsences: globalAbsent,
    totalPresences: globalPresent,
    lateArrivals: globalLate,
    totalClasses: globalTotal,
    trend,
    trendDirection: trendDirection(trend),
  };

  const notifications = buildAttendanceNotifications({
    subjects,
    scheduleClasses: schedule.classes,
  });

  return {
    overview,
    subjects: subjects.sort((a, b) => (a.attendancePercent ?? 100) - (b.attendancePercent ?? 100)),
    justifications: justifications.map((j) => ({
      id: j.id,
      subjectId: j.subjectId,
      subjectName: j.subject.name,
      sessionId: j.sessionId,
      reason: j.reason,
      fileUrl: j.fileUrl,
      documentUrl: j.documentUrl,
      status: j.status,
      teacherNote: j.teacherNote,
      createdAt: j.createdAt.toISOString(),
      reviewedAt: j.reviewedAt?.toISOString() ?? null,
    })),
    teacherNotes: teacherNotes.map((n) => ({
      subjectId: n.subjectId,
      subjectName: n.subject.name,
      note: n.note,
      updatedAt: n.updatedAt.toISOString(),
    })),
    notifications,
    dbReady,
  };
}
