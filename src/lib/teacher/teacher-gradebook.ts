import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { ensureGradebookTables } from '@/lib/db/ensure-gradebook-schema';
import { ensureSubjectGradingColumns } from '@/lib/db/ensure-subject-grading-schema';
import {
  BLOCK_LABELS,
  buildGradebookStructure,
  canAddComponentsToStructure,
  isGradebookStructureComplete,
  parseCategoryMeta,
  type GradeBlockKey,
  type GradeCategoryMeta,
  validateBlockWeights,
  validateNewComponentWeight,
} from '@/lib/teacher/gradebook-structure';
import { syncEvaluationAssignments } from '@/lib/teacher/teacher-evaluation-sync';
import { isPendingGradePublish, studentVisibleScore } from '@/lib/teacher/teacher-grading';

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

export { buildGradebookStructure } from '@/lib/teacher/gradebook-structure';

export async function getSubjectGradingPlan(subjectId: string) {
  await Promise.all([ensureGradebookTables(), ensureSubjectGradingColumns()]);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { gradingMode: true, gradingScaleMax: true, gradingBlocksConfirmed: true },
  });
  const mode: GradingMode =
    subject?.gradingMode === 'single' ? 'single' : 'continuous_final';
  return {
    mode,
    scaleMax: subject?.gradingScaleMax ?? 20,
    blocksConfirmed: subject?.gradingBlocksConfirmed ?? false,
  };
}

export async function saveSubjectGradingPlan(
  subjectId: string,
  input: { mode: GradingMode; scaleMax?: number }
) {
  await ensureSubjectGradingColumns();
  const prev = await getSubjectGradingPlan(subjectId);
  await prisma.subject.update({
    where: { id: subjectId },
    data: {
      gradingMode: input.mode,
      gradingScaleMax: input.scaleMax ?? 20,
      gradingBlocksConfirmed: input.mode === 'single',
    },
  });
  if (input.mode === 'continuous_final' && prev.mode !== 'continuous_final') {
    await ensureContinuousFinalBlocks(subjectId);
  }
}

export async function confirmSubjectGradingBlocks(subjectId: string) {
  const plan = await getSubjectGradingPlan(subjectId);
  if (plan.mode !== 'continuous_final') {
    return { ok: false as const, error: 'Only required for continuous + final exam mode.' };
  }
  const categories = await listGradeCategories(subjectId);
  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);
  if (!structure.continuous.summary.valid) {
    return {
      ok: false as const,
      error: `Continuous + Final must total 100% (currently ${structure.continuous.summary.total}%).`,
    };
  }
  await prisma.subject.update({
    where: { id: subjectId },
    data: { gradingBlocksConfirmed: true },
  });
  return { ok: true as const };
}

export async function ensureContinuousFinalBlocks(subjectId: string) {
  await ensureGradebookTables();
  const categories = await listGradeCategories(subjectId);
  const blocks = categories.filter((c) => parseCategoryMeta(c.rulesJson).kind === 'block');
  const hasContinuous = blocks.some((b) => parseCategoryMeta(b.rulesJson).blockKey === 'continuous');
  const hasFinal = blocks.some((b) => parseCategoryMeta(b.rulesJson).blockKey === 'final');

  if (!hasContinuous) {
    await prisma.gradeCategory.create({
      data: {
        subjectId,
        name: BLOCK_LABELS.continuous,
        weight: 60,
        sortOrder: 0,
        rulesJson: { kind: 'block', blockKey: 'continuous' },
      },
    });
  }
  if (!hasFinal) {
    await prisma.gradeCategory.create({
      data: {
        subjectId,
        name: BLOCK_LABELS.final,
        weight: 40,
        sortOrder: 1,
        rulesJson: { kind: 'block', blockKey: 'final' },
      },
    });
  }
}

export async function listGradeCategories(subjectId: string) {
  await ensureGradebookTables();
  return prisma.gradeCategory.findMany({
    where: { subjectId },
    orderBy: { sortOrder: 'asc' },
  });
}

function metaToJson(meta: GradeCategoryMeta) {
  return meta as object;
}

