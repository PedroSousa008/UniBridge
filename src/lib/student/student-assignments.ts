import type {
  AssignmentPriorityLevel,
  AssignmentWorkflowStatus,
} from '@prisma/client';
import { differenceInHours, format, isTomorrow, isToday } from 'date-fns';
import { prisma } from '@/lib/db';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';

export type AssignmentViewFilter =
  | 'all'
  | 'upcoming'
  | 'in_progress'
  | 'submitted'
  | 'missing'
  | 'completed';

export interface AssignmentLink {
  title: string;
  url: string;
}

export interface AssignmentTimelineStep {
  id: string;
  label: string;
  at: string | null;
  done: boolean;
}

export interface AssignmentGroupInfo {
  id: string;
  name: string;
  members: { id: string; studentId: string; name: string | null; role: string }[];
  tasks: { id: string; title: string; assigneeId: string | null; done: boolean }[];
  files: { id: string; title: string; url: string | null; studentId: string }[];
  comments: { id: string; body: string; studentName: string | null; createdAt: string }[];
}

export interface StudentAssignmentCard {
  id: string;
  title: string;
  subject: { id: string; name: string; code: string | null };
  dueDate: string;
  countdown: string;
  professor: string | null;
  priority: AssignmentPriorityLevel;
  status: AssignmentWorkflowStatus;
  progressPercent: number;
  attachmentCount: number;
  isGroup: boolean;
  weightPercent: number | null;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  instructions: string | null;
  rubric: string | null;
  allowedFormats: string[];
  links: AssignmentLink[];
  attachments: { id: string; title: string; url: string | null; fileUrl: string | null; kind: string }[];
  timeline: AssignmentTimelineStep[];
  group: AssignmentGroupInfo | null;
  canEdit: boolean;
  createdById: string | null;
  submission: {
    comment: string | null;
    linkUrl: string | null;
    fileUrls: string[];
    content: string | null;
  } | null;
}

export interface AssignmentNotification {
  id: string;
  assignmentId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
}

export const STATUS_LABELS: Record<AssignmentWorkflowStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  LATE: 'Late',
  GRADED: 'Graded',
};

export const STATUS_STYLES: Record<AssignmentWorkflowStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  SUBMITTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  LATE: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  GRADED: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
};

export const PRIORITY_STYLES: Record<AssignmentPriorityLevel, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
  HIGH: { label: 'High', className: 'bg-amber-100 text-amber-900' },
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-800' },
};

