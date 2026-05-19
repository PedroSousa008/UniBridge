import type { SubjectWorkspace } from './subject-context';

export interface GradeRow {
  id: string;
  title: string;
  categoryName: string | null;
  weight: number;
  score: number | null;
  maxScore: number;
  dueDate: string;
  submitted: boolean;
  feedback: string | null;
}

export function buildGradeRows(workspace: SubjectWorkspace): GradeRow[] {
  const defaultWeight =
    workspace.gradeCategories.length > 0
      ? 0
      : 100 / Math.max(workspace.assignments.length, 1);

  return workspace.assignments.map((a) => {
    const sub = a.submissions[0];
    const cat = a.gradeCategory;
    return {
      id: a.id,
      title: a.title,
      categoryName: cat?.name ?? 'Assignments',
      weight: cat?.weight ?? defaultWeight,
      score: sub?.score ?? null,
      maxScore: a.maxScore,
      dueDate: a.dueDate.toISOString(),
      submitted: !!sub?.submittedAt,
      feedback: sub?.content ?? null,
    };
  });
}

export function computeWeightedAverage(rows: GradeRow[], categories: { name: string; weight: number }[]) {
  if (categories.length > 0) {
    let total = 0;
    let weightSum = 0;
    for (const cat of categories) {
      const inCat = rows.filter((r) => r.categoryName === cat.name && r.score != null);
      if (inCat.length === 0) continue;
      const avg =
        inCat.reduce((s, r) => s + ((r.score ?? 0) / r.maxScore) * 20, 0) / inCat.length;
      total += avg * (cat.weight / 100);
      weightSum += cat.weight;
    }
    if (weightSum === 0) return null;
    return Math.round((total / (weightSum / 100)) * 10) / 10;
  }

  const graded = rows.filter((r) => r.score != null);
  if (graded.length === 0) return null;
  const avg =
    graded.reduce((s, r) => s + ((r.score ?? 0) / r.maxScore) * 20, 0) / graded.length;
  return Math.round(avg * 10) / 10;
}

export function projectFinalGrade(
  currentAverage: number | null,
  rows: GradeRow[],
  hypothetical: { assignmentId: string; score: number; maxScore: number }
) {
  const mapped = rows.map((r) =>
    r.id === hypothetical.assignmentId
      ? { ...r, score: hypothetical.score, maxScore: hypothetical.maxScore }
      : r
  );
  const categories = Array.from(
    new Map(
      rows
        .filter((r) => r.categoryName)
        .map((r) => [r.categoryName!, { name: r.categoryName!, weight: r.weight }])
    ).values()
  );
  return computeWeightedAverage(mapped, categories) ?? currentAverage;
}

export function attendanceSummary(
  sessions: SubjectWorkspace['attendanceSessions'],
  enrollmentAttendance: number | null
) {
  const records = sessions.flatMap((s) => s.records);
  const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const excused = records.filter((r) => r.status === 'EXCUSED').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const total = records.length;
  const pct =
    total > 0 ? Math.round((present / total) * 100) : enrollmentAttendance ?? null;

  return { present, excused, absent, total, pct };
}
