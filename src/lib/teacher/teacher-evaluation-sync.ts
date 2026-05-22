import { prisma } from '@/lib/db';
import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import {
  buildGradebookStructure,
  isGradebookStructureComplete,
  parseCategoryMeta,
} from '@/lib/teacher/gradebook-structure';
import {
  getSubjectGradingPlan,
  listGradeCategories,
} from '@/lib/teacher/teacher-gradebook';

/** Creates/updates one assignment per grade component + submission rows for all students. */
export async function syncEvaluationAssignments(subjectId: string): Promise<{
  ok: boolean;
  error?: string;
  assignmentIds: string[];
}> {
  await ensureAssignmentTables();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      teacher: { include: { user: { select: { id: true, name: true } } } },
      enrollments: { select: { studentId: true } },
    },
  });
  if (!subject) return { ok: false, error: 'Subject not found', assignmentIds: [] };

  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);

  if (
    !isGradebookStructureComplete(structure, subject.gradingBlocksConfirmed ?? false)
  ) {
    return { ok: false, error: 'Complete the gradebook structure first.', assignmentIds: [] };
  }

  const components = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const assignmentIds: string[] = [];
  const dueDate = new Date(Date.now() + 90 * 86400000);

  for (const cat of components) {
    let assignment = await prisma.assignment.findFirst({
      where: { subjectId, gradeCategoryId: cat.id },
    });

    if (!assignment) {
      assignment = await prisma.assignment.create({
        data: {
          subjectId,
          gradeCategoryId: cat.id,
          createdById: subject.teacher?.user?.id ?? undefined,
          title: cat.name,
          description: `Evaluation component (${cat.weight}% of final grade)`,
          dueDate,
          maxScore: plan.scaleMax,
          weightPercent: cat.weight,
          professor: subject.teacher?.user?.name ?? null,
        },
      });
    } else {
      assignment = await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          title: cat.name,
          maxScore: plan.scaleMax,
          weightPercent: cat.weight,
        },
      });
    }

    assignmentIds.push(assignment.id);

    for (const e of subject.enrollments) {
      await prisma.assignmentSubmission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: assignment.id,
            studentId: e.studentId,
          },
        },
        create: {
          assignmentId: assignment.id,
          studentId: e.studentId,
        },
        update: {},
      });
    }
  }

  return { ok: true, assignmentIds };
}
