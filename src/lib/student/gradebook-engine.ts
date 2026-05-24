import { computeFinalGradeFromWorkspace } from '@/lib/academics/final-exam-replacement-rule';
import type { SubjectWorkspace } from './subject-context';
import { studentVisibleScore } from '@/lib/teacher/teacher-grading';

function toIsoString(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}

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

export type GradeRowsInput = Pick<SubjectWorkspace, 'assignments' | 'gradeCategories'>;

export function buildGradeRows(workspace: GradeRowsInput): GradeRow[] {
  const defaultWeight =
    workspace.gradeCategories.length > 0
      ? 0
      : 100 / Math.max(workspace.assignments.length, 1);

  return workspace.assignments.map((a) => {
    const sub = a.submissions[0];
    const cat = a.gradeCategory;
    const subRow = sub as typeof sub & { gradePublished?: boolean };
    return {
      id: a.id,
      title: a.title,
      categoryName: cat?.name ?? 'Assignments',
      weight: cat?.weight ?? defaultWeight,
      score: sub ? studentVisibleScore(subRow) : null,
      maxScore: a.maxScore,
      dueDate: toIsoString(a.dueDate),
      submitted: !!sub?.submittedAt,
      feedback: sub?.content ?? null,
    };
  });
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

export type GradeStatus = 'good' | 'moderate' | 'danger' | 'unknown';

export interface GradeThresholds {
  goodMin: number;
  moderateMin: number;
  passMin: number;
}

export const DEFAULT_THRESHOLDS: GradeThresholds = {
  goodMin: 14,
  moderateMin: 10,
  passMin: 10,
};

export interface EvaluationRule {
  type?: 'weighted' | 'best_of_n' | 'mandatory_min' | 'exclude_lowest';
  bestOf?: number;
  countFrom?: number;
  minGrade?: number;
  minFinal?: number;
  note?: string;
}

export interface CategoryBreakdown {
  id: string;
  name: string;
  weight: number;
  average: number | null;
  completed: number;
  total: number;
  remainingWeight: number;
  rules: EvaluationRule | null;
  minGrade: number | null;
}

export interface EvaluationTimelineItem {
  id: string;
  title: string;
  categoryName: string | null;
  dueDate: string;
  status: 'completed' | 'upcoming' | 'missing' | 'pending_grade';
  score: number | null;
  maxScore: number;
  gradeOnTwenty: number | null;
}

export interface GradeRisk {
  id: string;
  severity: 'high' | 'medium' | 'low';
  subjectId: string;
  subjectName: string;
  message: string;
}

export interface GradeNotification {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  message: string;
  createdAt: string;
  href: string;
}

export interface SubjectGradebookSnapshot {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  professor: string | null;
  credits: number;
  currentGrade: number | null;
  status: GradeStatus;
  progressPercent: number;
  attendancePercent: number | null;
  categories: CategoryBreakdown[];
  rows: GradeRow[];
  evaluationMethod: string;
  remainingEvaluations: number;
  completedEvaluations: number;
  timeline: EvaluationTimelineItem[];
  missingWeight: number;
  projectedBest: number | null;
  projectedRealistic: number | null;
  projectedWorst: number | null;
  evolution: { date: string; grade: number; label: string }[];
  finalGradeReason?: string | null;
  finalGradePassed?: boolean | null;
  usesReplacementRule?: boolean;
}

export interface GradebookDashboard {
  overallGpa: number | null;
  semesterAverage: number | null;
  bestSubject: { name: string; grade: number } | null;
  worstSubject: { name: string; grade: number } | null;
  attendanceAverage: number | null;
  creditsCompleted: number;
  creditsRemaining: number;
  subjects: SubjectGradebookSnapshot[];
  risks: GradeRisk[];
  notifications: GradeNotification[];
  semesterEvolution: { label: string; average: number }[];
}

export function scoreOnTwenty(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 20 * 10) / 10;
}

export function gradeStatus(grade: number | null, thresholds: GradeThresholds): GradeStatus {
  if (grade == null) return 'unknown';
  if (grade >= thresholds.goodMin) return 'good';
  if (grade >= thresholds.moderateMin) return 'moderate';
  return 'danger';
}

export function statusColor(status: GradeStatus): string {
  switch (status) {
    case 'good':
      return 'border-emerald-500/40 bg-emerald-500/5';
    case 'moderate':
      return 'border-amber-500/40 bg-amber-500/5';
    case 'danger':
      return 'border-red-500/40 bg-red-500/5';
    default:
      return 'border-border';
  }
}

