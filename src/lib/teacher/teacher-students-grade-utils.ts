import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import type { FinalGradeComputation } from '@/lib/academics/final-exam-replacement-rule';
import { computeEnrollmentFinalGrade } from '@/lib/teacher/final-grade-calculator';
import { parseCategoryMeta } from '@/lib/teacher/gradebook-structure';
import { getSubjectGradingPlan, listGradeCategories } from '@/lib/teacher/teacher-gradebook';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';

export type StudentComponentGrade = {
  categoryId: string;
  name: string;
  weight: number;
  score: number | null;
  display: string;
};

/** Current weighted grade using only published component scores. */
export async function loadStudentPublishedGrades(
  subjectId: string,
  studentId: string
): Promise<{
  components: StudentComponentGrade[];
  overallGrade: number | null;
  scaleMax: number;
  gradeComputation: FinalGradeComputation;
}> {
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

  const rows: StudentComponentGrade[] = [];

  for (const cat of components) {
    const assignment = assignments.find((a) => a.gradeCategoryId === cat.id);
    const sub = assignment?.submissions.find((s) => s.studentId === studentId);
    const score = sub ? studentVisibleScore(sub) : null;
    rows.push({
      categoryId: cat.id,
      name: cat.name,
      weight: cat.weight,
      score,
      display: score != null ? String(score) : '—',
    });
  }

  const computed = await computeEnrollmentFinalGrade(subjectId, studentId);

  return {
    components: rows,
    overallGrade: computed.finalGrade,
    scaleMax: plan.scaleMax,
    gradeComputation: computed,
  };
}

/** Batch current published-weighted grades for every enrolled student in a subject. */
export async function loadSubjectCurrentGradesMap(
  subjectId: string
): Promise<Map<string, { components: StudentComponentGrade[]; overallGrade: number | null }>> {
  await ensureAssignmentTables();
  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const components = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const [enrollments, assignments] = await Promise.all([
    prisma.subjectEnrollment.findMany({
      where: { subjectId },
      select: { studentId: true },
    }),
    prisma.assignment.findMany({
      where: {
        subjectId,
        gradeCategoryId: { in: components.map((c) => c.id) },
      },
      include: { submissions: true },
    }),
  ]);

  const map = new Map<
    string,
    {
      components: StudentComponentGrade[];
      overallGrade: number | null;
      gradeComputation: FinalGradeComputation;
    }
  >();

  for (const enrollment of enrollments) {
    const studentId = enrollment.studentId;
    const rows: StudentComponentGrade[] = [];

    for (const cat of components) {
      const assignment = assignments.find((a) => a.gradeCategoryId === cat.id);
      const sub = assignment?.submissions.find((s) => s.studentId === studentId);
      const score = sub ? studentVisibleScore(sub) : null;
      rows.push({
        categoryId: cat.id,
        name: cat.name,
        weight: cat.weight,
        score,
        display: score != null ? String(score) : '—',
      });
    }

    const gradeComputation = await computeEnrollmentFinalGrade(subjectId, studentId);

    map.set(studentId, {
      components: rows,
      overallGrade: gradeComputation.finalGrade,
      gradeComputation,
    });
  }

  return map;
}
