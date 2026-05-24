/** Minimum final grade (out of 20) to earn subject credits. */
export const SUBJECT_PASSING_GRADE = 9.5;

export function creditsEarnedForEnrollment(
  grade: number | null | undefined,
  subjectCredits: number | null | undefined
): number {
  if (grade == null || subjectCredits == null || subjectCredits <= 0) return 0;
  if (grade < SUBJECT_PASSING_GRADE) return 0;
  return subjectCredits;
}

export function sumCompletedCredits(
  rows: { grade: number | null; credits: number | null }[]
): number {
  return rows.reduce(
    (sum, row) => sum + creditsEarnedForEnrollment(row.grade, row.credits),
    0
  );
}