export function assignmentCountdown(dueDate: Date, now = new Date()): string {
  const ms = dueDate.getTime() - now.getTime();
  if (ms < 0) return 'Overdue';
  const hours = differenceInHours(dueDate, now);
  if (hours < 1) return 'Due soon';
  if (isToday(dueDate)) return `Due in ${hours}h`;
  if (isTomorrow(dueDate)) return 'Due tomorrow';
  const days = Math.ceil(ms / 86400000);
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} left`;
  return format(dueDate, 'MMM d');
}

export function calculateAssignmentPriority(
  dueDate: Date,
  weightPercent: number,
  now = new Date()
): AssignmentPriorityLevel {
  const days = (dueDate.getTime() - now.getTime()) / 86400000;
  let score = 0;
  if (days < 0) score += 35;
  else if (days <= 1) score += 40;
  else if (days <= 3) score += 30;
  else if (days <= 7) score += 18;
  else if (days <= 14) score += 8;
  score += Math.min(30, weightPercent * 0.35);
  if (score >= 55) return 'CRITICAL';
  if (score >= 38) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}

export function deriveAssignmentStatus(params: {
  dueDate: Date;
  submittedAt: Date | null;
  score: number | null;
  progressPercent: number;
  startedAt: Date | null;
  now?: Date;
}): AssignmentWorkflowStatus {
  const now = params.now ?? new Date();
  if (params.score != null) return 'GRADED';
  if (params.submittedAt) {
    return params.dueDate < params.submittedAt ? 'LATE' : 'SUBMITTED';
  }
  if (params.dueDate < now) return 'LATE';
  if (params.progressPercent > 0 || params.startedAt) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function parseLinks(raw: unknown): AssignmentLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object' && 'url' in x)
    .map((x) => ({
      title: String((x as AssignmentLink).title || 'Link'),
      url: String((x as AssignmentLink).url),
    }));
}

function buildTimeline(
  createdAt: Date,
  startedAt: Date | null,
  progressPercent: number,
  submittedAt: Date | null,
  score: number | null
): AssignmentTimelineStep[] {
  return [
    { id: 'assigned', label: 'Assigned', at: createdAt.toISOString(), done: true },
    {
      id: 'started',
      label: 'Started',
      at: startedAt?.toISOString() ?? null,
      done: !!startedAt || progressPercent > 0,
    },
    {
      id: 'draft',
      label: 'Draft in progress',
      at: progressPercent > 0 ? new Date().toISOString() : null,
      done: progressPercent >= 50,
    },
    {
      id: 'submitted',
      label: 'Submitted',
      at: submittedAt?.toISOString() ?? null,
      done: !!submittedAt,
    },
    {
      id: 'graded',
      label: 'Graded',
      at: score != null ? new Date().toISOString() : null,
      done: score != null,
    },
  ];
}

export function buildAssignmentNotifications(
  cards: StudentAssignmentCard[],
  now = new Date()
): AssignmentNotification[] {
  const notes: AssignmentNotification[] = [];
  for (const a of cards) {
    const due = new Date(a.dueDate);
    const hours = differenceInHours(due, now);
    if (a.status !== 'SUBMITTED' && a.status !== 'GRADED' && hours >= 0 && hours <= 24) {
      notes.push({
        id: `due-${a.id}`,
        assignmentId: a.id,
        title: a.title,
        message: `Assignment due ${hours <= 1 ? 'soon' : 'tomorrow'} — ${a.subject.name}`,
        severity: hours <= 6 ? 'urgent' : 'warning',
      });
    }
    if (a.attachmentCount > 0 && a.status === 'NOT_STARTED') {
      notes.push({
        id: `files-${a.id}`,
        assignmentId: a.id,
        title: a.title,
        message: 'Professor attached materials — review before starting.',
        severity: 'info',
      });
    }
    if (a.group && a.group.files.length > 0) {
      notes.push({
        id: `group-${a.id}`,
        assignmentId: a.id,
        title: a.title,
        message: 'Group member uploaded a shared file.',
        severity: 'info',
      });
    }
  }
  return notes.slice(0, 15);
}

export function filterAssignmentsByView(
  cards: StudentAssignmentCard[],
  view: AssignmentViewFilter
): StudentAssignmentCard[] {
  const now = Date.now();
  switch (view) {
    case 'upcoming':
      return cards.filter(
        (a) =>
          new Date(a.dueDate).getTime() >= now &&
          a.status !== 'SUBMITTED' &&
          a.status !== 'GRADED'
      );
    case 'in_progress':
      return cards.filter((a) => a.status === 'IN_PROGRESS');
    case 'submitted':
      return cards.filter((a) => a.status === 'SUBMITTED' || a.status === 'LATE');
    case 'missing':
      return cards.filter((a) => a.status === 'LATE');
    case 'completed':
      return cards.filter((a) => a.status === 'GRADED' || a.status === 'SUBMITTED');
    default:
      return cards;
  }
}

export async function loadStudentAssignmentsHub(studentId: string): Promise<{
  assignments: StudentAssignmentCard[];
  notifications: AssignmentNotification[];
  dbReady: boolean;
}> {
  const dbReady = await ensureAssignmentTables();
  if (!dbReady) return { assignments: [], notifications: [], dbReady: false };

  const { getStudentActiveEnrollmentSubjectIds } = await import('@/lib/academics/enrollments');
  const subjectIds = await getStudentActiveEnrollmentSubjectIds(studentId);

  const rows = await prisma.assignment.findMany({
    where: { subjectId: { in: subjectIds } },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          teacher: { include: { user: { select: { name: true } } } },
        },
      },
      gradeCategory: { select: { weight: true } },
      attachments: true,
      submissions: { where: { studentId } },
      progress: { where: { studentId } },
      groups: {
        include: {
          members: { include: { student: { select: { id: true, name: true } } } },
          tasks: { orderBy: { sortOrder: 'asc' } },
          files: { orderBy: { createdAt: 'desc' }, take: 20 },
          comments: {
            include: { student: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const now = new Date();
  const cards: StudentAssignmentCard[] = rows.map((a) => {
    const sub = a.submissions[0];
    const prog = a.progress[0];
    const weight =
      prog?.studentWeight ??
      a.weightPercent ??
      a.gradeCategory?.weight ??
      10;
    const progressPercent = prog?.progressPercent ?? 0;
    const startedAt = prog?.startedAt ?? null;
    const status = deriveAssignmentStatus({
      dueDate: a.dueDate,
      submittedAt: sub?.submittedAt ?? null,
      score: sub ? studentVisibleScore(sub as { score: number | null; gradePublished?: boolean }) : null,
      progressPercent,
      startedAt,
      now,
    });
    const priority = calculateAssignmentPriority(a.dueDate, weight, now);
    const myGroup = a.groups.find((g) =>
      g.members.some((m) => m.studentId === studentId)
    );
    const group: AssignmentGroupInfo | null = myGroup
      ? {
          id: myGroup.id,
          name: myGroup.name,
          members: myGroup.members.map((m) => ({
            id: m.id,
            studentId: m.studentId,
            name: m.student.name,
            role: m.role,
          })),
          tasks: myGroup.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            assigneeId: t.assigneeId,
            done: t.done,
          })),
          files: myGroup.files.map((f) => ({
            id: f.id,
            title: f.title,
            url: f.url,
            studentId: f.studentId,
          })),
          comments: myGroup.comments.map((c) => ({
            id: c.id,
            body: c.body,
            studentName: c.student.name,
            createdAt: c.createdAt.toISOString(),
          })),
        }
      : null;

    return {
      id: a.id,
      title: a.title,
      subject: a.subject,
      dueDate: a.dueDate.toISOString(),
      countdown: assignmentCountdown(a.dueDate, now),
      professor:
        a.professor ?? a.subject.teacher?.user?.name ?? null,
      priority,
      status,
      progressPercent,
      attachmentCount: a.attachments.length,
      isGroup: a.isGroup,
      weightPercent: weight,
      score: sub ? studentVisibleScore(sub as { score: number | null; gradePublished?: boolean }) : null,
      maxScore: a.maxScore,
      submittedAt: sub?.submittedAt?.toISOString() ?? null,
      instructions: a.instructions ?? a.description,
      rubric: a.rubric,
      allowedFormats: a.allowedFormats ?? [],
      links: parseLinks(a.linksJson),
      attachments: a.attachments.map((att) => ({
        id: att.id,
        title: att.title,
        url: att.url,
        fileUrl: att.fileUrl,
        kind: att.kind,
      })),
      timeline: buildTimeline(
        a.createdAt,
        startedAt,
        progressPercent,
        sub?.submittedAt ?? null,
        sub?.score ?? null
      ),
      group,
      canEdit: false,
      createdById: a.createdById,
      submission: sub
        ? {
            comment: sub.comment,
            linkUrl: sub.linkUrl,
            fileUrls: sub.fileUrls ?? [],
            content: sub.content,
          }
        : null,
    };
  });

  return {
    assignments: cards,
    notifications: buildAssignmentNotifications(cards, now),
    dbReady: true,
  };
}
