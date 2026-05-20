import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import type { BreakdownCategory } from '@/lib/career/compatibility-intelligence';
import type { CareerPathCard, CareerPathsHub } from '@/lib/student/student-career-paths';
import type { CompatibilityHub, CompatibilityScoreItem } from '@/lib/student/student-compatibility-hub';

export type MentorInsightType =
  | 'progress'
  | 'compatibility'
  | 'priority'
  | 'weakness'
  | 'motivation'
  | 'alert';

export interface MentorInsight {
  id: string;
  type: MentorInsightType;
  text: string;
  href?: string;
}

export interface MentorDashboard {
  strongestArea: string;
  biggestWeakness: string;
  growthTrend: 'rising' | 'stable' | 'declining';
  recommendedFocus: string;
  employabilityTrend: { label: string; value: number }[];
  overallScore: number;
  employabilityScore: number;
}

export interface StrategyRecommendation {
  id: string;
  category: 'internship' | 'networking' | 'certification' | 'project' | 'startup' | 'event' | 'skill';
  title: string;
  description: string;
  impact: string;
  href: string;
}

export interface WeaknessItem {
  id: string;
  area: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  href: string;
}

export interface ForecastItem {
  id: string;
  scenario: string;
  projectedOutcome: string;
  impactPercent?: number;
}

export interface TimelineGoal {
  id: string;
  period: string;
  items: { text: string; done?: boolean; href?: string }[];
}

export interface BehavioralTrait {
  trait: string;
  score: number;
  insight: string;
}

function coursePercentile(profile: StudentCareerProfile): number {
  let score = profile.profileStrength * 0.35 + profile.employabilityScore * 0.35;
  if (profile.gradeAverage != null) score += (profile.gradeAverage / 20) * 100 * 0.2;
  if (profile.attendanceAverage != null) score += profile.attendanceAverage * 0.1;
  return Math.min(95, Math.max(35, Math.round(score * 0.85)));
}

function growthTrend(
  evolution: { label: string; value: number }[]
): 'rising' | 'stable' | 'declining' {
  if (evolution.length < 2) return 'stable';
  const recent = evolution.slice(-3);
  const first = recent[0]!.value;
  const last = recent[recent.length - 1]!.value;
  if (last - first >= 3) return 'rising';
  if (first - last >= 3) return 'declining';
  return 'stable';
}

function primaryBreakdown(
  compat: CompatibilityHub,
  paths: CareerPathsHub
): BreakdownCategory[] {
  const selected = compat.scores[0];
  if (selected?.breakdown.length) return selected.breakdown as BreakdownCategory[];
  const best = paths.bestFit;
  if (!best) return [];
  return [
    { id: 'academic', label: 'Academic Performance', score: 50, status: 'moderate' },
    { id: 'experience', label: 'Experience', score: 40, status: 'gap' },
    { id: 'profile', label: 'Profile Strength', score: 50, status: 'moderate' },
  ];
}

export function buildMentorDashboard(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): MentorDashboard {
  const breakdown = primaryBreakdown(compat, paths);
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const trend = growthTrend(compat.evolution.map((e) => ({ label: e.label, value: e.overall })));

  const employabilityTrend =
    compat.evolution.length > 1
      ? compat.evolution.map((e) => ({ label: e.label, value: e.employability }))
      : [{ label: 'Now', value: profile.employabilityScore }];

  let recommendedFocus = 'Maintain academic consistency and profile depth';
  if (weakest && weakest.score < 55) {
    recommendedFocus = `Prioritize ${weakest.label.toLowerCase()} this month`;
  } else if (paths.bestFit?.missingSkills[0]) {
    recommendedFocus = `Develop ${paths.bestFit.missingSkills[0].name} for your primary path`;
  } else if (profile.profileStrength < 65) {
    recommendedFocus = 'Strengthen your CV and profile completeness';
  }

  return {
    strongestArea: strongest ? `${strongest.label} (${strongest.score}%)` : 'Building foundation',
    biggestWeakness: weakest ? `${weakest.label} (${weakest.score}%)` : 'Gathering data',
    growthTrend: trend,
    recommendedFocus,
    employabilityTrend,
    overallScore: compat.overallScore,
    employabilityScore: profile.employabilityScore,
  };
}

