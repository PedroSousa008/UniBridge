import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type EmployabilityRange = '1m' | '6m' | '1y' | 'all';

export interface EmployabilityMilestone {
  id: string;
  date: string;
  label: string;
  impact: number;
  description: string;
  category: string;
  href: string | null;
}

export interface EmployabilityPoint {
  date: string;
  value: number;
  projected?: boolean;
  milestones: EmployabilityMilestone[];
}

export interface EmployabilityDriver {
  id: string;
  label: string;
  impact: number;
  href: string | null;
}

export interface IndustryEmployability {
  industry: string;
  score: number;
}

export interface EmployabilityHubComputed {
  score: number;
  trend: 'up' | 'down' | 'stable';
  monthDelta: number | null;
  semesterLabel: string;
  evolution: EmployabilityPoint[];
  projection: { months: number; targetScore: number; message: string };
  milestones: EmployabilityMilestone[];
  increasedBy: EmployabilityDriver[];
  limiting: EmployabilityDriver[];
  industries: IndustryEmployability[];
  insights: string[];
  peerBenchmark: string;
  nextAction: { title: string; reason: string; href: string };
}

export function computeLiveEmployabilityScore(input: {
  profile: StudentCareerProfile;
  verifiedSkillsCount: number;
  cvCompleteness: number;
  applicationsCount: number;
  interviewsCount: number;
  acceptedInternship: boolean;
  pathsAvgCompatibility: number;
  engagementBonus: number;
}): number {
  const { profile } = input;
  let score = 38;
  score += profile.profileStrength * 0.2;
  score += profile.employabilityScore * 0.12;
  score += (profile.gradeAverage ?? 11) * 2.2;
  score += (profile.attendanceAverage ?? 70) * 0.06;
  score += (profile.assignmentCompletionRate ?? 50) * 0.1;
  if (profile.hasStartup) score += (profile.startupReadiness ?? 50) * 0.18;
  score += Math.min(12, input.verifiedSkillsCount * 1.2);
  score += input.cvCompleteness * 0.12;
  score += Math.min(15, input.applicationsCount * 2.5);
  score += input.interviewsCount * 4;
  if (input.acceptedInternship) score += 8;
  score += input.pathsAvgCompatibility * 0.08;
  score += input.engagementBonus;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function rangeStart(range: EmployabilityRange): number | null {
  const now = Date.now();
  if (range === '1m') return now - 30 * 86400000;
  if (range === '6m') return now - 183 * 86400000;
  if (range === '1y') return now - 365 * 86400000;
  return null;
}

export function buildMilestonesFromEcosystem(input: {
  profile: StudentCareerProfile;
  applications: { title: string; companyName: string; status: string; appliedAt: Date | null }[];
  hasStartup: boolean;
  startupName: string | null;
  cvCompleteness: number;
  verifiedSkillsCount: number;
  primaryPath: string | null;
}): EmployabilityMilestone[] {
  const items: EmployabilityMilestone[] = [];
  const now = new Date();

  if (input.profile.gradeAverage != null && input.profile.gradeAverage >= 14) {
    items.push({
      id: 'gpa',
      date: new Date(now.getTime() - 120 * 86400000).toISOString(),
      label: 'Strong academic performance',
      impact: 5,
      description: `Grade average ${input.profile.gradeAverage.toFixed(1)} verified through university gradebook.`,
      category: 'academics',
      href: '/student/academics/gradebook',
    });
  }

  for (const app of input.applications) {
    const d = app.appliedAt ?? now;
    if (['applied', 'under_review', 'interviewing', 'interview', 'final_interview'].includes(app.status)) {
      items.push({
        id: `app-${app.title}`,
        date: d.toISOString(),
        label: `Applied · ${app.title}`,
        impact: 4,
        description: `Application to ${app.companyName} signals active career momentum.`,
        category: 'internship',
        href: '/student/career/opportunities',
      });
    }
    if (['accepted', 'completed', 'offer_received', 'offer'].includes(app.status)) {
      items.push({
        id: `int-${app.title}`,
        date: d.toISOString(),
        label: 'Internship milestone',
        impact: 8,
        description: `Progress with ${app.companyName} — high employability signal.`,
        category: 'internship',
        href: '/student/career/opportunities',
      });
    }
  }

  if (input.hasStartup) {
    items.push({
      id: 'startup',
      date: new Date(now.getTime() - 60 * 86400000).toISOString(),
      label: 'Startup launched',
      impact: 7,
      description: input.startupName
        ? `Founder activity on ${input.startupName} in Startup Hub.`
        : 'Active venture in Startup Hub.',
      category: 'startup',
      href: '/student/startup',
    });
  }

  if (input.cvCompleteness >= 65) {
    items.push({
      id: 'cv',
      date: new Date(now.getTime() - 45 * 86400000).toISOString(),
      label: 'CV strengthened',
      impact: 3,
      description: 'Verified CV depth improved recruiter readiness.',
      category: 'cv',
      href: '/student/career/cv',
    });
  }

  if (input.verifiedSkillsCount >= 4) {
    items.push({
      id: 'skills',
      date: new Date(now.getTime() - 30 * 86400000).toISOString(),
      label: 'Verified skills unlocked',
      impact: 4,
      description: `${input.verifiedSkillsCount} ecosystem-verified skills active.`,
      category: 'skills',
      href: '/student/career/skills',
    });
  }

  if (input.primaryPath) {
    items.push({
      id: 'path',
      date: new Date(now.getTime() - 90 * 86400000).toISOString(),
      label: 'Career path aligned',
      impact: 2,
      description: `Primary direction: ${input.primaryPath}.`,
      category: 'career',
      href: '/student/career/paths',
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function synthesizeHistory(
  currentScore: number,
  milestones: EmployabilityMilestone[],
  snapshots: { capturedAt: Date; employabilityScore: number }[],
  range: EmployabilityRange
): EmployabilityPoint[] {
  const start = rangeStart(range);
  const points: EmployabilityPoint[] = [];

  for (const s of snapshots) {
    if (start && s.capturedAt.getTime() < start) continue;
    points.push({
      date: s.capturedAt.toISOString(),
      value: s.employabilityScore,
      milestones: [],
    });
  }

  if (points.length === 0) {
    const monthsBack = range === '1m' ? 1 : range === '6m' ? 6 : range === '1y' ? 12 : 18;
    for (let i = monthsBack; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const drift = Math.round((currentScore - 52) * (1 - i / (monthsBack + 1)));
      const value = Math.min(99, Math.max(42, 52 + drift));
      points.push({ date: d.toISOString(), value, milestones: [] });
    }
  }

  const last = points[points.length - 1];
  if (last) last.value = currentScore;
  else points.push({ date: new Date().toISOString(), value: currentScore, milestones: [] });

  for (const m of milestones) {
    const t = new Date(m.date).getTime();
    let bestIdx = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(new Date(p.date).getTime() - t);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    points[bestIdx]!.milestones.push(m);
    points[bestIdx]!.value = Math.min(100, points[bestIdx]!.value + Math.round(m.impact * 0.4));
  }

  return points;
}

export function appendProjection(
  evolution: EmployabilityPoint[],
  currentScore: number,
  monthlyVelocity: number
): EmployabilityPoint[] {
  const copy = [...evolution];
  const lastDate = new Date(copy[copy.length - 1]?.date ?? Date.now());
  const target = Math.min(99, currentScore + Math.max(4, monthlyVelocity) * 12);
  for (let m = 1; m <= 4; m++) {
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + m * 3);
    const value = Math.round(currentScore + ((target - currentScore) * m) / 4);
    copy.push({
      date: d.toISOString(),
      value,
      projected: true,
      milestones: [],
    });
  }
  return copy;
}

export function buildIncreasedBy(
  milestones: EmployabilityMilestone[],
  profile: StudentCareerProfile
): EmployabilityDriver[] {
  const drivers: EmployabilityDriver[] = milestones
    .filter((m) => m.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      label: m.label,
      impact: m.impact,
      href: m.href,
    }));

  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 80) {
    drivers.push({
      id: 'delivery',
      label: 'Consistent assignment delivery',
      impact: 3,
      href: '/student/academics/assignments',
    });
  }
  return drivers.slice(0, 6);
}

export function buildLimitingFactors(
  profile: StudentCareerProfile,
  applicationsCount: number,
  networkingScore: number
): EmployabilityDriver[] {
  const items: EmployabilityDriver[] = [];
  if (applicationsCount === 0) {
    items.push({
      id: 'no-intern',
      label: 'No internship applications yet',
      impact: -8,
      href: '/student/career/internships',
    });
  }
  if (profile.profileStrength < 55) {
    items.push({
      id: 'profile',
      label: 'Profile depth below recruiter expectations',
      impact: -5,
      href: '/student/career/cv',
    });
  }
  if (networkingScore < 40) {
    items.push({
      id: 'network',
      label: 'Low networking & career engagement',
      impact: -4,
      href: '/student/career/opportunities',
    });
  }
  if (profile.gradeAverage != null && profile.gradeAverage < 12) {
    items.push({
      id: 'grades',
      label: 'Academic average constrains finance & consulting paths',
      impact: -4,
      href: '/student/academics/gradebook',
    });
  }
  if (items.length === 0) {
    items.push({
      id: 'maintain',
      label: 'Maintain momentum — next tier needs interview outcomes',
      impact: -2,
      href: '/student/career/mentor',
    });
  }
  return items.slice(0, 4);
}

export function buildIndustryBreakdown(
  paths: { roleTitle: string; industry: string | null; compatibility: number }[]
): IndustryEmployability[] {
  const map = new Map<string, number[]>();
  for (const p of paths) {
    const key =
      p.industry ??
      (p.roleTitle.toLowerCase().includes('consult')
        ? 'Consulting'
        : p.roleTitle.toLowerCase().includes('product')
          ? 'Product'
          : p.roleTitle.toLowerCase().includes('finance')
            ? 'Finance'
            : p.roleTitle.toLowerCase().includes('founder') || p.roleTitle.toLowerCase().includes('startup')
              ? 'Startups'
              : 'General');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p.compatibility);
  }
  return [...map.entries()]
    .map(([industry, scores]) => ({
      industry,
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function buildShortInsights(
  score: number,
  monthDelta: number | null,
  limiting: EmployabilityDriver[],
  profile: StudentCareerProfile
): string[] {
  const insights: string[] = [];
  if (monthDelta != null && monthDelta > 0) {
    insights.push(`Your employability is growing faster than average (+${monthDelta}% this month).`);
  } else if (monthDelta != null && monthDelta < 0) {
    insights.push(`A small dip this month — one focused action can reverse the trend quickly.`);
  } else {
    insights.push(`Employability is stable at ${score}% — consistent activity unlocks the next jump.`);
  }
  const topLimit = limiting[0];
  if (topLimit?.id === 'no-intern') {
    insights.push('Internship experience would currently have the highest impact.');
  } else if (!profile.hasStartup && score < 85) {
    insights.push('Verified skills and CV depth are your fastest levers right now.');
  } else {
    insights.push('Interview performance and networking are the next multiplier.');
  }
  return insights.slice(0, 2);
}

export function computeNextAction(
  limiting: EmployabilityDriver[],
  profile: StudentCareerProfile
): { title: string; reason: string; href: string } {
  const top = limiting[0];
  if (top?.id === 'no-intern') {
    return {
      title: 'Complete a summer internship application',
      reason: 'Internships are the single highest-impact employability signal for students at your stage.',
      href: '/student/career/internships',
    };
  }
  if (top?.id === 'profile' || profile.profileStrength < 60) {
    return {
      title: 'Optimize your verified CV',
      reason: 'Recruiter-ready profiles convert compatibility into interviews.',
      href: '/student/career/cv',
    };
  }
  if (!profile.hasStartup) {
    return {
      title: 'Join Startup Hub or a leadership project',
      reason: 'Entrepreneurial proof differentiates you in product and startup paths.',
      href: '/student/startup',
    };
  }
  return {
    title: 'Advance your top opportunity to interview stage',
    reason: 'Moving pipeline stages has outsized impact on employability momentum.',
    href: '/student/career/opportunities',
  };
}

export function peerBenchmarkText(score: number, courseAverage: number): string {
  const diff = score - courseAverage;
  if (diff >= 8) return `You are ${diff} points above similar profiles in your course — strong position.`;
  if (diff >= 0) return `You are slightly above the course average — keep building verified experience.`;
  return `You are ${Math.abs(diff)} points below the course average — focused internships close the gap quickly.`;
}

export function assembleEmployabilityHub(input: {
  profile: StudentCareerProfile;
  range: EmployabilityRange;
  snapshots: { capturedAt: Date; employabilityScore: number }[];
  paths: { roleTitle: string; industry: string | null; compatibility: number }[];
  applications: { title: string; companyName: string; status: string; appliedAt: Date | null }[];
  hasStartup: boolean;
  startupName: string | null;
  cvCompleteness: number;
  verifiedSkillsCount: number;
  primaryPath: string | null;
  engagementScore: number;
}): EmployabilityHubComputed {
  const pathsAvg =
    input.paths.length > 0
      ? input.paths.reduce((a, p) => a + p.compatibility, 0) / input.paths.length
      : input.profile.employabilityScore;

  const interviews = input.applications.filter((a) =>
    ['interviewing', 'interview', 'final_interview', 'offer_received', 'offer'].includes(a.status)
  ).length;
  const accepted = input.applications.some((a) => ['accepted', 'completed'].includes(a.status));

  const score = computeLiveEmployabilityScore({
    profile: input.profile,
    verifiedSkillsCount: input.verifiedSkillsCount,
    cvCompleteness: input.cvCompleteness,
    applicationsCount: input.applications.length,
    interviewsCount: interviews,
    acceptedInternship: accepted,
    pathsAvgCompatibility: pathsAvg,
    engagementBonus: Math.min(8, input.engagementScore * 0.08),
  });

  const monthAgo = Date.now() - 30 * 86400000;
  const snapMonth = input.snapshots.find((s) => s.capturedAt.getTime() <= monthAgo);
  const monthDelta =
    snapMonth != null ? score - snapMonth.employabilityScore : input.snapshots.length >= 2
      ? score - input.snapshots[0]!.employabilityScore
      : null;

  const trend: 'up' | 'down' | 'stable' =
    monthDelta == null ? 'stable' : monthDelta > 1 ? 'up' : monthDelta < -1 ? 'down' : 'stable';

  const milestones = buildMilestonesFromEcosystem({
    profile: input.profile,
    applications: input.applications,
    hasStartup: input.hasStartup,
    startupName: input.startupName,
    cvCompleteness: input.cvCompleteness,
    verifiedSkillsCount: input.verifiedSkillsCount,
    primaryPath: input.primaryPath,
  });

  let evolution = synthesizeHistory(score, milestones, input.snapshots, input.range);
  const velocity = monthDelta != null ? monthDelta : Math.max(2, Math.round((score - 50) / 12));
  evolution = appendProjection(evolution, score, velocity);

  const increasedBy = buildIncreasedBy(milestones, input.profile);
  const limiting = buildLimitingFactors(
    input.profile,
    input.applications.length,
    input.engagementScore
  );
  const industries = buildIndustryBreakdown(input.paths);
  const target12 = Math.min(99, score + velocity * 12);

  return {
    score,
    trend,
    monthDelta,
    semesterLabel:
      monthDelta != null && monthDelta >= 4 ? 'Strongest growth this semester' : 'Building momentum',
    evolution,
    projection: {
      months: 12,
      targetScore: target12,
      message: `If you maintain this trajectory, your employability could reach ${target12}% within 12 months.`,
    },
    milestones,
    increasedBy,
    limiting,
    industries,
    insights: buildShortInsights(score, monthDelta, limiting, input.profile),
    peerBenchmark: peerBenchmarkText(score, Math.min(85, Math.max(55, score - 6 + Math.round(pathsAvg * 0.05)))),
    nextAction: computeNextAction(limiting, input.profile),
  };
}
