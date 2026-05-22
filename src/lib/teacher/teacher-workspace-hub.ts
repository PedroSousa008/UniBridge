import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { ensureTeacherAcademicSchema } from '@/lib/teacher/ensure-teacher-schema';
import { submissionGradePublished } from '@/lib/teacher/teacher-grading';

export interface WorkspaceSubject {
  id: string;
  name: string;
  code: string | null;
  studentCount: number;
  calendarHref: string;
}

export interface WorkspaceTodayClass {
  subjectId: string;
  subjectName: string;
  startTime: string;
  endTime: string;
  room: string | null;
  calendarHref: string;
}

export interface WorkspaceProgressionCard {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  signal: string;
  tone: 'positive' | 'warning' | 'neutral';
  href: string;
}

export interface WorkspaceGradingEvaluation {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  type: 'assignment' | 'exam';
  dueOrDate: string;
  maxScore: number;
  pendingCount: number;
  gradedCount: number;
  totalSubmissions: number;
}

export interface TeacherWorkspaceHub {
  linked: boolean;
  universityName: string | null;
  metrics: {
    todaysClasses: number;
    pendingAttendance: number;
    pendingGrading: number;
  };
  subjects: WorkspaceSubject[];
  todayClasses: WorkspaceTodayClass[];
  gradingQueue: WorkspaceGradingEvaluation[];
  progression: WorkspaceProgressionCard[];
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

export async function loadTeacherWorkspaceHub(actorUserId: string): Promise<TeacherWorkspaceHub> {
  await ensureTeacherAcademicSchema();

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: actorUserId },
    include: {
      university: { select: { name: true } },
      subjects: {
        where: { status: 'ACTIVE' },
        include: {
          scheduleSlots: true,
          enrollments: {
            include: { student: { select: { id: true, name: true } } },
          },
          assignments: {
            include: {
              submissions: {
                include: { student: { select: { id: true, name: true } } },
              },
            },
          },
          attendanceSessions: {
            where: { date: { gte: startOfDay(), lte: endOfDay() } },
            select: { id: true },
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
      metrics: { todaysClasses: 0, pendingAttendance: 0, pendingGrading: 0 },
      subjects: [],
      todayClasses: [],
      gradingQueue: [],
      progression: [],
      serverTime: new Date().toISOString(),
    };
  }

  const todayDow = new Date().getDay();
  const todayClasses: WorkspaceTodayClass[] = [];
  let pendingAttendance = 0;

  const subjects: WorkspaceSubject[] = teacher.subjects.map((s) => {
    const calendarHref = `/teacher/classes/${s.id}/calendar`;
    for (const slot of s.scheduleSlots) {
      if (slot.dayOfWeek === todayDow) {
        todayClasses.push({
          subjectId: s.id,
          subjectName: s.name,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          calendarHref,
        });
      }
    }
    if (s.scheduleSlots.some((sl) => sl.dayOfWeek === todayDow) && s.attendanceSessions.length === 0) {
      pendingAttendance += 1;
    }
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      studentCount: s._count.enrollments,
      calendarHref,
    };
  });

  todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

  const gradingQueue: WorkspaceGradingEvaluation[] = [];
  let pendingGrading = 0;

  for (const s of teacher.subjects) {
    for (const a of s.assignments) {
      const subs = a.submissions.filter((sub) => sub.submittedAt);
      const graded = subs.filter((sub) => submissionGradePublished(sub)).length;
      const pending = subs.length - graded;
      if (pending > 0) pendingGrading += pending;
      if (subs.length > 0) {
        gradingQueue.push({
          id: a.id,
          subjectId: s.id,
          subjectName: s.name,
          title: a.title,
          type: 'assignment',
          dueOrDate: a.dueDate.toISOString(),
          maxScore: a.maxScore,
          pendingCount: pending,
          gradedCount: graded,
          totalSubmissions: subs.length,
        });
      }
    }
  }

  gradingQueue.sort((a, b) => b.pendingCount - a.pendingCount);

  const progression: WorkspaceProgressionCard[] = [];

  for (const s of teacher.subjects) {
    const minAtt = s.minAttendancePercent ?? 75;
    for (const e of s.enrollments) {
      const name = e.student?.name ?? 'Student';
      const att = e.attendance;
      if (att != null && att < minAtt) {
        progression.push({
          studentId: e.studentId,
          studentName: name,
          subjectId: s.id,
          subjectName: s.name,
          signal: `Low attendance (${Math.round(att)}%)`,
          tone: 'warning',
          href: `/teacher/workspace?view=attendance&subject=${s.id}`,
        });
      } else if (att != null && att >= 90) {
        progression.push({
          studentId: e.studentId,
          studentName: name,
          subjectId: s.id,
          subjectName: s.name,
          signal: 'Strong attendance consistency',
          tone: 'positive',
          href: `/teacher/students`,
        });
      }
    }
  }

  return {
    linked: true,
    universityName: teacher.university?.name ?? null,
    metrics: {
      todaysClasses: todayClasses.length,
      pendingAttendance,
      pendingGrading,
    },
    subjects,
    todayClasses,
    gradingQueue: gradingQueue.slice(0, 12),
    progression: progression.slice(0, 8),
    serverTime: new Date().toISOString(),
  };
}

export async function loadTeacherWorkspaceSubjectStudents(subjectId: string, teacherUserId: string) {
  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
  if (!teacher) return null;

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId ?? undefined }],
    },
    include: {
      enrollments: {
        include: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!subject) return null;

  return subject.enrollments.map((e) => ({
    id: e.studentId,
    name: e.student.name ?? 'Student',
    email: e.student.email,
    attendance: e.attendance,
  }));
}

export async function loadTeacherWorkspaceAssignmentSubmissions(
  assignmentId: string,
  teacherUserId: string
) {
  await ensureAssignmentTables();

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      subject: true,
      submissions: {
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { submittedAt: 'desc' },
      },
    },
  });
  if (!assignment?.subjectId) return null;

  const teacher = await prisma.teacherProfile.findUnique({ where: { userId: teacherUserId } });
  if (!teacher) return null;

  const ok = await prisma.subject.findFirst({
    where: {
      id: assignment.subjectId,
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId ?? undefined }],
    },
  });
  if (!ok) return null;

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      maxScore: assignment.maxScore,
      subjectId: assignment.subjectId,
      subjectName: assignment.subject.name,
    },
    submissions: assignment.submissions.map((sub) => {
      const row = sub as typeof sub & {
        draftScore?: number | null;
        gradePublished?: boolean;
        teacherFeedback?: string | null;
      };
      return {
        id: sub.id,
        studentId: sub.studentId,
        studentName: sub.student?.name ?? 'Student',
        studentEmail: sub.student?.email ?? '',
        submittedAt: sub.submittedAt?.toISOString() ?? null,
        draftScore: row.draftScore ?? sub.score,
        score: sub.score,
        gradePublished: row.gradePublished ?? false,
        teacherFeedback: row.teacherFeedback ?? sub.comment,
      };
    }),
  };
}