export function buildDailyGuidance(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): MentorInsight[] {
  const insights: MentorInsight[] = [];
  const percentile = coursePercentile(profile);

  insights.push({
    id: 'percentile',
    type: 'progress',
    text: `You are progressing faster than ${percentile}% of students in your course.`,
    href: '/student/academics/gradebook',
  });

  const topDelta = compat.liveDeltas[0];
  if (topDelta) {
    insights.push({
      id: 'compat-delta',
      type: 'compatibility',
      text: `Your ${topDelta.label} compatibility ${topDelta.delta > 0 ? 'improved' : 'shifted'} by ${Math.abs(topDelta.delta)}% recently.`,
      href: '/student/career/compatibility',
    });
  }

  const primary = compat.primaryGoal ?? paths.targets.find((t) => t.isPrimary);
  if (primary) {
    const role = 'roleTitle' in primary ? primary.roleTitle : primary;
    insights.push({
      id: 'goal-focus',
      type: 'priority',
      text: `Your ${role} path is at ${'compatibility' in primary ? primary.compatibility : paths.bestFit?.compatibility ?? compat.overallScore}% — stay focused on closing skill gaps.`,
      href: '/student/career/paths',
    });
  }

  if (profile.profileStrength < 60) {
    insights.push({
      id: 'cv-weak',
      type: 'weakness',
      text: 'Your CV is currently the biggest weakness in your career profile — recruiters weight this heavily.',
      href: '/student/profile',
    });
  }

  if (profile.hasStartup) {
    insights.push({
      id: 'startup-signal',
      type: 'motivation',
      text: 'Your startup activity is a strong entrepreneurial signal — keep documenting milestones.',
      href: '/student/startup',
    });
  }

  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 85) {
    insights.push({
      id: 'consistency',
      type: 'motivation',
      text: 'Your assignment consistency has been excellent recently — discipline is a competitive advantage.',
      href: '/student/academics/assignments',
    });
  }

  const breakdown = primaryBreakdown(compat, paths);
  const leadership = breakdown.find((b) => /leadership/i.test(b.label));
  if (leadership && leadership.score < 55) {
    insights.push({
      id: 'leadership-priority',
      type: 'priority',
      text: 'You should prioritize leadership activities this month to unlock higher-tier paths.',
      href: '/student/startup',
    });
  }

  return insights.slice(0, 6);
}

export function buildWeaknesses(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): WeaknessItem[] {
  const items: WeaknessItem[] = [];

  if (profile.profileStrength < 65) {
    items.push({
      id: 'profile',
      area: 'Profile & CV',
      severity: profile.profileStrength < 45 ? 'high' : 'medium',
      message: 'Your profile completeness is below top-performing students — this limits recruiter visibility.',
      href: '/student/profile',
    });
  }

  if (profile.attendanceAverage != null && profile.attendanceAverage < 75) {
    items.push({
      id: 'attendance',
      area: 'Attendance',
      severity: profile.attendanceAverage < 60 ? 'high' : 'medium',
      message: 'Your attendance trend may reduce your compatibility growth and academic standing.',
      href: '/student/academics/attendance',
    });
  }

  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate < 70) {
    items.push({
      id: 'assignments',
      area: 'Assignment consistency',
      severity: 'medium',
      message: 'Incomplete assignments signal inconsistency — top candidates maintain strong delivery habits.',
      href: '/student/academics/assignments',
    });
  }

  const engagement = profile.engagementScore;
  if (engagement < 50) {
    items.push({
      id: 'networking',
      area: 'Platform engagement',
      severity: 'medium',
      message: 'Your networking and platform activity is significantly below top-performing students.',
      href: '/student/career/compatibility',
    });
  }

  const best = paths.bestFit;
  for (const skill of best?.missingSkills.slice(0, 2) ?? []) {
    items.push({
      id: `skill-${skill.name}`,
      area: skill.name,
      severity: skill.gapPercent > 40 ? 'high' : 'medium',
      message: `Missing ${skill.name} creates a ${skill.gapPercent}% gap on your ${best?.roleTitle ?? 'target'} path.`,
      href: '/student/academics/resources',
    });
  }

  if (!profile.hasStartup && paths.bestFit?.roleTitle.toLowerCase().includes('founder')) {
    items.push({
      id: 'startup-gap',
      area: 'Startup experience',
      severity: 'high',
      message: 'Founder paths require startup participation — explore Startup Hub to build this signal.',
      href: '/student/startup',
    });
  }

  return items.slice(0, 5);
}

