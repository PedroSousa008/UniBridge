import type { ExamContentKind, ExamPriorityLevel } from '@prisma/client';
import { differenceInHours, differenceInMinutes, format, isTomorrow, isToday } from 'date-fns';
import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';

export type ExamViewMode = 'upcoming' | 'calendar' | 'timeline' | 'completed';

export interface StudentExamCard {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  subject: { id: string; name: string; code: string | null } | null;
  professor: string | null;
  building: string | null;
  room: string | null;
  seatNumber: string | null;
  onlineUrl: string | null;
  location: string | null;
  countdown: string;
  priority: ExamPriorityLevel;
  prepPercent: number;
  lecturesDone: number;
  workshopsDone: number;
  documentsDone: number;
  revisionsDone: number;
  attendancePercent: number | null;
  classAverage: number | null;
  gradeTrend: number | null;
  difficulty: number;
  weight: number;
  contentVolume: number;
  maxScore: number;
  createdById: string;
  canEdit: boolean;
  isCompleted: boolean;
  includedContent: {
    id: string;
    kind: ExamContentKind;
    label: string;
    isOfficial: boolean;
    contentItemId: string | null;
    done: boolean;
  }[];
  officialAttachments: { id: string; title: string; url: string | null; fileUrl: string | null }[];
  personalAttachments: { id: string; title: string; url: string | null; fileUrl: string | null }[];
  personalResources: { id: string; title: string; kind: string; url: string | null }[];
  personalNotes: string | null;
  description: string | null;
}

export function examCountdown(startAt: Date, now = new Date()): string {
  const ms = startAt.getTime() - now.getTime();
  if (ms < 0) return 'Past';
  const hours = differenceInHours(startAt, now);
  const mins = differenceInMinutes(startAt, now);
  if (hours < 1) return mins <= 1 ? 'Starting soon' : `In ${mins} minutes`;
  if (isToday(startAt)) return `In ${hours} hour${hours === 1 ? '' : 's'}`;
  if (isTomorrow(startAt)) return 'Tomorrow';
  const days = Math.ceil(ms / 86400000);
  if (days === 1) return '1 day left';
  if (days <= 14) return `${days} days left`;
  return format(startAt, 'MMM d');
}

export function calculateExamPriority(
  startAt: Date,
  prepPercent: number,
  difficulty: number,
  weight: number,
  contentVolume: number,
  now = new Date()
): ExamPriorityLevel {
  const days = (startAt.getTime() - now.getTime()) / 86400000;
  let score = 0;
  if (days <= 1) score += 40;
  else if (days <= 3) score += 32;
  else if (days <= 7) score += 22;
  else if (days <= 14) score += 12;
  else if (days <= 30) score += 6;

  score += Math.min(25, difficulty * 5);
  score += Math.min(20, weight * 8);
  score += Math.min(15, contentVolume * 1.5);
  score += Math.max(0, (100 - prepPercent) * 0.25);

  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
}

function parseChecklist(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, boolean>;
}

function computePrepStats(
  included: { id: string; kind: ExamContentKind }[],
  checklist: Record<string, boolean>
) {
  let lecturesDone = 0;
  let workshopsDone = 0;
  let documentsDone = 0;
  let revisionsDone = 0;
  let done = 0;

  for (const item of included) {
    if (!checklist[item.id]) continue;
    done++;
    if (item.kind === 'LECTURE') lecturesDone++;
    else if (item.kind === 'WORKSHOP') workshopsDone++;
    else if (item.kind === 'DOCUMENT') documentsDone++;
    else revisionsDone++;
  }

  const total = included.length || 1;
  const prepPercent = included.length ? Math.round((done / total) * 100) : 0;
  return { prepPercent, lecturesDone, workshopsDone, documentsDone, revisionsDone };
}

export interface ExamAiInsight {
  dailyStudyMinutes: number;
  dailyStudyLabel: string;
  readiness: 'high' | 'medium' | 'low';
  messages: string[];
}

export function buildExamAiInsights(
  exam: StudentExamCard,
  freeHoursPerDay = 2.5
): ExamAiInsight {
  const now = new Date();
  const start = new Date(exam.startAt);
  const daysLeft = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / 86400000));
  const remaining = exam.includedContent.filter((c) => !c.done);
  const remainingLectures = remaining.filter((c) => c.kind === 'LECTURE').length;
  const remainingDocs = remaining.filter((c) => c.kind === 'DOCUMENT').length;
  const contentHours = remaining.length * 0.75 + exam.contentVolume * 0.3;
  const dailyMinutes = Math.min(240, Math.round((contentHours * 60) / daysLeft));
  const effectiveMinutes = Math.min(dailyMinutes, Math.round(freeHoursPerDay * 60));

  const messages: string[] = [];
  messages.push(
    `Based on your exam date and available free time, study about ${Math.floor(effectiveMinutes / 60)}h ${effectiveMinutes % 60}m daily.`
  );
  if (remainingLectures > 0) {
    messages.push(`You still haven't reviewed ${remainingLectures} important lecture${remainingLectures === 1 ? '' : 's'}.`);
  }
  if (remainingDocs > 0) {
    messages.push(`${remainingDocs} document${remainingDocs === 1 ? '' : 's'} still need review.`);
  }

  const needed = 100 - exam.prepPercent;
  const pace = needed / daysLeft;
  let readiness: ExamAiInsight['readiness'] = 'high';
  if (pace > 12 || (daysLeft <= 3 && exam.prepPercent < 60)) {
    readiness = 'low';
    messages.push('Your probability of completing preparation on time is low — prioritize high-weight topics.');
  } else if (pace > 6 || exam.prepPercent < 45) {
    readiness = 'medium';
    messages.push('You are slightly behind — add one focused revision block this week.');
  } else {
    messages.push('You are on track if you keep your current study rhythm.');
  }

  return {
    dailyStudyMinutes: effectiveMinutes,
    dailyStudyLabel: `${Math.floor(effectiveMinutes / 60)}h ${effectiveMinutes % 60}m`,
    readiness,
    messages,
  };
}

