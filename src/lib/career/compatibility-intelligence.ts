import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import type { CompatibilityResult } from '@/lib/career/compatibility-engine';

export interface BreakdownCategory {
  id: string;
  label: string;
  score: number;
  status: 'strong' | 'moderate' | 'gap';
}

export interface WorkStyleTrait {
  id: string;
  label: string;
  score: number;
}

export interface MicroQuizQuestion {
  id: string;
  question: string;
  options: { id: string; label: string; traits: Record<string, number> }[];
}

export interface SimulationAction {
  id: string;
  label: string;
  description: string;
  deltaPercent: number;
  projectedScore: number;
  baseScore: number;
}

export const WORK_STYLE_QUESTIONS: MicroQuizQuestion[] = [
  {
    id: 'problem',
    question: 'When facing a problem, what do you usually do first?',
    options: [
      { id: 'analyze', label: 'Analyze the data', traits: { analytical: 3, structured: 2 } },
      { id: 'discuss', label: 'Talk it through with others', traits: { leadership: 2, communication: 3 } },
      { id: 'create', label: 'Brainstorm creative options', traits: { creative: 3, entrepreneurial: 1 } },
      { id: 'act', label: 'Take charge and move fast', traits: { leadership: 3, fastPaced: 3 } },
    ],
  },
  {
    id: 'environment',
    question: 'Your ideal work environment feels…',
    options: [
      { id: 'structured', label: 'Structured and predictable', traits: { structured: 3, analytical: 1 } },
      { id: 'startup', label: 'Fast-paced and ambiguous', traits: { entrepreneurial: 3, fastPaced: 2 } },
      { id: 'team', label: 'Collaborative and people-focused', traits: { leadership: 2, communication: 2 } },
      { id: 'solo', label: 'Independent and deep-focus', traits: { analytical: 2, creative: 2 } },
    ],
  },
  {
    id: 'energy',
    question: 'What energizes you most?',
    options: [
      { id: 'solve', label: 'Solving complex problems', traits: { analytical: 3 } },
      { id: 'build', label: 'Building something new', traits: { entrepreneurial: 3, creative: 1 } },
      { id: 'lead', label: 'Leading and influencing others', traits: { leadership: 3 } },
      { id: 'design', label: 'Designing and expressing ideas', traits: { creative: 3 } },
    ],
  },
];

const TRAIT_LABELS: Record<string, string> = {
  analytical: 'Analytical',
  entrepreneurial: 'Entrepreneurial',
  creative: 'Creative',
  leadership: 'Leadership-oriented',
  structured: 'Structured',
  fastPaced: 'Fast-paced',
  communication: 'Communicative',
};

export function computeBreakdown(
  profile: StudentCareerProfile,
  result: CompatibilityResult
): BreakdownCategory[] {
  const gradeScore =
    profile.gradeAverage != null ? Math.min(100, Math.round((profile.gradeAverage / 20) * 100)) : 40;
  const attendanceScore = profile.attendanceAverage ?? 50;
  const technical = Math.min(
    100,
    Math.round(
      (result.matchedSkills.filter((s) =>
        /sql|technical|python|data|excel|programming/i.test(s.name)
      ).length /
        Math.max(1, result.matchedSkills.length)) *
        100 +
        gradeScore * 0.2
    )
  );
  const communication = Math.min(
    100,
    Math.round(profile.profileStrength * 0.6 + (profile.employabilityScore > 50 ? 25 : 10))
  );
  const leadership = Math.min(
    100,
    Math.round(
      (profile.hasStartup ? 35 : 0) +
        profile.engagementScore * 0.4 +
        (profile.startupReadiness ?? 0) * 0.3
    )
  );
  const academic = Math.round(gradeScore * 0.7 + attendanceScore * 0.3);
  const experience = Math.min(
    100,
    Math.round(
      (profile.hasStartup ? 40 : 0) +
        profile.employabilityScore * 0.35 +
        (profile.assignmentCompletionRate ?? 0) * 0.25
    )
  );
  const networking = Math.min(100, Math.round(profile.engagementScore * 0.7 + profile.profileStrength * 0.2));
  const creativity = Math.min(
    100,
    Math.round((profile.hasStartup ? 45 : 15) + (profile.startupReadiness ?? 0) * 0.4)
  );
  const analytical = Math.min(100, Math.round(gradeScore * 0.5 + technical * 0.5));

  const items: BreakdownCategory[] = [
    { id: 'technical', label: 'Technical Skills', score: technical, status: scoreStatus(technical) },
    { id: 'communication', label: 'Communication', score: communication, status: scoreStatus(communication) },
    { id: 'leadership', label: 'Leadership', score: leadership, status: scoreStatus(leadership) },
    { id: 'academic', label: 'Academic Performance', score: academic, status: scoreStatus(academic) },
    { id: 'experience', label: 'Experience', score: experience, status: scoreStatus(experience) },
    { id: 'networking', label: 'Networking', score: networking, status: scoreStatus(networking) },
    { id: 'creativity', label: 'Creativity', score: creativity, status: scoreStatus(creativity) },
    { id: 'analytical', label: 'Analytical Thinking', score: analytical, status: scoreStatus(analytical) },
  ];
  return items;
}

function scoreStatus(score: number): BreakdownCategory['status'] {
  if (score >= 70) return 'strong';
  if (score >= 45) return 'moderate';
  return 'gap';
}

