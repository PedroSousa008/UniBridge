import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';

export interface TeacherSubjectCardSignal {
  pendingEvaluations: number;
  attendanceAlerts: number;
  upcomingDeadlines: number;
  recentAnnouncements: number;
}

export interface TeacherSubjectCard {
  id: string;
  name: string;
  code: string | null;
  courseName: string | null;
  semester: string | null;
  year: number | null;
  studentCount: number;
  ecosystemHref: string;
  signals: TeacherSubjectCardSignal;
}

export interface TeacherClassesHub {
  linked: boolean;
  universityName: string | null;
  subjects: TeacherSubjectCard[];
  coordinatingCourses: {
    id: string;
    name: string;
    department: string | null;
    studentCount: number;
    subjectCount: number;
  }[];
  serverTime: string;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export async function loadTeacherClassesHub(actorUserId: string): Promise<TeacherClassesHub> {
  await Promise.all([ensureAttendanceTables(), ensureAssignmentTables()]);

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: actorUserId },
    include: {
      university: { select: { name: true } },
      subjects: {
        where: { status: 'ACTIVE' },
        include: {
          course: { select: { name: true } },
          scheduleSlots: { select: { dayOfWeek: true } },
          enrollments: { select: { studentId: true, attendance: true } },
          assignments: {
            include: {
              submissions: {
                select: { submittedAt: true, gradePublished: true },
              },
            },
          },
          announcements: {
            where: { publishedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
            select: { id: true },
          },
          attendanceSessions: {
            where: { date: { gte: startOfDay(), lte: endOfDay() } },
            select: { id: true },
          },
          _count: { select: { enrollments: true } },
        },
        orderBy: { name: 'asc' },
      },
      coursesCoordinated: {
        include: { _count: { select: { students: true, subjects: true } } },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!teacher?.universityId) {
    return {
      linked: false,
      universityName: null,
      subjects: [],
      coordinatingCourses: [],
      serverTime: new Date().toISOString(),
    };
  }

  const todayDow = new Date().getDay();
  const weekAhead = new Date(Date.now() + 7 * 86400000);
  const subjects: TeacherSubjectCard[] = teacher.subjects.map((s) => {
    const subjectMinAtt = s.minAttendancePercent ?? 75;
    let pendingEvaluations = 0;
    let upcomingDeadlines = 0;

    for (const a of s.assignments) {
      const subs = a.submissions.filter((sub) => sub.submittedAt);
      pendingEvaluations += subs.filter((sub) => !sub.gradePublished).length;
      if (a.dueDate <= weekAhead && a.dueDate >= new Date()) upcomingDeadlines += 1;
    }

    let attendanceAlerts = 0;
    const hasClassToday = s.scheduleSlots.some((sl) => sl.dayOfWeek === todayDow);
    if (hasClassToday && s.attendanceSessions.length === 0) attendanceAlerts += 1;
    for (const e of s.enrollments) {
      if (e.attendance != null && e.attendance < subjectMinAtt) attendanceAlerts += 1;
    }

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      courseName: s.course?.name ?? null,
      semester: s.semester,
      year: s.year,
      studentCount: s._count.enrollments,
      ecosystemHref: `/teacher/classes/${s.id}/home`,
      signals: {
        pendingEvaluations,
        attendanceAlerts,
        upcomingDeadlines,
        recentAnnouncements: s.announcements.length,
      },
    };
  });

  return {
    linked: true,
    universityName: teacher.university?.name ?? null,
    subjects,
    coordinatingCourses: teacher.coursesCoordinated.map((c) => ({
      id: c.id,
      name: c.name,
      department: c.department,
      studentCount: c._count.students,
      subjectCount: c._count.subjects,
    })),
    serverTime: new Date().toISOString(),
  };
}