export async function loadStudentExamsHub(studentId: string): Promise<StudentExamCard[]> {
  const ready = await ensureExamTables();
  if (!ready) return [];

  const { getStudentLinkedUniversityId, studentEnrollmentsWhere } = await import(
    '@/lib/academics/enrollments'
  );
  const universityId = await getStudentLinkedUniversityId(studentId);
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: studentEnrollmentsWhere(studentId, universityId),
    select: { subjectId: true, attendance: true, grade: true, subject: { select: { id: true, name: true, code: true } } },
  });
  const subjectIds = enrollments.map((e) => e.subjectId);
  const attendanceBySubject = new Map(enrollments.map((e) => [e.subjectId, e.attendance]));
  const gradeBySubject = new Map(enrollments.map((e) => [e.subjectId, e.grade]));

  const exams = await prisma.exam.findMany({
    where: {
      OR: [{ subjectId: { in: subjectIds } }, { ownerStudentId: studentId }],
    },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      includedContent: { orderBy: { sortOrder: 'asc' } },
      attachments: true,
      preparations: { where: { studentId } },
      personalResources: { where: { studentId } },
    },
    orderBy: { date: 'asc' },
  });

  const now = new Date();

  return exams.map((e) => {
    const prep = e.preparations[0];
    const checklist = parseChecklist(prep?.checklist);
    const included = e.includedContent.map((c) => ({
      id: c.id,
      kind: c.kind,
      label: c.label,
      isOfficial: c.isOfficial,
      contentItemId: c.contentItemId,
      done: !!checklist[c.id],
    }));

    const stats = computePrepStats(
      e.includedContent.map((c) => ({ id: c.id, kind: c.kind })),
      checklist
    );
    const prepPercent = prep?.prepPercent ?? stats.prepPercent;
    const startAt = e.date;
    const endAt = e.endAt ?? new Date(e.date.getTime() + 2 * 3600000);
    const isCompleted = endAt.getTime() < now.getTime();

    const priority = calculateExamPriority(
      startAt,
      prepPercent,
      e.difficulty,
      e.weight,
      e.contentVolume,
      now
    );

    const officialAttachments = e.attachments
      .filter((a) => a.isOfficial && !a.studentId)
      .map((a) => ({ id: a.id, title: a.title, url: a.url, fileUrl: a.fileUrl }));
    const personalAttachments = e.attachments
      .filter((a) => a.studentId === studentId)
      .map((a) => ({ id: a.id, title: a.title, url: a.url, fileUrl: a.fileUrl }));

    return {
      id: e.id,
      title: e.title,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      subject: e.subject,
      professor: e.professor,
      building: e.building,
      room: e.room,
      seatNumber: e.seatNumber,
      onlineUrl: e.onlineUrl,
      location: e.location,
      countdown: examCountdown(startAt, now),
      priority,
      prepPercent,
      lecturesDone: prep?.lecturesDone ?? stats.lecturesDone,
      workshopsDone: prep?.workshopsDone ?? stats.workshopsDone,
      documentsDone: prep?.documentsDone ?? stats.documentsDone,
      revisionsDone: prep?.revisionsDone ?? stats.revisionsDone,
      attendancePercent: e.subjectId ? attendanceBySubject.get(e.subjectId) ?? null : null,
      classAverage: e.classAverage,
      gradeTrend: e.subjectId ? gradeBySubject.get(e.subjectId) ?? null : null,
      difficulty: e.difficulty,
      weight: e.weight,
      contentVolume: e.contentVolume,
      maxScore: e.maxScore,
      createdById: e.createdById,
      canEdit: e.createdById === studentId,
      isCompleted,
      includedContent: included,
      officialAttachments,
      personalAttachments,
      personalResources: e.personalResources.map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        url: r.url,
      })),
      personalNotes: prep?.personalNotes ?? null,
      description: e.description,
    };
  });
}

export const PRIORITY_STYLES: Record<
  ExamPriorityLevel,
  { label: string; className: string }
> = {
  LOW: { label: 'Low', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200' },
  HIGH: { label: 'High', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
};
