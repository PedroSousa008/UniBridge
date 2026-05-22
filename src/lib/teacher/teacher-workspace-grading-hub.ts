import { prisma } from '@/lib/db';
import {
  allComponentsFullyPublished,
  computeWeightedFinal,
  getComponentGradeStatuses,
} from '@/lib/teacher/final-grade-calculator';
import {
  buildGradebookStructure,
  isGradebookStructureComplete,
  parseCategoryMeta,
} from '@/lib/teacher/gradebook-structure';
import { getSubjectGradingPlan, listGradeCategories } from '@/lib/teacher/teacher-gradebook';
import { syncEvaluationAssignments } from '@/lib/teacher/teacher-evaluation-sync';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';

export interface WorkspaceGradingComponent {
  assignmentId: string;
  categoryId: string;
  name: string;
  weight: number;
  maxScore: number;
  totalStudents: number;
  publishedCount: number;
  complete: boolean;
}

export interface WorkspaceFinalGradeRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRef: string;
  finalGrade: number | null;
}

export interface TeacherWorkspaceGradingHub {
  subjectId: string;
  subjectName: string;
  scaleMax: number;
  structureComplete: boolean;
  operational: boolean;
  components: WorkspaceGradingComponent[];
  allComponentsComplete: boolean;
  finalGrades: WorkspaceFinalGradeRow[];
  showFinalGradeCard: boolean;
}

export async function loadTeacherWorkspaceGradingHub(
  subjectId: string,
  teacherUserId: string
): Promise<TeacherWorkspaceGradingHub | null> {
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUserId },
  });
  if (!teacher) return null;

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId ?? undefined }],
    },
    select: { id: true, name: true, gradingBlocksConfirmed: true },
  });
  if (!subject) return null;

  const plan = await getSubjectGradingPlan(subjectId);
  const categories = await listGradeCategories(subjectId);
  const structure = buildGradebookStructure(categories, plan.mode, plan.scaleMax);
  const structureComplete = isGradebookStructureComplete(
    structure,
    subject.gradingBlocksConfirmed ?? plan.blocksConfirmed
  );

  let operational = false;
  if (structureComplete) {
    const sync = await syncEvaluationAssignments(subjectId);
    operational = sync.ok;
  }

  const statuses = await getComponentGradeStatuses(subjectId);
  const components: WorkspaceGradingComponent[] = statuses
    .filter((s) => s.assignmentId)
    .map((s) => ({
      assignmentId: s.assignmentId,
      categoryId: s.categoryId,
      name: s.categoryName,
      weight: s.weight,
      maxScore: plan.scaleMax,
      totalStudents: s.totalStudents,
      publishedCount: s.publishedCount,
      complete: s.complete,
    }));

  const allComponentsComplete = await allComponentsFullyPublished(subjectId);

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { subjectId },
    include: {
      student: { select: { id: true, name: true, email: true } },
    },
    orderBy: { student: { name: 'asc' } },
  });

  const assignments = await prisma.assignment.findMany({
    where: { subjectId, gradeCategoryId: { not: null } },
    include: { submissions: true },
  });

  const componentCats = categories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const finalGrades: WorkspaceFinalGradeRow[] = enrollments.map((e) => {
    const parts = componentCats.map((cat) => {
      const a = assignments.find((x) => x.gradeCategoryId === cat.id);
      const sub = a?.submissions.find((s) => s.studentId === e.studentId);
      return {
        weight: cat.weight,
        score: sub ? studentVisibleScore(sub) : null,
        maxScore: a?.maxScore ?? plan.scaleMax,
      };
    });
    const computed = computeWeightedFinal(parts, plan.scaleMax);
    return {
      studentId: e.studentId,
      studentName: e.student?.name ?? 'Student',
      studentEmail: e.student?.email ?? '',
      studentRef: e.student?.email?.split('@')[0] ?? e.studentId.slice(-8),
      finalGrade: allComponentsComplete ? (e.grade ?? computed) : null,
    };
  });

  return {
    subjectId,
    subjectName: subject.name,
    scaleMax: plan.scaleMax,
    structureComplete,
    operational,
    components,
    allComponentsComplete,
    finalGrades,
    showFinalGradeCard: allComponentsComplete && operational,
  };
}
