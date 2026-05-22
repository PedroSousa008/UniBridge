import { prisma } from '@/lib/db';
import { ensureExamTables } from '@/lib/db/ensure-exam-schema';
import { isExamStyleComponent, parseCategoryMeta } from '@/lib/teacher/gradebook-structure';
import {
  removeExamFromCalendars,
  syncExamToCalendars,
} from '@/lib/student/exam-sync';

export function buildExamTimesFromForm(input: {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}): { examAt: Date | null; examEndAt: Date | null } {
  if (!input.date) return { examAt: null, examEndAt: null };
  const base = new Date(input.date);
  const [sh, sm] = (input.startTime || '09:00').split(':').map((x) => parseInt(x, 10));
  const [eh, em] = (input.endTime || '11:00').split(':').map((x) => parseInt(x, 10));
  const examAt = new Date(base);
  examAt.setHours(Number.isNaN(sh) ? 9 : sh, Number.isNaN(sm) ? 0 : sm, 0, 0);
  const examEndAt = new Date(base);
  examEndAt.setHours(Number.isNaN(eh) ? 11 : eh, Number.isNaN(em) ? 0 : em, 0, 0);
  if (examEndAt <= examAt) examEndAt.setTime(examAt.getTime() + 2 * 3600000);
  return { examAt, examEndAt };
}

export async function syncGradeComponentExam(
  subjectId: string,
  categoryId: string,
  input: {
    name: string;
    examAt?: Date | null;
    examEndAt?: Date | null;
    room?: string | null;
  }
): Promise<void> {
  if (!isExamStyleComponent(input.name)) return;
  if (!(await ensureExamTables())) return;

  const category = await prisma.gradeCategory.findFirst({
    where: { id: categoryId, subjectId },
  });
  if (!category) return;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { teacher: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!subject?.teacher?.user?.id) return;

  const meta = parseCategoryMeta(category.rulesJson);
  const examAt = input.examAt ?? null;
  const examEndAt = input.examEndAt ?? null;
  const room = input.room?.trim() || null;

  if (!examAt) {
    if (meta.examId) {
      await removeExamFromCalendars(meta.examId);
      await prisma.exam.delete({ where: { id: meta.examId } }).catch(() => {});
      await prisma.gradeCategory.update({
        where: { id: categoryId },
        data: {
          rulesJson: {
            ...meta,
            examId: undefined,
            examAt: undefined,
            examEndAt: undefined,
            room: undefined,
          },
        },
      });
    }
    return;
  }

  let examId = meta.examId;
  if (examId) {
    await prisma.exam.update({
      where: { id: examId },
      data: {
        title: input.name,
        date: examAt,
        endAt: examEndAt,
        room,
        professor: subject.teacher.user.name,
      },
    });
  } else {
    const exam = await prisma.exam.create({
      data: {
        subjectId,
        createdById: subject.teacher.user.id,
        title: input.name,
        date: examAt,
        endAt: examEndAt,
        room,
        professor: subject.teacher.user.name,
        maxScore: subject.gradingScaleMax ?? 20,
      },
    });
    examId = exam.id;
  }

  await prisma.gradeCategory.update({
    where: { id: categoryId },
    data: {
      rulesJson: {
        ...meta,
        examId,
        examAt: examAt.toISOString(),
        examEndAt: examEndAt?.toISOString(),
        room: room ?? undefined,
      },
    },
  });

  await syncExamToCalendars(examId);
}

export async function removeGradeComponentExam(categoryId: string): Promise<void> {
  const category = await prisma.gradeCategory.findUnique({ where: { id: categoryId } });
  if (!category) return;
  const meta = parseCategoryMeta(category.rulesJson);
  if (!meta.examId) return;
  await removeExamFromCalendars(meta.examId);
  await prisma.exam.delete({ where: { id: meta.examId } }).catch(() => {});
}
