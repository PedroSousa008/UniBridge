import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { ensureGradebookTables } from '@/lib/db/ensure-gradebook-schema';
import { ensureSubjectGradingColumns } from '@/lib/db/ensure-subject-grading-schema';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';

export type GradingMode = 'single' | 'continuous_final';

export const EVALUATION_COMPONENT_PRESETS = [
  'Test',
  'Oral Presentation',
  'Mini Tests',
  'Attendance',
  'Group Assignment',
  'Assignment',
  'Participation',
  'Final Exam',
  'Lab Work',
  'Project',
  'Research Work',
] as const;

export function validateCategoryWeights(weights: number[]) {
  const total = Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100;
  return {
    total,
    valid: Math.abs(total - 100) < 0.01,
    remaining: Math.round((100 - total) * 100) / 100,
  };
}

export async function getSubjectGradingPlan(subjectId: string) {
  await Promise.all([ensureGradebookTables(), ensureSubjectGradingColumns()]);
  const rows = await prisma.$queryRaw<
    { gradingMode: string | null; gradingScaleMax: number | null }[]
  >`SELECT "gradingMode", "gradingScaleMax" FROM "Subject" WHERE "id" = ${subjectId} LIMIT 1`;
  const row = rows[0];
  const mode: GradingMode =
    row?.gradingMode === 'single' ? 'single' : 'continuous_final';
  return {
    mode,
    scaleMax: row?.gradingScaleMax ?? 20,
  };
}

export async function saveSubjectGradingPlan(
  subjectId: string,
  input: { mode: GradingMode; scaleMax?: number }
) {
  await ensureSubjectGradingColumns();
  const scale = input.scaleMax ?? 20;
  await prisma.$executeRaw`
    UPDATE "Subject"
    SET "gradingMode" = ${input.mode}, "gradingScaleMax" = ${scale}
    WHERE "id" = ${subjectId}
  `;
}

export async function listGradeCategories(subjectId: string) {
  await ensureGradebookTables();
  return prisma.gradeCategory.findMany({
    where: { subjectId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function upsertGradeCategory(
  subjectId: string,
  input: {
    id?: string;
    name: string;
    weight: number;
    description?: string | null;
    minGrade?: number | null;
    sortOrder?: number;
  }
) {
  await ensureGradebookTables();
  const categories = await listGradeCategories(subjectId);
  const others = input.id ? categories.filter((c) => c.id !== input.id) : categories;
  const nextWeights = [...others.map((c) => c.weight), input.weight];
  const check = validateCategoryWeights(nextWeights);
  if (!check.valid && nextWeights.length > 0) {
    return { ok: false as const, error: `Weights must total 100% (currently ${check.total}%)`, check };
  }

  if (input.id) {
    const updated = await prisma.gradeCategory.update({
      where: { id: input.id },
      data: {
        name: input.name,
        weight: input.weight,
        description: input.description ?? null,
        minGrade: input.minGrade ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });
    return { ok: true as const, category: updated, check };
  }

  const created = await prisma.gradeCategory.create({
    data: {
      subjectId,
      name: input.name,
      weight: input.weight,
      description: input.description ?? null,
      minGrade: input.minGrade ?? null,
      sortOrder: input.sortOrder ?? categories.length,
    },
  });
  return { ok: true as const, category: created, check };
}

export async function deleteGradeCategory(subjectId: string, categoryId: string) {
  const cat = await prisma.gradeCategory.findFirst({
    where: { id: categoryId, subjectId },
  });
  if (!cat) return { ok: false as const, error: 'Category not found' };
  await prisma.gradeCategory.delete({ where: { id: categoryId } });
  return { ok: true as const };
}

export async function buildTeacherGradeTable(subjectId: string) {
  await ensureAssignmentTables();
  const [enrollments, categories, assignments] = await Promise.all([
    prisma.subjectEnrollment.findMany({
      where: { subjectId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: 'asc' } },
    }),
    listGradeCategories(subjectId),
    prisma.assignment.findMany({
      where: { subjectId },
      include: {
        gradeCategory: true,
        submissions: true,
      },
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const students = enrollments.map((e) => ({
    id: e.studentId,
    name: e.student?.name ?? 'Student',
    email: e.student?.email ?? '',
    enrollmentGrade: e.grade,
    attendance: e.attendance,
  }));

  const evaluations = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    categoryId: a.gradeCategoryId,
    categoryName: a.gradeCategory?.name ?? null,
    maxScore: a.maxScore,
    dueDate: a.dueDate.toISOString(),
    pendingPublish: a.submissions.filter(
      (s) => s.submittedAt && !s.gradePublished
    ).length,
  }));

  const cells: Record<string, Record<string, number | null>> = {};
  for (const student of students) {
    cells[student.id] = {};
    for (const a of assignments) {
      const sub = a.submissions.find((s) => s.studentId === student.id);
      cells[student.id][a.id] = sub
        ? studentVisibleScore({
            score: sub.score,
            gradePublished: sub.gradePublished,
          })
        : null;
    }
  }

  return { students, categories, evaluations, cells };
}
