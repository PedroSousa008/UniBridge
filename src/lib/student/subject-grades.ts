export type { GradeRow } from './gradebook-engine';
export {
  attendanceSummary,
  buildGradeRows,
  computeWeightedAverageAdvanced,
  isMissingGradeRow,
  simulateWhatIf,
} from './gradebook-engine';

import { computeWeightedAverageAdvanced, simulateWhatIf, type GradeRow } from './gradebook-engine';

export function computeWeightedAverage(
  rows: GradeRow[],
  categories: { name: string; weight: number }[]
) {
  const mapped = categories.map((c, i) => ({
    id: `cat-${i}`,
    name: c.name,
    weight: c.weight,
  }));
  return computeWeightedAverageAdvanced(rows, mapped).average;
}

export function projectFinalGrade(
  currentAverage: number | null,
  rows: GradeRow[],
  hypothetical: { assignmentId: string; score: number; maxScore: number }
) {
  const categories = Array.from(
    new Map(
      rows
        .filter((r) => r.categoryName)
        .map((r, i) => [
          r.categoryName!,
          { id: `c-${i}`, name: r.categoryName!, weight: r.weight },
        ])
    ).values()
  );
  return simulateWhatIf(rows, categories, [hypothetical]) ?? currentAverage;
}