export function traitsFromQuizAnswers(
  answers: Record<string, string>,
  profile: StudentCareerProfile
): WorkStyleTrait[] {
  const totals: Record<string, number> = {};

  for (const q of WORK_STYLE_QUESTIONS) {
    const chosen = answers[q.id];
    const opt = q.options.find((o) => o.id === chosen);
    if (!opt) continue;
    for (const [trait, weight] of Object.entries(opt.traits)) {
      totals[trait] = (totals[trait] ?? 0) + weight;
    }
  }

  if (profile.hasStartup) totals.entrepreneurial = (totals.entrepreneurial ?? 0) + 4;
  if (profile.gradeAverage != null && profile.gradeAverage >= 14) {
    totals.analytical = (totals.analytical ?? 0) + 3;
  }
  if (profile.profileStrength >= 60) totals.communication = (totals.communication ?? 0) + 2;

  const max = Math.max(1, ...Object.values(totals));
  return Object.entries(TRAIT_LABELS).map(([id, label]) => ({
    id,
    label,
    score: Math.min(100, Math.round(((totals[id] ?? 0) / max) * 100)),
  }));
}

export function inferTraitsFromProfileOnly(profile: StudentCareerProfile): WorkStyleTrait[] {
  const totals: Record<string, number> = {
    analytical: profile.gradeAverage != null && profile.gradeAverage >= 13 ? 4 : 1,
    entrepreneurial: profile.hasStartup ? 5 : 0,
    creative: profile.hasStartup ? 2 : 1,
    leadership: profile.hasStartup ? 3 : profile.engagementScore > 50 ? 2 : 0,
    structured: profile.attendanceAverage != null && profile.attendanceAverage >= 85 ? 3 : 1,
    fastPaced: profile.hasStartup ? 4 : 1,
    communication: profile.profileStrength >= 50 ? 3 : 1,
  };
  const max = Math.max(1, ...Object.values(totals));
  return Object.entries(TRAIT_LABELS).map(([id, label]) => ({
    id,
    label,
    score: Math.min(100, Math.round(((totals[id] ?? 0) / max) * 100)),
  }));
}

export function buildSimulations(baseScore: number, roleTitle: string): SimulationAction[] {
  const t = roleTitle.toLowerCase();
  const actions: Omit<SimulationAction, 'projectedScore' | 'baseScore'>[] = [
    {
      id: 'internship',
      label: 'Complete a summer internship',
      description: 'Adds professional experience signal',
      deltaPercent: t.includes('bank') || t.includes('consult') ? 12 : 8,
    },
    {
      id: 'grades',
      label: 'Improve semester average by 1 point',
      description: 'Strengthens academic performance factor',
      deltaPercent: 5,
    },
    {
      id: 'cert',
      label: 'Earn a relevant certification',
      description: 'Closes a technical skills gap',
      deltaPercent: t.includes('data') || t.includes('finance') ? 10 : 6,
    },
    {
      id: 'network',
      label: 'Attend a networking event',
      description: 'Boosts visibility and networking score',
      deltaPercent: 4,
    },
    {
      id: 'startup',
      label: 'Join Startup Hub activity',
      description: 'Entrepreneurial and leadership signals',
      deltaPercent: t.includes('founder') || t.includes('product') ? 8 : 5,
    },
    {
      id: 'leadership',
      label: 'Lead a team project',
      description: 'Demonstrates leadership and delivery',
      deltaPercent: 7,
    },
  ];
  return actions.map((a) => ({
    ...a,
    baseScore,
    projectedScore: Math.min(99, baseScore + a.deltaPercent),
  }));
}

export function peersInsight(topRoles: string[]): string {
  if (topRoles.length === 0) {
    return 'Students building strong academic and profile signals often explore Product and Consulting paths first.';
  }
  if (topRoles.length === 1) {
    return `Students with similar profiles often pursue ${topRoles[0]} roles while strengthening internships and certifications.`;
  }
  return `Students with similar profiles often pursue ${topRoles.slice(0, 2).join(' and ')} roles.`;
}

export function bestNextStep(
  result: CompatibilityResult,
  breakdown: BreakdownCategory[]
): string {
  const weakest = [...breakdown].sort((a, b) => a.score - b.score)[0];
  const topMissing = result.missingSkills[0];
  if (topMissing) {
    return `Most impactful next action: develop ${topMissing.name} — could unlock up to ${Math.min(15, Math.round(topMissing.importance / 10))}% compatibility gain.`;
  }
  if (weakest && weakest.score < 50) {
    return `Most impactful next action: strengthen ${weakest.label.toLowerCase()} (currently ${weakest.score}%).`;
  }
  return 'Most impactful next action: complete an internship or leadership project to push compatibility into the next tier.';
}

export function whyScoreLines(
  result: CompatibilityResult,
  breakdown: BreakdownCategory[]
): string[] {
  const lines = [...result.whyMatches];
  const strong = breakdown.filter((b) => b.status === 'strong').slice(0, 2);
  for (const s of strong) {
    lines.push(`Strong ${s.label.toLowerCase()} (${s.score}%) supports this score.`);
  }
  for (const m of result.missingSkills.slice(0, 2)) {
    lines.push(`Low ${m.name} currently reduces this compatibility.`);
  }
  return [...new Set(lines)].slice(0, 5);
}
