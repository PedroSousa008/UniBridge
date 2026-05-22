import { NextResponse } from 'next/server';
import {
  deleteGradeCategory,
  getGradebookPayload,
  saveSubjectGradingPlan,
  upsertGradeCategory,
  type GradingMode,
} from '@/lib/teacher/teacher-gradebook';
import type { GradeBlockKey } from '@/lib/teacher/gradebook-structure';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  const payload = await getGradebookPayload(subjectId);
  return NextResponse.json(payload);
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
      kind: body.category.kind,
      parentId: body.category.parentId ?? null,
      blockKey: body.category.blockKey as GradeBlockKey | undefined,
      description: body.category.description ?? null,
      minGrade: body.category.minGrade != null ? Number(body.category.minGrade) : null,
      sortOrder: body.category.sortOrder,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  }

  if (body.deleteCategoryId) {
    const del = await deleteGradeCategory(subjectId, String(body.deleteCategoryId));
    if (!del.ok) return NextResponse.json({ error: del.error }, { status: 404 });
  }

  const payload = await getGradebookPayload(subjectId);
  return NextResponse.json(payload);
}
