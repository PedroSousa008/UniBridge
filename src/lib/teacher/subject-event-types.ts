export const SUBJECT_EVENT_TYPES = [
  { id: 'CLASS', label: 'Class', color: '#3b82f6' },
  { id: 'EXAM', label: 'Exam', color: '#dc2626' },
  { id: 'TEST', label: 'Test', color: '#ea580c' },
  { id: 'MINI_TEST', label: 'Mini Test', color: '#f97316' },
  { id: 'ORAL_PRESENTATION', label: 'Oral Presentation', color: '#8b5cf6' },
  { id: 'GROUP_PRESENTATION', label: 'Group Presentation', color: '#a855f7' },
  { id: 'ASSIGNMENT_DEADLINE', label: 'Assignment Deadline', color: '#ef4444' },
  { id: 'PROJECT_DEADLINE', label: 'Project Deadline', color: '#b91c1c' },
  { id: 'LAB_SESSION', label: 'Lab Session', color: '#06b6d4' },
  { id: 'REVIEW_SESSION', label: 'Review Session', color: '#14b8a6' },
  { id: 'OFFICE_HOURS', label: 'Office Hours', color: '#6366f1' },
  { id: 'EXTRA_CLASS', label: 'Extra Class', color: '#2563eb' },
  { id: 'WORKSHOP', label: 'Workshop', color: '#d946ef' },
  { id: 'SEMINAR', label: 'Seminar', color: '#7c3aed' },
  { id: 'CUSTOM', label: 'Custom Event', color: '#64748b' },
] as const;

export type SubjectEventTypeId = (typeof SUBJECT_EVENT_TYPES)[number]['id'];

export function colorForEventType(type: string): string {
  return SUBJECT_EVENT_TYPES.find((t) => t.id === type)?.color ?? '#64748b';
}

export function labelForEventType(type: string): string {
  return SUBJECT_EVENT_TYPES.find((t) => t.id === type)?.label ?? type;
}
