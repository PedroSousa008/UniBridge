export const SUBJECT_SEMESTER_OPTIONS = [
  { value: '1', label: '1st semester' },
  { value: '2', label: '2nd semester' },
] as const;

export type SubjectSemesterValue = (typeof SUBJECT_SEMESTER_OPTIONS)[number]['value'];

/** Normalize stored semester values to 1 or 2 for form selects. */
export function normalizeSubjectSemester(value: string | null | undefined): SubjectSemesterValue | '' {
  if (!value) return '';
  const s = value.trim().toLowerCase();
  if (s === '1' || s === '1st' || s.includes('first') || s === 's1') return '1';
  if (s === '2' || s === '2nd' || s.includes('second') || s === 's2') return '2';
  return '';
}

export function formatSubjectSemester(value: string | null | undefined): string {
  const normalized = normalizeSubjectSemester(value);
  if (normalized === '1') return '1st';
  if (normalized === '2') return '2nd';
  return value?.trim() || '—';
}

export function isValidSubjectSemester(value: string): value is SubjectSemesterValue {
  return value === '1' || value === '2';
}