export function statusBadgeClass(status: GradeStatus): string {
  switch (status) {
    case 'good':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'moderate':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200';
    case 'danger':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function parseEvaluationRules(raw: unknown): EvaluationRule | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as EvaluationRule;
}

function categoryAverageForRows(
  rows: GradeRow[],
  rules: EvaluationRule | null,
  minGrade: number | null
): number | null {
  const graded = rows
    .filter((r) => r.score != null)
    .map((r) => scoreOnTwenty(r.score!, r.maxScore));

  if (graded.length === 0) return null;

  let values = [...graded];

  if (rules?.type === 'best_of_n' && rules.bestOf && rules.countFrom) {
    const sorted = [...values].sort((a, b) => b - a);
    values = sorted.slice(0, Math.min(rules.bestOf, sorted.length));
  }

  if (rules?.type === 'exclude_lowest' && values.length > 1) {
    const sorted = [...values].sort((a, b) => a - b);
    values = sorted.slice(1);
  }

  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  if (minGrade != null && avg < minGrade) return null;
  if (rules?.minGrade != null && avg < rules.minGrade) return null;

  return Math.round(avg * 10) / 10;
}

export function computeWeightedAverageAdvanced(
  rows: GradeRow[],
  categories: {
    id: string;
    name: string;
    weight: number;
    rulesJson?: unknown;
    minGrade?: number | null;
  }[]
): { average: number | null; breakdown: CategoryBreakdown[]; missingWeight: number } {
  const breakdown: CategoryBreakdown[] = [];
  let total = 0;
  let weightSum = 0;
  let missingWeight = 0;

  if (categories.length > 0) {
    for (const cat of categories) {
      const inCat = rows.filter((r) => r.categoryName === cat.name);
      const rules = parseEvaluationRules(cat.rulesJson);
      const avg = categoryAverageForRows(inCat, rules, cat.minGrade ?? null);
      const completed = inCat.filter((r) => r.score != null).length;
      const remaining = cat.weight * (completed === 0 ? 1 : (inCat.length - completed) / Math.max(inCat.length, 1));

      if (avg != null) {
        total += avg * (cat.weight / 100);
        weightSum += cat.weight;
      } else if (inCat.length > 0) {
        missingWeight += cat.weight;
      }

      breakdown.push({
        id: cat.id,
        name: cat.name,
        weight: cat.weight,
        average: avg,
        completed,
        total: inCat.length,
        remainingWeight: Math.round(remaining * 10) / 10,
        rules,
        minGrade: cat.minGrade ?? rules?.minGrade ?? null,
      });
    }
    const avg =
      weightSum > 0 ? Math.round((total / (weightSum / 100)) * 10) / 10 : null;
    return { average: avg, breakdown, missingWeight: Math.round(missingWeight * 10) / 10 };
  }

  const graded = rows.filter((r) => r.score != null);
  if (graded.length === 0) {
    return { average: null, breakdown: [], missingWeight: 100 };
  }
  const avg =
    Math.round(
      (graded.reduce((s, r) => s + scoreOnTwenty(r.score!, r.maxScore), 0) / graded.length) * 10
    ) / 10;
  return { average: avg, breakdown: [], missingWeight: 0 };
}

export function buildEvaluationTimeline(rows: GradeRow[]): EvaluationTimelineItem[] {
  const now = Date.now();
  return [...rows]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((r) => {
      const due = new Date(r.dueDate).getTime();
      let status: EvaluationTimelineItem['status'] = 'upcoming';
      if (r.score != null) status = 'completed';
      else if (!r.submitted && due < now) status = 'missing';
      else if (r.submitted && r.score == null) status = 'pending_grade';
      return {
        id: r.id,
        title: r.title,
        categoryName: r.categoryName,
        dueDate: r.dueDate,
        status,
        score: r.score,
        maxScore: r.maxScore,
        gradeOnTwenty: r.score != null ? scoreOnTwenty(r.score, r.maxScore) : null,
      };
    });
}

export function buildGradeEvolution(rows: GradeRow[]): { date: string; grade: number; label: string }[] {
  const points: { date: string; grade: number; label: string }[] = [];
  const sorted = [...rows]
    .filter((r) => r.score != null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  let running: number[] = [];
  for (const r of sorted) {
    running.push(scoreOnTwenty(r.score!, r.maxScore));
    const avg = running.reduce((s, v) => s + v, 0) / running.length;
    points.push({
      date: r.dueDate,
      grade: Math.round(avg * 10) / 10,
      label: r.title,
    });
  }
  return points;
}

export function projectScenarios(
  rows: GradeRow[],
  categories: { id: string; name: string; weight: number; rulesJson?: unknown; minGrade?: number | null }[]
) {
  const pending = rows.filter((r) => r.score == null);
  if (pending.length === 0) {
    const { average } = computeWeightedAverageAdvanced(rows, categories);
    return { best: average, realistic: average, worst: average };
  }

  const maxed = rows.map((r) =>
    r.score == null ? { ...r, score: r.maxScore } : r
  );
  const minned = rows.map((r) =>
    r.score == null ? { ...r, score: 0 } : r
  );
  const realistic = rows.map((r) =>
    r.score == null ? { ...r, score: r.maxScore * 0.7 } : r
  );

  return {
    best: computeWeightedAverageAdvanced(maxed, categories).average,
    realistic: computeWeightedAverageAdvanced(realistic, categories).average,
    worst: computeWeightedAverageAdvanced(minned, categories).average,
  };
}

export function simulateWhatIf(
  rows: GradeRow[],
  categories: { id: string; name: string; weight: number; rulesJson?: unknown; minGrade?: number | null }[],
  changes: { assignmentId: string; score: number; maxScore: number }[]
): number | null {
  let mapped = [...rows];
  for (const c of changes) {
    mapped = mapped.map((r) =>
      r.id === c.assignmentId ? { ...r, score: c.score, maxScore: c.maxScore } : r
    );
  }
  return computeWeightedAverageAdvanced(mapped, categories).average;
}

/** Required score on a pending item to reach target final (simplified linear search). */
export function requiredGradeForTarget(
  rows: GradeRow[],
  categories: { id: string; name: string; weight: number; rulesJson?: unknown; minGrade?: number | null }[],
  targetAssignmentId: string,
  targetFinal: number
): { required: number | null; achievable: boolean; message: string } {
  const row = rows.find((r) => r.id === targetAssignmentId);
  if (!row) {
    return { required: null, achievable: false, message: 'Select a valid evaluation.' };
  }

  let bestPossible = simulateWhatIf(rows, categories, [
    { assignmentId: targetAssignmentId, score: row.maxScore, maxScore: row.maxScore },
  ]);
  if (bestPossible != null && bestPossible < targetFinal - 0.05) {
    return {
      required: null,
      achievable: false,
      message: `Even with maximum score, highest possible final grade is ${bestPossible.toFixed(1)}.`,
    };
  }

  for (let score = 0; score <= row.maxScore; score += row.maxScore / 40) {
    const projected = simulateWhatIf(rows, categories, [
      { assignmentId: targetAssignmentId, score, maxScore: row.maxScore },
    ]);
    if (projected != null && projected >= targetFinal) {
      const onTwenty = scoreOnTwenty(score, row.maxScore);
      return {
        required: Math.round(onTwenty * 10) / 10,
        achievable: true,
        message: `You need at least ${onTwenty.toFixed(1)}/20 on "${row.title}" to reach ${targetFinal.toFixed(1)} overall.`,
      };
    }
  }

  return {
    required: null,
    achievable: false,
    message: 'Target may not be reachable with current structure.',
  };
}

export function detectGradeRisks(
  snapshots: SubjectGradebookSnapshot[],
  thresholds: GradeThresholds
): GradeRisk[] {
  const risks: GradeRisk[] = [];
  for (const s of snapshots) {
    if (s.currentGrade != null && s.currentGrade < thresholds.passMin) {
      risks.push({
        id: `fail-${s.subjectId}`,
        severity: 'high',
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        message: `Current average ${s.currentGrade} is below passing threshold (${thresholds.passMin}).`,
      });
    }
    if (s.attendancePercent != null && s.attendancePercent < 75) {
      risks.push({
        id: `att-${s.subjectId}`,
        severity: 'medium',
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        message: 'Attendance below 75% — may affect participation or final grade.',
      });
    }
    const missing = s.timeline.filter((t) => t.status === 'missing');
    if (missing.length > 0) {
      risks.push({
        id: `miss-${s.subjectId}`,
        severity: 'high',
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        message: `Missing ${missing.length} evaluation(s) — e.g. "${missing[0].title}" may prevent passing.`,
      });
    }
    if (s.missingWeight > 25) {
      risks.push({
        id: `weight-${s.subjectId}`,
        severity: 'medium',
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        message: `${s.missingWeight}% of grade weight still ungraded — progress at risk.`,
      });
    }
    for (const cat of s.categories) {
      if (cat.minGrade != null && cat.average != null && cat.average < cat.minGrade) {
        risks.push({
          id: `min-${s.subjectId}-${cat.id}`,
          severity: 'high',
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          message: `"${cat.name}" below required minimum (${cat.minGrade}).`,
        });
      }
    }
  }
  return risks;
}

export function buildGradeNotifications(ws: SubjectWorkspace): GradeNotification[] {
  const notes: GradeNotification[] = [];
  const subjectId = ws.subject.id;
  const subjectName = ws.subject.name;

  for (const a of ws.announcements.slice(0, 8)) {
    const body = `${a.title} ${a.body}`.toLowerCase();
    if (
      /grade|nota|score|exam|test|project|evaluation|result|mark/i.test(body) ||
      a.priority === 'high'
    ) {
      notes.push({
        id: `ann-${a.id}`,
        subjectId,
        subjectName,
        title: a.title,
        message: a.body.slice(0, 160) + (a.body.length > 160 ? '…' : ''),
        createdAt: (a.publishedAt ?? a.createdAt).toString(),
        href: `/student/academics/subjects/${subjectId}/announcements`,
      });
    }
  }

  const rows = buildGradeRows(ws);
  const categories = ws.gradeCategories.map((c) => ({
    id: c.id,
    name: c.name,
    weight: c.weight,
    rulesJson: c.rulesJson,
    minGrade: c.minGrade,
  }));
  const { average } = computeWeightedAverageAdvanced(rows, categories);
  const pending = rows.filter((r) => r.score == null && new Date(r.dueDate) > new Date());
  if (average != null && pending.length > 0) {
    const need = requiredGradeForTarget(
      rows,
      categories,
      pending[0].id,
      DEFAULT_THRESHOLDS.passMin
    );
    if (need.message && need.achievable) {
      notes.push({
        id: `need-${pending[0].id}`,
        subjectId,
        subjectName,
        title: 'Passing outlook',
        message: need.message,
        createdAt: new Date().toISOString(),
        href: `/student/academics/subjects/${subjectId}/gradebook`,
      });
    }
  }

  return notes;
}

export function thresholdsFromPrefs(prefs: {
  goodMin: number;
  moderateMin: number;
  passMin: number;
}): GradeThresholds {
  return {
    goodMin: prefs.goodMin,
    moderateMin: prefs.moderateMin,
    passMin: prefs.passMin,
  };
}

export function formatEvaluationMethod(categories: CategoryBreakdown[]): string {
  if (categories.length === 0) return 'Assignments averaged equally';
  return categories
    .map((c) => {
      let extra = '';
      if (c.rules?.type === 'best_of_n') {
        extra = ` (best ${c.rules.bestOf} of ${c.rules.countFrom})`;
      }
      if (c.minGrade != null) extra += ` · min ${c.minGrade}`;
      return `${c.name} ${c.weight}%${extra}`;
    })
    .join(' · ');
}

export function buildSubjectSnapshot(
  ws: SubjectWorkspace,
  thresholds: GradeThresholds,
  credits: number,
  gradingPlan?: {
    mode: 'single' | 'continuous_final';
    scaleMax: number;
    finalExamReplacementRule: boolean;
  }
): SubjectGradebookSnapshot {
  const rows = buildGradeRows(ws);
  const categories = ws.gradeCategories.map((c) => ({
    id: c.id,
    name: c.name,
    weight: c.weight,
    rulesJson: c.rulesJson,
    minGrade: c.minGrade,
  }));

  const { average, breakdown, missingWeight } = computeWeightedAverageAdvanced(rows, categories);

  let currentGrade = average;
  let finalGradeReason: string | null = null;
  let finalGradePassed: boolean | null = null;
  let usesReplacementRule = false;

  if (gradingPlan) {
    const computed = computeFinalGradeFromWorkspace(ws, gradingPlan, (sub) =>
      sub ? studentVisibleScore(sub) : null
    );
    if (computed.finalGrade != null) currentGrade = computed.finalGrade;
    else if (ws.enrollment.grade != null) currentGrade = ws.enrollment.grade;
    finalGradeReason = computed.reason;
    finalGradePassed = computed.passed;
    usesReplacementRule =
      gradingPlan.finalExamReplacementRule && gradingPlan.mode === 'continuous_final';
  } else if (ws.enrollment.grade != null) {
    currentGrade = ws.enrollment.grade;
  }

  const scenarios = projectScenarios(rows, categories);
  const timeline = buildEvaluationTimeline(rows);
  const att = attendanceSummary(ws.attendanceSessions, ws.enrollment.attendance);
  const completed = timeline.filter((t) => t.status === 'completed').length;
  const remaining = timeline.filter((t) => t.status !== 'completed').length;
  const progress =
    timeline.length > 0 ? Math.round((completed / timeline.length) * 100) : 0;

  const professor =
    ws.teacher?.user?.name ?? ws.teacher?.title ?? null;

  return {
    subjectId: ws.subject.id,
    subjectName: ws.subject.name,
    subjectCode: ws.subject.code,
    professor,
    credits,
    currentGrade,
    status: gradeStatus(currentGrade, thresholds),
    progressPercent: progress,
    attendancePercent: att.pct,
    categories: breakdown,
    rows,
    evaluationMethod: formatEvaluationMethod(breakdown),
    remainingEvaluations: remaining,
    completedEvaluations: completed,
    timeline,
    missingWeight,
    projectedBest: scenarios.best,
    projectedRealistic: scenarios.realistic,
    projectedWorst: scenarios.worst,
    evolution: buildGradeEvolution(rows),
    finalGradeReason,
    finalGradePassed,
    usesReplacementRule,
  };
}

/** Use saved credits; only auto-estimate when preference was never set (null/undefined). */
export function resolveCreditsCompleted(
  prefs: { creditsCompleted: number; ectsPerSubject: number },
  enrolledSubjectCount: number
): number {
  if (prefs.creditsCompleted != null && !Number.isNaN(prefs.creditsCompleted)) {
    return Math.max(0, prefs.creditsCompleted);
  }
  return Math.max(0, enrolledSubjectCount * prefs.ectsPerSubject);
}

export function applyPreferencesToDashboard(
  dashboard: GradebookDashboard,
  prefs: {
    goodMin: number;
    moderateMin: number;
    passMin: number;
    creditsCompleted: number;
    creditsRequired: number;
    ectsPerSubject: number;
  }
): GradebookDashboard {
  const thresholds = thresholdsFromPrefs(prefs);
  const creditsCompleted = resolveCreditsCompleted(prefs, dashboard.subjects.length);
  const creditsRemaining = Math.max(0, prefs.creditsRequired - creditsCompleted);
  const subjects = dashboard.subjects.map((s) => ({
    ...s,
    status: gradeStatus(s.currentGrade, thresholds),
    credits: prefs.ectsPerSubject,
  }));
  return {
    ...dashboard,
    creditsCompleted,
    creditsRemaining,
    subjects,
    risks: detectGradeRisks(subjects, thresholds),
  };
}

export function buildGradebookDashboard(
  workspaces: SubjectWorkspace[],
  prefs: {
    goodMin: number;
    moderateMin: number;
    passMin: number;
    creditsCompleted: number;
    creditsRequired: number;
    ectsPerSubject: number;
  },
  gradingPlans?: Map<
    string,
    { mode: 'single' | 'continuous_final'; scaleMax: number; finalExamReplacementRule: boolean }
  >
): GradebookDashboard {
  const thresholds = thresholdsFromPrefs(prefs);
  const subjects = workspaces.map((ws) =>
    buildSubjectSnapshot(
      ws,
      thresholds,
      prefs.ectsPerSubject,
      gradingPlans?.get(ws.subject.id)
    )
  );

  const graded = subjects.filter((s) => s.currentGrade != null);
  const overallGpa =
    graded.length > 0
      ? Math.round(
          (graded.reduce((s, x) => s + (x.currentGrade ?? 0), 0) / graded.length) * 100
        ) / 100
      : null;

  const attValues = subjects
    .map((s) => s.attendancePercent)
    .filter((v): v is number => v != null);
  const attendanceAverage =
    attValues.length > 0
      ? Math.round(attValues.reduce((s, v) => s + v, 0) / attValues.length)
      : null;

  const sorted = [...graded].sort((a, b) => (b.currentGrade ?? 0) - (a.currentGrade ?? 0));
  const creditsCompleted = resolveCreditsCompleted(prefs, subjects.length);
  const creditsRemaining = Math.max(0, prefs.creditsRequired - creditsCompleted);

  const notifications = workspaces.flatMap(buildGradeNotifications).slice(0, 12);

  const semesterEvolution = subjects
    .filter((s) => s.evolution.length > 0)
    .map((s) => ({
      label: s.subjectCode ?? s.subjectName.slice(0, 12),
      average: s.evolution[s.evolution.length - 1]?.grade ?? s.currentGrade ?? 0,
    }));

  return {
    overallGpa,
    semesterAverage: overallGpa,
    bestSubject: sorted[0]
      ? { name: sorted[0].subjectName, grade: sorted[0].currentGrade! }
      : null,
    worstSubject: sorted.length
      ? { name: sorted[sorted.length - 1].subjectName, grade: sorted[sorted.length - 1].currentGrade! }
      : null,
    attendanceAverage,
    creditsCompleted,
    creditsRemaining,
    subjects,
    risks: detectGradeRisks(subjects, thresholds),
    notifications,
    semesterEvolution,
  };
}

