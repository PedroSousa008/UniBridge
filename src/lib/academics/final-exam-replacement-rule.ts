import type { GradeCategory } from '@prisma/client';
import { parseCategoryMeta } from '@/lib/teacher/gradebook-structure';

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

export const FINAL_EXAM_MINIMUM_GRADE = 8.5;
export const FINAL_PASS_MINIMUM_GRADE = 9.5;

/**
 * Official final grade rounding: fractional part below 0.5 rounds down, 0.5+ rounds up.
 * Applied after all calculation paths, before pass/fail and persistence.
 */
export function roundOfficialFinalGrade(value: number): number {
  const normalized = Math.round(value * 100) / 100;
  return Math.round(normalized);
}

function finalizeOfficialFinalGrade(
  result: FinalGradeComputation,
  minPass: number = FINAL_PASS_MINIMUM_GRADE
): FinalGradeComputation {
  if (result.finalGrade == null) return result;

  const raw = result.finalGrade;
  const official = roundOfficialFinalGrade(raw);

  if (result.failureReason === 'final_exam_below_minimum') {
    return {
      ...result,
      finalGrade: official,
      passed: false,
      statusLabel: 'Failed',
    };
  }

  const passed = official >= minPass;
  const statusLabel = passed ? 'Passed' : 'Failed';
  const failureReason: FinalGradeFailureReason = passed ? null : 'final_grade_below_minimum';

  let reason = result.reason;
  if (result.method === 'standard') {
    reason = passed
      ? `Weighted average of all components is ${official}.`
      : `Weighted average (${raw}) rounds to ${official}, which is below the pass mark (${minPass}).`;
  } else if (!passed && reason) {
    const detail = reason.replace(/\s*Final grade \(.*\)\s*is below.*$/i, '').trim();
    reason = `${detail} Final grade (${official}) is below the minimum pass mark (${minPass}).`;
  }

  return {
    ...result,
    finalGrade: official,
    passed,
    statusLabel,
    failureReason,
    reason,
  };
}

export type GradePartInput = {
  categoryId: string;
  weight: number;
  score: number | null;
  maxScore: number;
};

export type FinalGradeFailureReason =
  | 'final_exam_below_minimum'
  | 'final_grade_below_minimum'
  | null;

export type FinalGradeComputation = {
  finalGrade: number | null;
  passed: boolean | null;
  continuousGrade: number | null;
  finalExamGrade: number | null;
  method: 'standard' | 'replacement_rule';
  statusLabel: string;
  reason: string | null;
  failureReason: FinalGradeFailureReason;
};

export const FINAL_EXAM_REPLACEMENT_RULE_HELP = {
  title: 'Final Exam Grade Replacement Rule',
  summary:
    'Optional rule for Continuous Evaluation + Final Exam. The final exam must be at least 8.5. The student passes only if the final calculated grade is at least 9.5.',
  steps: [
    'Continuous Evaluation is the weighted average of all continuous components (tests, assignments, participation, etc.).',
    'Final Exam is the grade for the final exam component(s) in the Final Exam block.',
    'If the Final Exam grade is below 8.5, the student fails automatically — even if a weighted average would pass.',
    'If the Final Exam grade is higher than Continuous Evaluation, the Final Grade equals the Final Exam grade.',
    'If the Final Exam grade is lower than or equal to Continuous Evaluation, the Final Grade is the weighted average of both blocks using the configured block percentages (e.g. 60% / 40%).',
    'The student passes only when Final Exam ≥ 8.5 and Final Grade ≥ 9.5. Continuous Evaluation does not need to reach 8.5 on its own.',
    'The official Final Grade is always rounded to a whole number: decimal below 0.5 rounds down, 0.5 or above rounds up (e.g. 9.3 → 9, 10.5 → 11). Pass/fail uses the rounded grade.',
  ],
};