export async function upsertGradeCategory(
  subjectId: string,
  input: {
    id?: string;
    name: string;
    weight: number;
    kind?: GradeCategoryMeta['kind'];
    parentId?: string | null;
    blockKey?: GradeBlockKey;
    description?: string | null;
    minGrade?: number | null;
    sortOrder?: number;
  }
) {
  await ensureGradebookTables();
  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);

  const existing = input.id
    ? categories.find((c) => c.id === input.id)
    : undefined;
  const existingMeta = existing ? parseCategoryMeta(existing.rulesJson) : null;

  const kind =
    input.kind ?? existingMeta?.kind ?? (plan.mode === 'continuous_final' && !input.parentId && input.blockKey ? 'block' : 'component');

  const meta: GradeCategoryMeta =
    kind === 'block'
      ? {
          kind: 'block',
          blockKey:
            input.blockKey ??
            existingMeta?.blockKey ??
            (input.name.toLowerCase().includes('final') ? 'final' : 'continuous'),
        }
      : {
          kind: 'component',
          parentId: input.parentId ?? existingMeta?.parentId ?? undefined,
        };

  if (kind === 'block') {
    const check = validateBlockWeights(categories, { id: input.id, weight: input.weight });
    if (!check.ok) return { ok: false as const, error: check.error };
    if (input.id) {
      await prisma.subject.update({
        where: { id: subjectId },
        data: { gradingBlocksConfirmed: false },
      });
    }
  } else {
    if (!canAddComponentsToStructure(structure, plan.blocksConfirmed)) {
      return {
        ok: false as const,
        error:
          'Confirm the main block weights (Continuous + Final = 100%) before adding components.',
      };
    }
    const check = validateNewComponentWeight(plan.mode, categories, {
      weight: input.weight,
      parentId: meta.parentId ?? null,
    });
    if (!check.ok && !input.id) return { ok: false as const, error: check.error };
    if (input.id && existing) {
      const siblings = categories
        .filter(
          (c) =>
            c.id !== input.id &&
            parseCategoryMeta(c.rulesJson).kind === 'component' &&
            parseCategoryMeta(c.rulesJson).parentId === meta.parentId
        )
        .map((c) => c.weight);
      const target =
        plan.mode === 'single'
          ? 100
          : categories.find((c) => c.id === meta.parentId)?.weight ?? 100;
      const total = [...siblings, input.weight].reduce((a, b) => a + b, 0);
      if (total > target + 0.01) {
        return {
          ok: false as const,
          error: `Cannot exceed ${target}% for this group (would be ${Math.round(total * 100) / 100}%).`,
        };
      }
    }
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
        rulesJson: metaToJson(meta),
      },
    });
    return { ok: true as const, category: updated };
  }

  const created = await prisma.gradeCategory.create({
    data: {
      subjectId,
      name: input.name,
      weight: input.weight,
      description: input.description ?? null,
      minGrade: input.minGrade ?? null,
      sortOrder: input.sortOrder ?? categories.length,
      rulesJson: metaToJson(meta),
    },
  });
  return { ok: true as const, category: created };
}

export async function deleteGradeCategory(subjectId: string, categoryId: string) {
  const cat = await prisma.gradeCategory.findFirst({
    where: { id: categoryId, subjectId },
  });
  if (!cat) return { ok: false as const, error: 'Category not found' };

  const meta = parseCategoryMeta(cat.rulesJson);
  if (meta.kind === 'block') {
    const children = await prisma.gradeCategory.findMany({ where: { subjectId } });
    const childIds = children
      .filter((c) => parseCategoryMeta(c.rulesJson).parentId === categoryId)
      .map((c) => c.id);
    if (childIds.length > 0) {
      await prisma.gradeCategory.deleteMany({ where: { id: { in: childIds } } });
    }
  }

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
    pendingPublish: a.submissions.filter((s) => isPendingGradePublish(s)).length,
  }));

  const cells: Record<string, Record<string, number | null>> = {};
  for (const student of students) {
    cells[student.id] = {};
    for (const a of assignments) {
      const sub = a.submissions.find((s) => s.studentId === student.id);
      cells[student.id][a.id] = sub ? studentVisibleScore(sub) : null;
    }
  }

  return { students, categories, evaluations, cells };
}

export async function getGradebookPayload(subjectId: string) {
  let plan = await getSubjectGradingPlan(subjectId);
  let categories = await listGradeCategories(subjectId);

  if (plan.mode === 'continuous_final') {
    const blocks = categories.filter((c) => parseCategoryMeta(c.rulesJson).kind === 'block');
    if (blocks.length === 0) {
      await ensureContinuousFinalBlocks(subjectId);
      categories = await listGradeCategories(subjectId);
      plan = await getSubjectGradingPlan(subjectId);
    }
  }

  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);
  const complete = isGradebookStructureComplete(structure, plan.blocksConfirmed);
  let operational = false;

  if (complete) {
    const sync = await syncEvaluationAssignments(subjectId);
    operational = sync.ok;
  }

  const table = await buildTeacherGradeTable(subjectId);

  return {
    plan,
    categories,
    structure,
    complete,
    operational,
    canAddComponents: canAddComponentsToStructure(structure, plan.blocksConfirmed),
    table,
  };
}