export function buildMotivations(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): MentorInsight[] {
  const items: MentorInsight[] = [];

  for (const d of compat.liveDeltas.filter((x) => x.delta > 0).slice(0, 2)) {
    items.push({
      id: `mot-${d.label}`,
      type: 'motivation',
      text: `You improved your ${d.label} compatibility by ${d.delta}% recently — momentum matters.`,
      href: '/student/career/compatibility',
    });
  }

  if (compat.evolution.length >= 2) {
    const first = compat.evolution[0]!.overall;
    const last = compat.evolution[compat.evolution.length - 1]!.overall;
    const monthDelta = last - first;
    if (monthDelta >= 3 && paths.bestFit) {
      items.push({
        id: 'month-growth',
        type: 'motivation',
        text: `You improved your ${paths.bestFit.roleTitle} trajectory by ${monthDelta}% over recent weeks.`,
        href: '/student/career/compatibility',
      });
    }
  }

  const breakdown = primaryBreakdown(compat, paths);
  const strong = breakdown.filter((b) => b.status === 'strong');
  if (strong.length > 0) {
    items.push({
      id: 'strength',
      type: 'motivation',
      text: `You are building a strong ${strong[0]!.label.toLowerCase()} profile — leverage this in applications.`,
    });
  }

  if (profile.gradeAverage != null && profile.gradeAverage >= 14) {
    items.push({
      id: 'grades',
      type: 'motivation',
      text: 'Your academic performance places you among competitive candidates for selective internships.',
      href: '/student/academics/gradebook',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'start',
      type: 'motivation',
      text: 'Every action inside UniBridge shapes your future — start with one high-impact step today.',
      href: '/student/career/paths',
    });
  }

  return items.slice(0, 4);
}

export function buildForecasts(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): ForecastItem[] {
  const forecasts: ForecastItem[] = [];
  const primary =
    paths.targets.find((t) => t.isPrimary) ??
    (paths.bestFit
      ? {
          roleTitle: paths.bestFit.roleTitle,
          compatibility: paths.bestFit.compatibility,
        }
      : null);

  if (primary) {
    const role = primary.roleTitle;
    const base = primary.compatibility;
    const t = role.toLowerCase();

    if (t.includes('bank') || t.includes('finance') || t.includes('investment')) {
      forecasts.push({
        id: 'finance-intern',
        scenario: 'Complete a Finance internship this summer',
        projectedOutcome: `Investment Banking compatibility could reach ${Math.min(99, base + 12)}%`,
        impactPercent: 12,
      });
    }

    if (t.includes('consult')) {
      forecasts.push({
        id: 'consult-grades',
        scenario: 'Maintain this academic performance through the semester',
        projectedOutcome: 'You would be among top candidates for consulting internships',
      });
    }

    const sim = compat.simulations[0];
    if (sim) {
      forecasts.push({
        id: sim.id,
        scenario: sim.label,
        projectedOutcome: `${role} compatibility: ${sim.baseScore}% → ${sim.projectedScore}%`,
        impactPercent: sim.deltaPercent,
      });
    }
  }

  if (profile.hasStartup && profile.startupReadiness != null) {
    forecasts.push({
      id: 'startup-traction',
      scenario: 'Continue startup milestones and team growth',
      projectedOutcome: `Founder readiness could reach ${Math.min(99, (profile.startupReadiness ?? 0) + 15)}%`,
      impactPercent: 15,
    });
  }

  if (forecasts.length === 0 && paths.bestFit) {
    forecasts.push({
      id: 'default-intern',
      scenario: 'Add a summer internship to your profile',
      projectedOutcome: `${paths.bestFit.roleTitle} compatibility could reach ${Math.min(99, paths.bestFit.compatibility + 8)}%`,
      impactPercent: 8,
    });
  }

  return forecasts.slice(0, 4);
}

