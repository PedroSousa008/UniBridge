import { NextResponse } from 'next/server';
import {
  buildTeacherGradeTable,
  deleteGradeCategory,
  getSubjectGradingPlan,
  listGradeCategories,
  saveSubjectGradingPlan,
  upsertGradeCategory,
  validateCategoryWeights,
  type GradingMode,
} from '@/lib/teacher/teacher-gradebook';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const [plan, categories, table] = await Promise.all([
    getSubjectGradingPlan(subjectId),
    listGradeCategories(subjectId),
    buildTeacherGradeTable(subjectId),
  ]);

  const weights = validateCategoryWeights(categories.map((c) => c.weight));

  return NextResponse.json({ plan, categories, weights, table });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const body = await request.json();

  if (body.plan) {
    const mode = body.plan.mode as GradingMode;
    if (mode !== 'single' && mode !== 'continuous_final') {
      return NextResponse.json({ error: 'Invalid grading mode' }, { status: 400 });
    }
    await saveSubjectGradingPlan(subjectId, {
      mode,
      scaleMax: body.plan.scaleMax ? Number(body.plan.scaleMax) : undefined,
    });
  }

  if (body.category) {
    const result = await upsertGradeCategory(subjectId, {
      id: body.category.id,
      name: String(body.category.name || '').trim(),
      weight: Number(body.category.weight),
      description: body.category.description ?? null,
      minGrade: body.category.minGrade != null ? Number(body.category.minGrade) : null,
      sortOrder: body.category.sortOrder,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error, weights: result.check }, { status: 400 });
    }
    return NextResponse.json({ category: result.category, weights: result.check });
  }

  if (body.deleteCategoryId) {
    const del = await deleteGradeCategory(subjectId, String(body.deleteCategoryId));
    if (!del.ok) return NextResponse.json({ error: del.error }, { status: 404 });
  }

  const [plan, categories, table] = await Promise.all([
    getSubjectGradingPlan(subjectId),
    listGradeCategories(subjectId),
    buildTeacherGradeTable(subjectId),
  ]);
  const weights = validateCategoryWeights(categories.map((c) => c.weight));

  return NextResponse.json({ plan, categories, weights, table });
}
