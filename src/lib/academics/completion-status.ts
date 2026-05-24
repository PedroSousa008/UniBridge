import { SUBJECT_PASSING_GRADE } from '@/lib/academics/student-credits';

export const COMPLETION_STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_evaluation', label: 'Pending Evaluation' },
  { value: 'failed', label: 'Failed' },
  { value: 'repeating', label: 'Repeating' },
  { value: 'not_started', label: 'Not Started' },
] as const;

export type CompletionStatus = (typeof COMPLETION_STATUS_OPTIONS)[number]['value'];

const VALID = new Set<string>(COMPLETION_STATUS_OPTIONS.map((o) => o.value));

export function isCompletionStatus(value: string): value is CompletionStatus {
  return VALID.has(value);
}

export function deriveCompletionStatus(opts: {
  isEnrolled: boolean;
  grade: number | null;
  manualStatus: string | null;
}): CompletionStatus {
  if (opts.manualStatus && isCompletionStatus(opts.manualStatus)) {
    return opts.manualStatus;
  }
  if (!opts.isEnrolled) return 'not_started';
  if (opts.grade == null) return 'in_progress';
  if (opts.grade >= SUBJECT_PASSING_GRADE) return 'approved';
  return 'failed';
}

export function completionStatusLabel(status: CompletionStatus): string {
  return COMPLETION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function completionStatusTone(status: CompletionStatus): string {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
    case 'in_progress':
    case 'pending_evaluation':
      return 'bg-sky-500/15 text-sky-700 border-sky-500/30';
    case 'failed':
    case 'repeating':
      return 'bg-rose-500/15 text-rose-700 border-rose-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