export function buildStrategyRecommendations(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): StrategyRecommendation[] {
  const recs: StrategyRecommendation[] = [];

  if (compat.opportunities.length > 0) {
    const o = compat.opportunities[0]!;
    recs.push({
      id: `opp-${o.id}`,
      category: o.type === 'internship' ? 'internship' : 'event',
      title: o.title,
      description: o.subtitle ?? 'Matched to your profile and goals',
      impact: `${o.compatibility}% compatibility fit`,
      href: o.href,
    });
  }

  if (!profile.hasStartup) {
    recs.push({
      id: 'startup-hub',
      category: 'startup',
      title: 'Join Startup Hub',
      description: 'Build entrepreneurial signals through ventures or co-founder roles',
      impact: '+5–8% on Founder and Product paths',
      href: '/student/startup',
    });
  }

  const missing = paths.bestFit?.missingSkills[0];
  if (missing) {
    const isCert = /excel|sql|python|certification|data/i.test(missing.name);
    recs.push({
      id: `skill-${missing.name}`,
      category: isCert ? 'certification' : 'skill',
      title: isCert ? `Earn ${missing.name} certification` : `Develop ${missing.name}`,
      description: `Closes a ${missing.gapPercent}% gap on your primary path`,
      impact: `+${Math.min(12, Math.round(missing.importance / 10))}% compatibility potential`,
      href: '/student/academics/resources',
    });
  }

  recs.push({
    id: 'networking',
    category: 'networking',
    title: 'Attend a networking event',
    description: 'Expand visibility with companies and alumni in your target industry',
    impact: '+4% networking score',
    href: '/student/career/compatibility',
  });

  recs.push({
    id: 'leadership-project',
    category: 'project',
    title: 'Lead a team project',
    description: 'Demonstrate delivery and leadership to recruiters',
    impact: '+7% leadership compatibility',
    href: '/student/academics/assignments',
  });

  if (profile.profileStrength < 75) {
    recs.push({
      id: 'cv-update',
      category: 'skill',
      title: 'Update and optimize your CV',
      description: 'Profile completeness directly affects employability scoring',
      impact: '+4–6% employability',
      href: '/student/profile',
    });
  }

  return recs.slice(0, 6);
}

export function buildBestNextStep(
  profile: StudentCareerProfile,
  compat: CompatibilityHub,
  paths: CareerPathsHub
): string {
  if (compat.bestNextStep && !compat.bestNextStep.includes('micro-quiz')) {
    return compat.bestNextStep.replace('Most impactful next action:', 'Best next step:');
  }

  const best = paths.bestFit;
  if (!best) {
    return 'Best next step: complete your profile and set a primary career goal on Career Paths.';
  }

  const missing = best.missingSkills[0];
  if (missing) {
    const gain = Math.min(12, Math.round(missing.importance / 10));
    if (/excel|finance/i.test(missing.name)) {
      return `Best next step: improving ${missing.name} could increase ${best.roleTitle} compatibility by ${gain}%.`;
    }
    return `Best next step: develop ${missing.name} to strengthen your ${best.roleTitle} path.`;
  }

  if (!profile.hasStartup && best.roleTitle.toLowerCase().includes('founder')) {
    return 'Best next step: joining Startup Hub would significantly strengthen your Founder profile.';
  }

  if (compat.opportunities.some((o) => o.type === 'internship')) {
    return 'Best next step: apply for a summer internship matched to your profile.';
  }

  const milestone = best.milestones.find((m) => !m.done);
  if (milestone) {
    return `Best next step: ${milestone.text}`;
  }

  return 'Best next step: maintain grades and complete a leadership project this semester.';
}

