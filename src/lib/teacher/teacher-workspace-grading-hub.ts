import { prisma } from '@/lib/db';
import {
  allComponentsFullyPublished,
  computeEnrollmentFinalGrade,
  getComponentGradeStatuses,
} from '@/lib/teacher/final-grade-calculator';
import {
  buildGradebookStructure,
  isGradebookStructureComplete,
} from '@/lib/teacher/gradebook-structure';
import { getSubjectGradingPlan, listGradeCategories } from '@/lib/teacher/teacher-gradebook';
import { syncEvaluationAssignments } from '@/lib/teacher/teacher-evaluation-sync';

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
  statusLabel: string;
  passed: boolean | null;
  reason: string | null;
}

export interface TeacherWorkspaceGradingHub {
  subjectId: string;
  subjectName: string;
  scaleMax: number;
  finalExamReplacementRule: boolean;
  gradingMode: 'single' | 'continuous_final';
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

  const finalGrades: WorkspaceFinalGradeRow[] = await Promise.all(
    enrollments.map(async (e) => {
      const computed = await computeEnrollmentFinalGrade(subjectId, e.studentId);
      const finalGrade = allComponentsComplete ? computed.finalGrade : null;

      if (
        allComponentsComplete &&
        computed.finalGrade != null &&
        e.grade !== computed.finalGrade
      ) {
        await prisma.subjectEnrollment.update({
          where: { id: e.id },
          data: { grade: computed.finalGrade },
        });
      }

      return {
        studentId: e.studentId,
        studentName: e.student?.name ?? 'Student',
        studentEmail: e.student?.email ?? '',
        studentRef: e.student?.email?.split('@')[0] ?? e.studentId.slice(-8),
        finalGrade,
        statusLabel: allComponentsComplete ? computed.statusLabel : 'Pending',
        passed: allComponentsComplete ? computed.passed : null,
        reason: computed.reason,
      };
    })
  );

  return {
    subjectId,
    subjectName: subject.name,
    scaleMax: plan.scaleMax,
    finalExamReplacementRule: plan.finalExamReplacementRule,
    gradingMode: plan.mode,
    structureComplete,
    operational,
    components,
    allComponentsComplete,
    finalGrades,
    showFinalGradeCard: allComponentsComplete && operational,
  };
}
