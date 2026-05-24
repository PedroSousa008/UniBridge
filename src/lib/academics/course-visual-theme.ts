export type CourseVisualTheme = 'business' | 'law' | 'engineering' | 'general';

export function inferCourseVisualTheme(name: string, department: string | null): CourseVisualTheme {
  const text = `${name} ${department ?? ''}`.toLowerCase();
  if (/law|direito|legal|jur[ií]dic/.test(text)) return 'law';
  if (/engenh|engineer|computer science|inform[aá]tica|tech/.test(text)) return 'engineering';
  if (/gest[aã]o|business|econom|management|finan|marketing|administra/.test(text)) return 'business';
  return 'general';
}

export function resolveCourseVisualTheme(input: {
  name: string;
  department: string | null;
  visualTheme?: string | null;
}): CourseVisualTheme {
  const preset = input.visualTheme?.trim().toLowerCase();
  if (preset === 'business' || preset === 'law' || preset === 'engineering' || preset === 'general') {
    return preset;
  }
  return inferCourseVisualTheme(input.name, input.department);
}

export function courseThemeStyles(theme: CourseVisualTheme, themeColor?: string | null) {
  if (themeColor?.trim()) {
    return {
      gradient: `linear-gradient(135deg, ${themeColor} 0%, color-mix(in srgb, ${themeColor} 55%, #0f172a) 100%)`,
      accent: themeColor,
    };
  }
  switch (theme) {
    case 'business':
      return {
        gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0d9488 50%, #134e4a 100%)',
        accent: '#0d9488',
      };
    case 'law':
      return {
        gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4338ca 45%, #312e81 100%)',
        accent: '#6366f1',
      };
    case 'engineering':
      return {
        gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #1e293b 100%)',
        accent: '#0ea5e9',
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
        accent: '#64748b',
      };
  }
}

export function formatYearOfStudyLabel(year: number | null, durationYears = 3): string {
  if (year == null) return '—';
  if (year >= durationYears) return 'Final Year';
  if (year === 1) return '1st Year';
  if (year === 2) return '2nd Year';
  if (year === 3) return '3rd Year';
  return `${year}th Year`;
}

export const ACADEMIC_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'erasmus', label: 'Erasmus' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export function academicStatusLabel(status: string | null | undefined): string {
  const s = (status ?? 'active').toLowerCase();
  return ACADEMIC_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? 'Active';
}