export function buildTimeline(
  profile: StudentCareerProfile,
  paths: CareerPathsHub
): TimelineGoal[] {
  const best = paths.bestFit;
  const missing = best?.missingSkills.slice(0, 2).map((s) => s.name) ?? [];

  const semester: TimelineGoal = {
    id: 'semester',
    period: 'This semester',
    items: [
      {
        text: missing[0] ? `Improve ${missing[0]}` : 'Maintain grade average above 13',
        href: '/student/academics/gradebook',
      },
      {
        text: 'Join a networking event or career workshop',
        href: '/student/career/compatibility',
      },
      {
        text: profile.profileStrength < 70 ? 'Build and optimize CV' : 'Update profile with recent achievements',
        done: profile.profileStrength >= 80,
        href: '/student/profile',
      },
      {
        text: 'Complete a leadership or team project',
        href: '/student/academics/assignments',
      },
    ],
  };

  const summer: TimelineGoal = {
    id: 'summer',
    period: 'Next summer',
    items: [
      { text: 'Apply for internships aligned with your primary goal', href: '/student/career/internships' },
      { text: 'Target 2–3 dream companies from Compatibility Engine', href: '/student/career/compatibility' },
      ...(profile.hasStartup
        ? [{ text: 'Scale startup traction metrics', href: '/student/startup' }]
        : [{ text: 'Explore Startup Hub for co-founder opportunities', href: '/student/startup/discover' }]),
    ],
  };

  const year: TimelineGoal = {
    id: 'year',
    period: 'This year',
    items: [
      {
        text: best ? `Reach 85%+ on ${best.roleTitle} compatibility` : 'Set and track a primary career goal',
        href: '/student/career/paths',
      },
      {
        text: missing[1] ? `Acquire ${missing[1]} certification or project proof` : 'Earn one industry-relevant certification',
        href: '/student/academics/resources',
      },
      {
        text: 'Build consistent employability score above 75%',
        done: profile.employabilityScore >= 75,
        href: '/student/profile',
      },
    ],
  };

  return [semester, summer, year];
}

export function buildBehavioralProfile(profile: StudentCareerProfile): BehavioralTrait[] {
  const traits: BehavioralTrait[] = [];

  const discipline = Math.round(
    ((profile.assignmentCompletionRate ?? 50) * 0.5 +
      (profile.attendanceAverage ?? 50) * 0.5)
  );
  traits.push({
    trait: 'Discipline',
    score: discipline,
    insight:
      discipline >= 75
        ? 'Strong consistency in attendance and deliverables'
        : 'Room to improve assignment and attendance habits',
  });

  const ambition = Math.round(
    profile.employabilityScore * 0.4 +
      (profile.hasStartup ? 30 : 0) +
      (profile.gradeAverage != null && profile.gradeAverage >= 14 ? 20 : 10)
  );
  traits.push({
    trait: 'Ambition',
    score: Math.min(100, ambition),
    insight: profile.hasStartup ? 'Entrepreneurial drive detected' : 'Academic and career focus building',
  });

  const leadership = Math.round(
    (profile.hasStartup ? 40 : 0) +
      profile.engagementScore * 0.35 +
      (profile.profileStrength > 60 ? 15 : 0)
  );
  traits.push({
    trait: 'Leadership',
    score: Math.min(100, leadership),
    insight: leadership >= 60 ? 'Emerging leadership signals' : 'Leadership opportunities available via projects',
  });

  const analytical = Math.round(
    (profile.gradeAverage != null ? (profile.gradeAverage / 20) * 100 * 0.5 : 25) +
      profile.profileStrength * 0.2
  );
  traits.push({
    trait: 'Analytical thinking',
    score: Math.min(100, analytical),
    insight: 'Inferred from grades, subjects, and profile depth',
  });

  const creativity = Math.round(
    (profile.hasStartup ? 35 : 10) + profile.engagementScore * 0.25
  );
  traits.push({
    trait: 'Creativity',
    score: Math.min(100, creativity),
    insight: profile.hasStartup ? 'Startup builder mindset active' : 'Explore projects to express creative strengths',
  });

  return traits;
}

export function buildOpportunityFeed(compat: CompatibilityHub): CompatibilityScoreItem[] {
  return compat.opportunities.slice(0, 6);
}

export const MENTOR_CONVERSATION_STARTERS = [
  'What should I improve for Product Management?',
  'Am I competitive for consulting?',
  'Which internships fit my profile?',
  'Should I focus more on networking or projects?',
  'What is my best next step this month?',
];

