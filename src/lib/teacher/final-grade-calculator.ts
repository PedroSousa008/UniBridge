import { prisma } from '@/lib/db';
import {
  computeSubjectFinalGrade,
  computeWeightedFinal,
  type FinalGradeComputation,
  type GradePartInput,
} from '@/lib/academics/final-exam-replacement-rule';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { buildGradebookStructure, parseCategoryMeta } from '@/lib/teacher/gradebook-structure';
import { getSubjectGradingPlan, listGradeCategories } from '@/lib/teacher/teacher-gradebook';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';

export type ComponentGradeStatus = {
  categoryId: string;
  categoryName: string;
  weight: number;
  assignmentId: string;
  totalStudents: number;
  publishedCount: number;
  complete: boolean;
};

export { computeSubjectFinalGrade, computeWeightedFinal, type FinalGradeComputation };

export async function computeEnrollmentFinalGrade(
  subjectId: string,
  studentId: string
): Promise<FinalGradeComputation> {
  await ensureAssignmentTables();
  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const components = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const assignments = await prisma.assignment.findMany({
    where: {
      subjectId,
      gradeCategoryId: { in: components.map((c) => c.id) },
    },
    include: { submissions: true },
  });

  const parts: GradePartInput[] = [];
  let allPublished = components.length > 0;

  for (const cat of components) {
    const assignment = assignments.find((a) => a.gradeCategoryId === cat.id);
    if (!assignment) {
      allPublished = false;
      continue;
    }
    const sub = assignment.submissions.find((s) => s.studentId === studentId);
    const score = sub ? studentVisibleScore(sub) : null;
    if (score == null) allPublished = false;
    parts.push({
      categoryId: cat.id,
      weight: cat.weight,
      score,
      maxScore: assignment.maxScore,
    });
  }

  return computeSubjectFinalGrade({
    mode: plan.mode,
    scaleMax: plan.scaleMax,
    replacementRuleEnabled: plan.finalExamReplacementRule,
    categories,
    parts,
    allPublished,
  });
}

export async function getComponentGradeStatuses(
  subjectId: string
): Promise<ComponentGradeStatus[]> {
  await ensureAssignmentTables();
  const categories = await listGradeCategories(subjectId);
  const components = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    select: { studentId: true },
  });
  const totalStudents = enrollments.length;

  const statuses: ComponentGradeStatus[] = [];

  for (const cat of components) {
    const assignment = await prisma.assignment.findFirst({
      where: { subjectId, gradeCategoryId: cat.id },
      include: { submissions: true },
    });
    if (!assignment) {
      statuses.push({
        categoryId: cat.id,
        categoryName: cat.name,
        weight: cat.weight,
        assignmentId: '',
        totalStudents,
        publishedCount: 0,
        complete: false,
      });
      continue;
    }
    const publishedCount = assignment.submissions.filter((s) =>
      studentVisibleScore(s)
    ).length;
    statuses.push({
      categoryId: cat.id,
      categoryName: cat.name,
      weight: cat.weight,
      assignmentId: assignment.id,
      totalStudents,
      publishedCount,
      complete: totalStudents > 0 && publishedCount >= totalStudents,
    });
  }

  return statuses;
}

export async function recalculateSubjectFinalGrades(subjectId: string): Promise<void> {
  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);
  void structure;

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    select: { id: true, studentId: true },
  });

  for (const enrollment of enrollments) {
    const result = await computeEnrollmentFinalGrade(subjectId, enrollment.studentId);
    await prisma.subjectEnrollment.update({
      where: { id: enrollment.id },
      data: { grade: result.finalGrade },
    });
  }
}

export async function allComponentsFullyPublished(subjectId: string): Promise<boolean> {
  const statuses = await getComponentGradeStatuses(subjectId);
  if (statuses.length === 0) return false;
  return statuses.every((s) => s.complete);
}