export function groupPartsForContinuousFinal(
  categories: GradeCategory[],
  parts: GradePartInput[]
): {
  continuousParts: { weight: number; score: number | null; maxScore: number }[];
  finalParts: { weight: number; score: number | null; maxScore: number }[];
  continuousBlockWeight: number;
  finalBlockWeight: number;
} {
  const blocks = categories.filter((c) => parseCategoryMeta(c.rulesJson).kind === 'block');
  const continuousBlock = blocks.find((b) => parseCategoryMeta(b.rulesJson).blockKey === 'continuous');
  const finalBlock = blocks.find((b) => parseCategoryMeta(b.rulesJson).blockKey === 'final');

  const continuousParts: { weight: number; score: number | null; maxScore: number }[] = [];
  const finalParts: { weight: number; score: number | null; maxScore: number }[] = [];

  for (const part of parts) {
    const cat = categories.find((c) => c.id === part.categoryId);
    if (!cat) continue;
    const meta = parseCategoryMeta(cat.rulesJson);
    if (meta.kind !== 'component') continue;
    const slice = { weight: part.weight, score: part.score, maxScore: part.maxScore };
    if (continuousBlock && meta.parentId === continuousBlock.id) {
      continuousParts.push(slice);
    } else if (finalBlock && meta.parentId === finalBlock.id) {
      finalParts.push(slice);
    }
  }

  return {
    continuousParts,
    finalParts,
    continuousBlockWeight: continuousBlock?.weight ?? 50,
    finalBlockWeight: finalBlock?.weight ?? 50,
  };
}

/**
 * Average grade for a block (Continuous or Final) on the 0–scaleMax scale.
 * Component weights are relative within the block (e.g. 25% + 25% inside a 50% block → average of the two scores).
 */
export function computeBlockAverageGrade(
  parts: { weight: number; score: number | null; maxScore: number }[],
  scaleMax: number
): number | null {
  const graded = parts.filter((c) => c.score != null && c.weight > 0);
  if (graded.length === 0) return null;

  const weightSum = graded.reduce((sum, c) => sum + c.weight, 0);
  if (weightSum <= 0) return null;

  let total = 0;
  for (const c of graded) {
    const onScale = (c.score! / c.maxScore) * scaleMax;
    total += onScale * (c.weight / weightSum);
  }
  return Math.round(total * 100) / 100;
}

function blockGrade(
  parts: { weight: number; score: number | null; maxScore: number }[],
  scaleMax: number
): number | null {
  return computeBlockAverageGrade(parts, scaleMax);
}

export function computeFinalExamReplacementGrade(input: {
  scaleMax: number;
  continuousBlockWeight: number;
  finalBlockWeight: number;
  continuousParts: { weight: number; score: number | null; maxScore: number }[];
  finalParts: { weight: number; score: number | null; maxScore: number }[];
  minFinalExam?: number;
  minPassGrade?: number;
}): FinalGradeComputation {
  const minExam = input.minFinalExam ?? FINAL_EXAM_MINIMUM_GRADE;
  const minPass = input.minPassGrade ?? FINAL_PASS_MINIMUM_GRADE;
  const cw = input.continuousBlockWeight;
  const fw = input.finalBlockWeight;

  const continuousGrade = blockGrade(input.continuousParts, input.scaleMax);
  const finalExamGrade = blockGrade(input.finalParts, input.scaleMax);

  if (continuousGrade == null || finalExamGrade == null) {
    return {
      finalGrade: null,
      passed: null,
      continuousGrade,
      finalExamGrade,
      method: 'replacement_rule',
      statusLabel: 'Pending',
      reason: 'Waiting for all continuous and final exam grades to be published.',
      failureReason: null,
    };
  }

  const weightedAverage =
    Math.round((continuousGrade * (cw / 100) + finalExamGrade * (fw / 100)) * 100) / 100;

  if (finalExamGrade < minExam) {
    return finalizeOfficialFinalGrade({
      finalGrade: weightedAverage,
      passed: false,
      continuousGrade,
      finalExamGrade,
      method: 'replacement_rule',
      statusLabel: 'Failed',
      reason: `Final exam grade (${finalExamGrade}) is below the minimum required (${minExam}). The student fails even if the weighted average is ${weightedAverage}.`,
      failureReason: 'final_exam_below_minimum',
    });
  }

  let rawFinalGrade: number;
  let detail: string;

  if (finalExamGrade > continuousGrade) {
    rawFinalGrade = finalExamGrade;
    detail = `Final exam (${finalExamGrade}) is higher than continuous evaluation (${continuousGrade}), so the final grade uses the exam grade.`;
  } else {
    rawFinalGrade = weightedAverage;
    detail = `Final grade is the weighted average of continuous evaluation (${continuousGrade}) at ${cw}% and final exam (${finalExamGrade}) at ${fw}%.`;
  }

  const passed = rawFinalGrade >= minPass;

  return finalizeOfficialFinalGrade({
    finalGrade: rawFinalGrade,
    passed,
    continuousGrade,
    finalExamGrade,
    method: 'replacement_rule',
    statusLabel: passed ? 'Passed' : 'Failed',
    reason: passed
      ? detail
      : `${detail} Final grade (${rawFinalGrade}) is below the minimum pass mark (${minPass}).`,
    failureReason: passed ? null : 'final_grade_below_minimum',
  }, minPass);
}