export function runMentorConversation(
  prompt: string,
  profile: StudentCareerProfile,
  paths: CareerPathsHub,
  compat: CompatibilityHub
): string {
  const lower = prompt.toLowerCase();
  const best = paths.bestFit;
  const primary = paths.targets.find((t) => t.isPrimary) ?? best;

  if (lower.includes('product') && (lower.includes('improve') || lower.includes('what'))) {
    const pm = compat.scores.find((s) => /product/i.test(s.title));
    const score = pm?.compatibility ?? best?.compatibility ?? compat.overallScore;
    const gaps = pm?.missingRequirements.slice(0, 2).map((m) => m.name).join(', ') ?? 'leadership projects and communication skills';
    return `For Product Management (${score}% compatibility), prioritize: ${gaps}. User empathy, cross-functional communication, and shipping projects matter most. Consider Startup Hub or a product internship to accelerate.`;
  }

  if (lower.includes('consult') && (lower.includes('competitive') || lower.includes('am i'))) {
    const consult = compat.scores.find((s) => /consult/i.test(s.title));
    const score = consult?.compatibility ?? 0;
    const competitive = score >= 70;
    return competitive
      ? `Yes — at ${score}% consulting compatibility you are competitive for internship pipelines. Maintain grades above 14 and add case-interview prep plus one leadership project.`
      : `At ${score || 'current'}% consulting compatibility, you are building toward competitiveness. Focus on analytical skills, Excel, and structured problem-solving. A summer internship could add 8–12%.`;
  }

  if (lower.includes('intern')) {
    const matches = compat.opportunities.filter((o) => o.type === 'internship').slice(0, 3);
    if (matches.length === 0) {
      return paths.hasCompanyPaths
        ? 'No published internships yet — check Opportunities as companies activate roles. Meanwhile, strengthen profile and compatibility scores.'
        : 'Internships appear when partner companies publish roles. Your profile-based paths suggest focusing on skills gaps first — see Compatibility Engine for matches.';
    }
    return `Top internship matches: ${matches.map((m) => `${m.title} (${m.compatibility}%)`).join(', ')}. Apply to the highest-fit role and tailor your CV to its requirements.`;
  }

  if (lower.includes('network') && lower.includes('project')) {
    const breakdown = primaryBreakdown(compat, paths);
    const net = breakdown.find((b) => /network/i.test(b.label));
    const exp = breakdown.find((b) => /experience/i.test(b.label));
    const netScore = net?.score ?? 40;
    const expScore = exp?.score ?? 40;
    if (netScore < expScore) {
      return `Networking (${netScore}%) is your weaker area vs experience (${expScore}%). Prioritize one networking event this month, then balance with a team project for leadership proof.`;
    }
    return `Projects (${expScore}%) need attention relative to networking (${netScore}%). Lead a deliverable this semester, then convert connections into internship referrals.`;
  }

  if (lower.includes('next step') || lower.includes('focus') || lower.includes('priorit')) {
    return buildBestNextStep(profile, compat, paths);
  }

  if (lower.includes('weak') || lower.includes('gap')) {
    const weaknesses = buildWeaknesses(profile, compat, paths);
    if (weaknesses.length === 0) return 'No critical gaps detected — keep executing on your timeline and monitor Compatibility Engine for shifts.';
    return weaknesses.map((w) => w.message).join(' ');
  }

  if (lower.includes('founder') || lower.includes('startup')) {
    const founder = compat.scores.find((s) => /founder|startup/i.test(s.title));
    return founder
      ? `Startup Founder compatibility: ${founder.compatibility}%. ${profile.hasStartup ? 'Your active venture strengthens this path — document traction and team growth.' : 'Join Startup Hub or a co-founder role to build entrepreneurial proof.'}`
      : 'Explore Startup Hub to build founder signals. Compatibility scores update as you participate.';
  }

  if (lower.includes('salary') || lower.includes('income')) {
    const top = [...paths.paths].sort((a, b) => (b.salaryTenYear ?? 0) - (a.salaryTenYear ?? 0))[0];
    if (!top?.salaryTenYear) return 'Salary projections refine as career paths and company data connect to your profile.';
    return `Highest projected path: ${top.roleTitle} (~€${top.salaryTenYear.toLocaleString()} at 10 years). Current compatibility: ${top.compatibility}%. Align goals on Career Paths to optimize toward this.`;
  }

  if (primary) {
    return `Your primary focus is ${primary.roleTitle} (${primary.compatibility}% compatibility). ${compat.bestNextStep.replace('Most impactful next action:', 'I recommend:')} Ask about internships, weaknesses, or scenario forecasts anytime.`;
  }

  return 'Set a primary career goal on Career Paths — I will adapt guidance around your ambitions, compatibility scores, and profile evolution.';
}
