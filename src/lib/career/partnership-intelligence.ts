import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import type { CompatibilityResult } from '@/lib/career/compatibility-engine';
import type { BreakdownCategory } from '@/lib/career/compatibility-intelligence';

export type PartnershipTier =
  | 'Official University Partner'
  | 'Strategic Partner'
  | 'Startup Partner'
  | 'Premium Recruiting Partner';

export function normalizePartnershipTier(
  partnershipType: string | null | undefined,
  partnershipTier: string | null | undefined
): PartnershipTier {
  const raw = (partnershipTier ?? partnershipType ?? '').toLowerCase();
  if (raw.includes('premium') || raw.includes('recruiting')) return 'Premium Recruiting Partner';
  if (raw.includes('startup')) return 'Startup Partner';
  if (raw.includes('strategic')) return 'Strategic Partner';
  if (raw.includes('official')) return 'Official University Partner';
  return 'Official University Partner';
}

export function inferDepartment(roleTitle: string, industry: string | null): string {
  const t = roleTitle.toLowerCase();
  if (/consult/i.test(t)) return 'Consulting';
  if (/finance|bank|investment|analyst/i.test(t)) return 'Finance';
  if (/market|brand|growth/i.test(t)) return 'Marketing';
  if (/tech|engineer|developer|software|data|product/i.test(t)) return 'Technology';
  if (/operat|supply|logistics/i.test(t)) return 'Operations';
  if (/hr|human|talent|people/i.test(t)) return 'HR';
  if (/design|creative|ux/i.test(t)) return 'Design';
  const ind = (industry ?? '').toLowerCase();
  if (ind.includes('tech')) return 'Technology';
  if (ind.includes('finance')) return 'Finance';
  if (ind.includes('consult')) return 'Consulting';
  return 'General';
}

export function jobAiInsight(
  result: CompatibilityResult,
  roleTitle: string,
  profile: StudentCareerProfile
): string {
  const t = roleTitle.toLowerCase();
  if (result.compatibility >= 80) {
    if (profile.hasStartup && (t.includes('product') || t.includes('founder'))) {
      return 'This role strongly matches your entrepreneurial and leadership profile.';
    }
    if (profile.gradeAverage != null && profile.gradeAverage >= 14) {
      return 'Your academic performance aligns well with what top performers bring to this role.';
    }
    return 'This role strongly matches your current profile signals.';
  }
  if (result.compatibility >= 60) {
    return 'Students with your profile usually perform well in this role after closing a few skill gaps.';
  }
  if (result.missingSkills.length > 0) {
    return `Building ${result.missingSkills[0]!.name} would significantly improve your fit for this role.`;
  }
  return 'This role is a growth opportunity — targeted experience can raise your compatibility quickly.';
}

export function improveCompatibilityTips(
  result: CompatibilityResult,
  profile: StudentCareerProfile,
  breakdown: BreakdownCategory[]
): string[] {
  const tips: string[] = [];

  for (const skill of result.missingSkills.slice(0, 2)) {
    tips.push(`Improve ${skill.name}`);
  }

  const attendance = breakdown.find((b) => /academic/i.test(b.label));
  if (attendance && attendance.score < 70 && profile.attendanceAverage != null) {
    tips.push('Increase attendance consistency');
  }

  const experience = breakdown.find((b) => /experience/i.test(b.label));
  if (experience && experience.score < 60) {
    tips.push('Complete an internship or leadership project');
  }

  const leadership = breakdown.find((b) => /leadership/i.test(b.label));
  if (leadership && leadership.score < 55) {
    tips.push('Increase leadership activity');
  }

  if (profile.profileStrength < 70) {
    tips.push('Optimize your CV and profile completeness');
  }

  return [...new Set(tips)].slice(0, 5);
}

export function profileCompletionForJob(
  profile: StudentCareerProfile,
  result: CompatibilityResult
): number {
  const matchedRatio =
    result.matchedSkills.length > 0
      ? result.matchedSkills.filter((s) => s.matched).length / result.matchedSkills.length
      : 0.5;
  return Math.min(
    99,
    Math.round(profile.profileStrength * 0.45 + profile.employabilityScore * 0.25 + matchedRatio * 100 * 0.3)
  );
}

export function hiringStatusLabel(status: string | null | undefined): string {
  const s = (status ?? 'active').toLowerCase();
  if (s === 'paused') return 'Hiring paused';
  if (s === 'closed') return 'Not hiring';
  return 'Actively hiring';
}

export function formatSalary(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `€${min.toLocaleString()} – €${max.toLocaleString()}`;
  if (min != null) return `From €${min.toLocaleString()}`;
  return `Up to €${max!.toLocaleString()}`;
}

export function remoteLabel(remoteType: string | null | undefined): string {
  const r = (remoteType ?? 'on_site').toLowerCase();
  if (r === 'remote') return 'Remote';
  if (r === 'hybrid') return 'Hybrid';
  return 'On-site';
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  candidate: 'Candidate',
  applied: 'Applied',
  reviewing: 'Under review',
  interview: 'Interview',
  rejected: 'Not selected',
  accepted: 'Accepted',
};

export function alumniPlaceholder(companyName: string): {
  roleTitle: string;
  note: string;
}[] {
  return [
    {
      roleTitle: 'Recent graduate intern',
      note: `${companyName} alumni tracking activates as students join roles through UniBridge.`,
    },
    {
      roleTitle: 'Current student intern',
      note: 'Testimonials and peer paths appear here once hiring flows through the platform.',
    },
  ];
}