/** Sync final grade for student subject workspace (gradebook dashboard). */
export function computeFinalGradeFromWorkspace(
  ws: {
    gradeCategories: GradeCategory[];
    assignments: Array<{
      gradeCategoryId: string | null;
      maxScore: number;
      submissions: Array<{ score?: number | null; gradePublished?: boolean | null }>;
    }>;
  },
  plan: {
    mode: 'single' | 'continuous_final';
    scaleMax: number;
    finalExamReplacementRule: boolean;
  },
  getScore: (sub: { score?: number | null; gradePublished?: boolean | null } | undefined) => number | null
): FinalGradeComputation {
  const components = ws.gradeCategories.filter(
    (c) => parseCategoryMeta(c.rulesJson).kind === 'component'
  );

  const parts: GradePartInput[] = [];
  let allPublished = components.length > 0;

  for (const cat of components) {
    const assignment = ws.assignments.find((a) => a.gradeCategoryId === cat.id);
    if (!assignment) {
      allPublished = false;
      continue;
    }
    const sub = assignment.submissions[0];
    const score = getScore(sub);
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
    categories: ws.gradeCategories,
    parts,
    allPublished,
  });
}

export function computeSubjectFinalGrade(input: {
  mode: 'single' | 'continuous_final';
  scaleMax: number;
  replacementRuleEnabled: boolean;
  categories: GradeCategory[];
  parts: GradePartInput[];
  allPublished: boolean;
}): FinalGradeComputation {
  const allSlices = input.parts.map((p) => ({
    weight: p.weight,
    score: p.score,
    maxScore: p.maxScore,
  }));

  if (!input.allPublished) {
    return {
      finalGrade: null,
      passed: null,
      continuousGrade: null,
      finalExamGrade: null,
      method: input.replacementRuleEnabled && input.mode === 'continuous_final' ? 'replacement_rule' : 'standard',
      statusLabel: 'Pending',
      reason: 'Not all evaluation components have published grades yet.',
      failureReason: null,
    };
  }

  if (input.mode === 'continuous_final' && input.replacementRuleEnabled) {
    const grouped = groupPartsForContinuousFinal(input.categories, input.parts);
    return computeFinalExamReplacementGrade({
      scaleMax: input.scaleMax,
      continuousBlockWeight: grouped.continuousBlockWeight,
      finalBlockWeight: grouped.finalBlockWeight,
      continuousParts: grouped.continuousParts,
      finalParts: grouped.finalParts,
    });
  }

  const rawFinalGrade = computeWeightedFinal(allSlices, input.scaleMax);
  if (rawFinalGrade == null) {
    return {
      finalGrade: null,
      passed: null,
      continuousGrade: null,
      finalExamGrade: null,
      method: 'standard',
      statusLabel: 'Pending',
      reason: null,
      failureReason: null,
    };
  }

  const passed = rawFinalGrade >= FINAL_PASS_MINIMUM_GRADE;

  return finalizeOfficialFinalGrade({
    finalGrade: rawFinalGrade,
    passed,
    continuousGrade: null,
    finalExamGrade: null,
    method: 'standard',
    statusLabel: passed ? 'Passed' : 'Failed',
    reason: passed
      ? `Weighted average of all components is ${rawFinalGrade}.`
      : `Weighted average (${rawFinalGrade}) is below the pass mark (${FINAL_PASS_MINIMUM_GRADE}).`,
    failureReason: passed ? null : 'final_grade_below_minimum',
  });
}
