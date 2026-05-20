import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import { inferSkillsFromProfile } from '@/lib/career/compatibility-engine';

export interface CompanyCompatibilityBreakdown {
  overall: number;
  skillsMatch: number;
  leadership: number;
  communication: number;
  startupActivity: number;
  academicAlignment: number;
  recommendations: string[];
}

const HIRING_LABELS: Record<string, string> = {
  actively_hiring: 'Actively hiring',
  selective: 'Selective hiring',
  paused: 'Hiring paused',
  building_pipeline: 'Building pipeline',
};

export function hiringActivityLabel(key: string | null | undefined): string {
  if (!key) return HIRING_LABELS.actively_hiring;
  return HIRING_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function computeCompanyStudentCompatibility(
  profile: StudentCareerProfile,
  input: {
    nonNegotiables: string[];
    preferredQualities: string[];
    requiredSkills: string[];
    preferredSkills: string[];
  }
): CompanyCompatibilityBreakdown {
  const skills = inferSkillsFromProfile(profile);
  const skillSet = new Set(skills.map((s) => s.toLowerCase()));

  const matchList = (items: string[]) => {
    if (items.length === 0) return 70;
    let hits = 0;
    for (const item of items) {
      const t = item.toLowerCase();
      if ([...skillSet].some((s) => s.includes(t) || t.includes(s))) hits++;
      else if (t.includes('startup') && profile.hasStartup) hits++;
      else if (t.includes('gpa') && (profile.gradeAverage ?? 0) >= 14) hits++;
      else if (t.includes('english') && profile.profileStrength >= 50) hits++;
      else if (t.includes('leadership') && profile.hasStartup) hits++;
      else if (t.includes('communication') && profile.profileStrength >= 55) hits++;
      else if (t.includes('analytical') && (profile.gradeAverage ?? 0) >= 13) hits++;
    }
    return Math.round((hits / items.length) * 100);
  };

  const skillsMatch = matchList([
    ...input.requiredSkills,
    ...input.nonNegotiables.filter((n) =>
      /skill|technical|analytical|communication/i.test(n)
    ),
  ]);
  const leadership = matchList(
    input.preferredQualities.filter((q) => /lead|entrepreneur/i.test(q))
  );
  const communication = Math.min(
    100,
    Math.round(profile.profileStrength * 0.85 + (profile.employabilityScore ?? 0) * 0.15)
  );
  const startupActivity = profile.hasStartup
    ? Math.min(100, 55 + (profile.startupReadiness ?? 40))
    : input.preferredQualities.some((q) => /startup|entrepreneur/i.test(q))
      ? 35
      : 55;
  const academicAlignment = Math.min(
    100,
    Math.round(
      ((profile.gradeAverage ?? 12) / 20) * 100 * 0.5 +
        (profile.attendanceAverage ?? 80) * 0.3 +
        profile.engagementScore * 0.2
    )
  );

  const preferredBoost = matchList(input.preferredQualities) * 0.15;
  const overall = Math.round(
    skillsMatch * 0.3 +
      leadership * 0.15 +
      communication * 0.2 +
      startupActivity * 0.15 +
      academicAlignment * 0.2 +
      preferredBoost
  );

  const recommendations: string[] = [];
  if (profile.profileStrength < 65) {
    recommendations.push('Complete profile verification');
  }
  if (!profile.hasStartup && input.preferredQualities.some((q) => /startup/i.test(q))) {
    recommendations.push('Join or document startup activity');
  }
  if ((profile.gradeAverage ?? 0) < 13 && input.nonNegotiables.some((n) => /gpa/i.test(n))) {
    recommendations.push('Strengthen academic performance');
  }
  if (profile.engagementScore < 50) {
    recommendations.push('Attend networking events in your university ecosystem');
  }
  if (leadership < 60) {
    recommendations.push('Improve leadership activity on your profile');
  }
  if (recommendations.length === 0) {
    recommendations.push('Keep your profile updated to stay visible to recruiters');
  }

  return {
    overall: Math.min(99, Math.max(42, overall)),
    skillsMatch,
    leadership: leadership || Math.round(profile.employabilityScore * 0.9) || 60,
    communication,
    startupActivity,
    academicAlignment,
    recommendations: recommendations.slice(0, 4),
  };
}

export function computeAttractivenessScore(input: {
  studentInterest: number;
  applicationGrowth: number;
  eventEngagement: number;
  responseSpeed: number;
  hiringSatisfaction: number;
  mentorshipActivity: number;
}): number {
  return Math.round(
    input.studentInterest * 0.2 +
      input.applicationGrowth * 0.2 +
      input.eventEngagement * 0.15 +
      input.responseSpeed * 0.15 +
      input.hiringSatisfaction * 0.15 +
      input.mentorshipActivity * 0.15
  );
}

export const CULTURE_TAG_OPTIONS = [
  'fast-paced',
  'analytical',
  'entrepreneurial',
  'collaborative',
  'creative',
  'disciplined',
  'innovation-driven',
] as const;

export const ROLE_TYPE_OPTIONS = [
  { id: 'internship', label: 'Internship' },
  { id: 'graduate', label: 'Graduate program' },
  { id: 'full_time', label: 'Full-time role' },
  { id: 'leadership', label: 'Leadership track' },
  { id: 'startup_collab', label: 'Startup collaboration' },
] as const;

export const HIRING_PRIORITY_OPTIONS = [
  { id: 'high', label: 'High priority' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
] as const;

export const ECOSYSTEM_REQUIREMENT_TAGS = [
  { id: 'gpa_14', label: 'GPA 14+', group: 'academic' as const },
  { id: 'gpa_15', label: 'GPA 15+', group: 'academic' as const },
  { id: 'fluent_english', label: 'Fluent English', group: 'skills' as const },
  { id: 'communication', label: 'Strong communication', group: 'skills' as const },
  { id: 'analytical', label: 'Analytical thinking', group: 'skills' as const },
  { id: 'excel', label: 'Excel / spreadsheets', group: 'skills' as const },
  { id: 'erasmus', label: 'Erasmus / international', group: 'experience' as const },
  { id: 'startup_exp', label: 'Startup experience', group: 'experience' as const },
  { id: 'leadership', label: 'Leadership roles', group: 'experience' as const },
  { id: 'networking', label: 'Networking activity', group: 'experience' as const },
  { id: 'internship_exp', label: 'Prior internships', group: 'experience' as const },
  { id: 'availability', label: 'Full-time availability', group: 'other' as const },
] as const;

export function labelForRequirementTag(id: string): string {
  return ECOSYSTEM_REQUIREMENT_TAGS.find((t) => t.id === id)?.label ?? id;
}
