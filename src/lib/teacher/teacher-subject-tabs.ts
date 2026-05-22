export const TEACHER_SUBJECT_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'content', label: 'Content' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'gradebook', label: 'Gradebook' },
  { id: 'messages', label: 'Messages' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'attendance', label: 'Attendance' },
] as const;

export type TeacherSubjectTabId = (typeof TEACHER_SUBJECT_TABS)[number]['id'];
