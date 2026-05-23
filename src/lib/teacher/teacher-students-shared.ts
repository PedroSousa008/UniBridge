export type StudentSupportAlert = {
  id: string;
  label: string;
  tone: 'warning' | 'critical' | 'info';
};

export type StudentAcademicFilter =
  | 'all'
  | 'low_attendance'
  | 'missing_assignments'
  | 'top_performers'
  | 'needs_support'
  | 'highly_active';

export function buildStudentSupportAlerts(input: {
  attendancePercent: number | null;
  minAttendance: number;
  missingAssignments: number;
  overdueMissing: number;
  overallGrade: number | null;
  pendingGradingForStudent: boolean;
  engagementScore?: number | null;
}): StudentSupportAlert[] {
  const alerts: StudentSupportAlert[] = [];
  const att = input.attendancePercent;

  if (att != null && att < input.minAttendance - 15) {
    alerts.push({ id: 'att-critical', label: 'Critical attendance', tone: 'critical' });
  } else if (att != null && att < input.minAttendance) {
    alerts.push({ id: 'att-low', label: 'Low attendance', tone: 'warning' });
  }

  if (input.overdueMissing > 0) {
    alerts.push({
      id: 'overdue',
      label:
        input.overdueMissing === 1
          ? '1 missing submission'
          : `${input.overdueMissing} missing submissions`,
      tone: 'critical',
    });
  } else if (input.missingAssignments > 0) {
    alerts.push({
      id: 'missing',
      label: 'Pending work',
      tone: 'warning',
    });
  }

  if (input.pendingGradingForStudent) {
    alerts.push({ id: 'grading', label: 'Awaiting published grade', tone: 'info' });
  }

  if (input.overallGrade != null && input.overallGrade < 10) {
    alerts.push({ id: 'grade-low', label: 'Grade below expectations', tone: 'warning' });
  }

  if (input.engagementScore != null && input.engagementScore < 0.35) {
    alerts.push({ id: 'disengaged', label: 'Low engagement', tone: 'warning' });
  }

  return alerts;
}

export function studentNeedsSupport(alerts: StudentSupportAlert[]): boolean {
  return alerts.some((a) => a.tone === 'critical' || a.tone === 'warning');
}

export function matchesStudentSearch(
  student: {
    name: string;
    email: string;
    courseName: string | null;
    yearOfStudy: number | null;
    attendancePercent: number | null;
    overallGrade: number | null;
    alerts: StudentSupportAlert[];
    missingAssignments: number;
    engagementLabel: string;
    participationLabel: string;
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const tokens = q.split(/\s+/);
  const haystack = [
    student.name,
    student.email,
    student.courseName ?? '',
    student.yearOfStudy != null ? `year ${student.yearOfStudy}` : '',
    student.attendancePercent != null ? `${student.attendancePercent}% attendance` : '',
    student.attendancePercent != null && student.attendancePercent < 75 ? 'low attendance' : '',
    student.overallGrade != null ? `grade ${student.overallGrade}` : '',
    student.missingAssignments > 0 ? 'missing assignments missing work' : '',
    studentNeedsSupport(student.alerts) ? 'needs support' : '',
    student.engagementLabel,
    student.participationLabel,
    ...student.alerts.map((a) => a.label),
  ]
    .join(' ')
    .toLowerCase();

  return tokens.every((t) => haystack.includes(t));
}

export function matchesStudentFilter(
  student: {
    attendancePercent: number | null;
    missingAssignments: number;
    overdueMissing: number;
    overallGrade: number | null;
    alerts: StudentSupportAlert[];
    submissionsThisMonth: number;
  },
  filter: StudentAcademicFilter,
  minAttendance: number
): boolean {
  if (filter === 'all') return true;
  if (filter === 'low_attendance') {
    return (
      student.attendancePercent != null &&
      student.attendancePercent < minAttendance
    );
  }
  if (filter === 'missing_assignments') {
    return student.missingAssignments > 0 || student.overdueMissing > 0;
  }
  if (filter === 'top_performers') {
    return student.overallGrade != null && student.overallGrade >= 16;
  }
  if (filter === 'needs_support') {
    return studentNeedsSupport(student.alerts);
  }
  if (filter === 'highly_active') {
    return student.submissionsThisMonth >= 3;
  }
  return true;
}

export function engagementLabel(score: number | null | undefined): string {
  if (score == null) return 'building profile';
  if (score >= 0.75) return 'highly engaged';
  if (score >= 0.5) return 'active';
  if (score >= 0.25) return 'moderate';
  return 'low engagement';
}

export function participationLabel(submissionsThisMonth: number): string {
  if (submissionsThisMonth >= 5) return 'high participation';
  if (submissionsThisMonth >= 2) return 'steady participation';
  if (submissionsThisMonth === 1) return 'light participation';
  return 'quiet';
}
