import { prisma } from '@/lib/db';
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

export function computeWeightedFinal(
  components: { weight: number; score: number | null; maxScore: number }[],
  scaleMax: number
): number | null {
  const graded = components.filter((c) => c.score != null);
  if (graded.length === 0) return null;

  let sum = 0;
  for (const c of graded) {
    const normalized = (c.score! / c.maxScore) * scaleMax;
    sum += normalized * (c.weight / 100);
  }
  return Math.round(sum * 100) / 100;
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
  const components = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const assignments = await prisma.assignment.findMany({
    where: {
      subjectId,
      gradeCategoryId: { in: components.map((c) => c.id) },
    },
    include: { submissions: true, gradeCategory: true },
  });

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    select: { id: true, studentId: true },
  });

  for (const enrollment of enrollments) {
    const parts: { weight: number; score: number | null; maxScore: number }[] = [];

    for (const cat of components) {
      const assignment = assignments.find((a) => a.gradeCategoryId === cat.id);
      if (!assignment) continue;
      const sub = assignment.submissions.find((s) => s.studentId === enrollment.studentId);
      parts.push({
        weight: cat.weight,
        score: sub ? studentVisibleScore(sub) : null,
        maxScore: assignment.maxScore,
      });
    }

    const allPublished = components.every((cat) => {
      const assignment = assignments.find((a) => a.gradeCategoryId === cat.id);
      if (!assignment) return false;
      const sub = assignment.submissions.find((s) => s.studentId === enrollment.studentId);
      return sub != null && studentVisibleScore(sub) != null;
    });

    const finalGrade = allPublished ? computeWeightedFinal(parts, plan.scaleMax) : null;
    await prisma.subjectEnrollment.update({
      where: { id: enrollment.id },
      data: { grade: finalGrade },
    });
  }

  void structure;
}

export async function allComponentsFullyPublished(subjectId: string): Promise<boolean> {
  const statuses = await getComponentGradeStatuses(subjectId);
  if (statuses.length === 0) return false;
  return statuses.every((s) => s.complete);
}
