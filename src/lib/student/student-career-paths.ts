import { prisma } from '@/lib/db';
import { computePathCompatibility, type StudentCareerProfile } from '@/lib/career/compatibility-engine';
import { scoreArchetypes } from '@/lib/career/career-archetypes';
import { computeStartupReadiness } from '@/lib/startups/readiness';
import { loadGradebookHub } from '@/lib/student/load-gradebook-hub';
import { loadStudentAttendanceHub } from '@/lib/student/student-attendance';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export interface CareerPathCard {
  id: string;
  roleTitle: string;
  companyName: string;
  industry: string | null;
  description: string | null;
  compatibility: number;
  monthlyTrend: number | null;
  isProfileInsight: boolean;
  isTarget: boolean;
  isPrimaryTarget: boolean;
  targetId: string | null;
  tags: string[];
  demandLevel: 'high' | 'medium' | 'low';
  growthTrend: 'rising' | 'stable' | 'emerging';
  pathDifficulty: 'accessible' | 'moderate' | 'challenging';
  salaryStarting: number | null;
  salaryFiveYear: number | null;
  salaryTenYear: number | null;
  salaryIsEstimate: boolean;
  salarySource: 'profile_estimate' | 'company' | 'company_average';
  salaryCompanyCount: number;
  profileInsightId: string | null;
  requiredSkills: string[];
  missingSkills: { name: string; gapPercent: number; importance: number }[];
  matchedSkills: { name: string; score: number; matched: boolean }[];
  whyMatches: string[];
  subjectConnections: { subjectName: string; message: string; contributionPercent: number }[];
  roadmapStages: {
    id: string;
    stage: string;
    status: 'done' | 'current' | 'upcoming';
    description: string;
    focus: string;
    href: string | null;
  }[];
  milestones: { id: string; text: string; done: boolean; href: string | null }[];
  simulation: {
    workStyle: string;
    stressLevel: string;
    remoteFlex: string;
    meetingLoad: string;
  };
  recommendedInternships: string[];
  href: string;
}

export interface CareerPathsHub {
  hasCompanyPaths: boolean;
  companyPathsAvailable: boolean;
  paths: CareerPathCard[];
  bestFit: CareerPathCard | null;
  targets: { id: string; roleTitle: string; companyName: string | null; compatibility: number; isPrimary: boolean }[];
  comparisonDefaults: string[];
  evolution: {
    compatibilityTrend: { label: string; value: number }[];
    employabilityTrend: { label: string; value: number }[];
  };
  subjectInsights: { subjectName: string; careers: string[]; message: string }[];
  alumniExamples: { roleTitle: string; companies: string[]; note: string }[];
  advisorContext: string;
  milestonesSummary: { done: number; total: number };
}

export async function buildStudentProfile(userId: string): Promise<StudentCareerProfile> {
  const [profile, startups, gradebook, attendanceHub, assignmentsHub, enrollments] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),
    prisma.startup.findMany({
      where: { founderId: userId },
      include: { members: true, media: true, milestones: true, tractionMetrics: true, openings: true },
      take: 1,
    }),
    loadGradebookHub(userId).catch(() => null),
    loadStudentAttendanceHub(userId).catch(() => null),
    loadStudentAssignmentsHub(userId).catch(() => ({ assignments: [], notifications: [], dbReady: false })),
    prisma.subjectEnrollment.findMany({
      where: { studentId: userId },
      include: { subject: { select: { id: true, name: true, status: true } } },
    }),
  ]);

  const activeEnrollments = enrollments.filter((e) => e.subject.status === 'ACTIVE');
  const subjects = activeEnrollments.map((e) => {
    const subjectRow = gradebook?.dashboard.subjects.find((s) => s.subjectId === e.subject.id);
    return {
      id: e.subject.id,
      name: e.subject.name,
      average: subjectRow?.currentGrade ?? null,
      attendance: subjectRow?.attendancePercent ?? e.attendance ?? null,
    };
  });

  const pending = assignmentsHub.assignments.filter((a) => !['SUBMITTED', 'GRADED'].includes(a.status));
  const total = assignmentsHub.assignments.length;
  const assignmentCompletionRate =
    total > 0 ? Math.round(((total - pending.length) / total) * 100) : null;

  const startupReadiness =
    startups.length > 0 ? computeStartupReadiness(startups[0]!).readinessScore : null;

  return {
    profileStrength: profile?.profileStrength ?? 0,
    employabilityScore: Math.round(profile?.employabilityScore ?? 0),
    engagementScore: Math.round(profile?.engagementScore ?? 0),
    gradeAverage: gradebook?.dashboard.semesterAverage ?? gradebook?.dashboard.overallGpa ?? null,
    attendanceAverage: attendanceHub?.overview.globalPercent ?? gradebook?.dashboard.attendanceAverage ?? null,
    subjects,
    hasStartup: startups.length > 0,
    startupReadiness,
    assignmentCompletionRate,
    inferredSkills: [],
  };
}

function pathToCard(
  path: {
    id: string;
    roleTitle: string;
    companyName: string;
    industry: string | null;
    description: string | null;
    recommendedSkills: string[];
    recommendedInternships: string[];
  },
  result: ReturnType<typeof computePathCompatibility>,
  opts: { isProfileInsight: boolean; targetId: string | null; isTarget: boolean; isPrimaryTarget: boolean; monthlyTrend: number | null }
): CareerPathCard {
  return {
    id: path.id,
    roleTitle: path.roleTitle,
    companyName: path.companyName,
    industry: path.industry,
    description: path.description,
    compatibility: result.compatibility,
    monthlyTrend: opts.monthlyTrend,
    isProfileInsight: opts.isProfileInsight,
    isTarget: opts.isTarget,
    isPrimaryTarget: opts.isPrimaryTarget,
    targetId: opts.targetId,
    tags: result.tags,
    demandLevel: result.demandLevel,
    growthTrend: result.growthTrend,
    pathDifficulty: result.pathDifficulty,
    salaryStarting: result.salaryProjection.starting,
    salaryFiveYear: result.salaryProjection.fiveYear,
    salaryTenYear: result.salaryProjection.tenYear,
    salaryIsEstimate: result.salaryProjection.isEstimate,
    salarySource: result.salaryProjection.source,
    salaryCompanyCount: result.salaryProjection.companyCount,
    profileInsightId: opts.isProfileInsight ? path.id : null,
    requiredSkills: path.recommendedSkills,
    missingSkills: result.missingSkills,
    matchedSkills: result.matchedSkills,
    whyMatches: result.whyMatches,
    subjectConnections: result.subjectConnections,
    roadmapStages: result.roadmapStages,
    milestones: result.milestones,
    simulation: result.simulation,
    recommendedInternships: path.recommendedInternships,
    href: opts.isProfileInsight ? '/student/career/paths' : '/student/career/paths',
  };
}

function computeRoleSalaryAverages(paths: { roleTitle: string; companyName: string; salaryMin: number | null; salaryMax: number | null }[]) {
  const byRole = new Map<string, { values: number[]; companies: Set<string> }>();
  for (const p of paths) {
    const key = p.roleTitle.toLowerCase().trim();
    if (!byRole.has(key)) byRole.set(key, { values: [], companies: new Set() });
    const group = byRole.get(key)!;
    if (p.salaryMin != null) group.values.push(p.salaryMin);
    if (p.salaryMax != null) group.values.push(p.salaryMax);
    group.companies.add(p.companyName);
  }
  const averages = new Map<string, { start: number | null; companyCount: number }>();
  for (const [key, group] of byRole) {
    const start =
      group.values.length > 0
        ? Math.round(group.values.reduce((a, b) => a + b, 0) / group.values.length)
        : null;
    averages.set(key, { start, companyCount: group.companies.size });
  }
  return averages;
}

function applySalaryAverage(
  result: ReturnType<typeof computePathCompatibility>,
  roleTitle: string,
  averages: Map<string, { start: number | null; companyCount: number }>
) {
  const avg = averages.get(roleTitle.toLowerCase().trim());
  if (!avg?.start) return result;
  const start = avg.start;
  return {
    ...result,
    salaryProjection: {
      starting: start,
      fiveYear: Math.round(start * 1.45),
      tenYear: Math.round(start * 2.1),
      currency: 'EUR',
      isEstimate: avg.companyCount < 2,
      source: avg.companyCount >= 2 ? ('company_average' as const) : ('company' as const),
      companyCount: avg.companyCount,
    },
  };
}

export async function loadStudentCareerPathsHub(userId: string): Promise<CareerPathsHub> {
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
  const universityId = studentProfile?.universityId ?? null;
  const profile = await buildStudentProfile(userId);

  const [publishedPaths, targets] = await Promise.all([
    universityId
      ? prisma.careerPath.findMany({
          where: { universityId, status: 'PUBLISHED' },
          orderBy: { updatedAt: 'desc' },
        })
      : Promise.resolve([]),
    prisma.careerTarget.findMany({
      where: { userId },
      orderBy: [{ isPrimary: 'desc' }, { compatibility: 'desc' }],
    }),
  ]);

  const hasCompanyPaths = publishedPaths.length > 0;
  const cards: CareerPathCard[] = [];
  const salaryAverages = hasCompanyPaths ? computeRoleSalaryAverages(publishedPaths) : new Map();

  for (const path of publishedPaths) {
    let result = computePathCompatibility(path, profile);
    result = applySalaryAverage(result, path.roleTitle, salaryAverages);
    const target = targets.find((t) => t.careerPathId === path.id);

    if (target && Math.round(target.compatibility) !== result.compatibility) {
      await prisma.careerTarget.update({
        where: { id: target.id },
        data: {
          compatibility: result.compatibility,
          missingRequirements: JSON.stringify(result.missingSkills),
        },
      });
    }

    cards.push(
      pathToCard(path, result, {
        isProfileInsight: false,
        targetId: target?.id ?? null,
        isTarget: !!target,
        isPrimaryTarget: target?.isPrimary ?? false,
        monthlyTrend: target ? result.compatibility - Math.round(target.compatibility) : null,
      })
    );
  }

  if (!hasCompanyPaths) {
    const archetypes = scoreArchetypes(profile, universityId);
    for (const { path, result } of archetypes) {
      const target = targets.find(
        (t) =>
          t.roleTitle === path.roleTitle &&
          !t.careerPathId &&
          (t.companyName === 'Profile insight' || t.companyName === null)
      );
      cards.push(
        pathToCard(path, result, {
          isProfileInsight: true,
          targetId: target?.id ?? null,
          isTarget: !!target,
          isPrimaryTarget: target?.isPrimary ?? false,
          monthlyTrend: null,
        })
      );
    }
  }

  cards.sort((a, b) => b.compatibility - a.compatibility);

  const subjectInsights = profile.subjects.slice(0, 6).map((s) => {
    const related = cards
      .filter((c) =>
        c.subjectConnections.some((sc) => sc.subjectName === s.name) ||
        c.requiredSkills.some((sk) => s.name.toLowerCase().includes(sk.toLowerCase()))
      )
      .slice(0, 3)
      .map((c) => c.roleTitle);
    return {
      subjectName: s.name,
      careers: related.length > 0 ? related : cards.slice(0, 2).map((c) => c.roleTitle),
      message:
        related.length > 0
          ? `${s.name} contributes strongly to ${related.join(' and ')} paths.`
          : `Building strength in ${s.name} expands your career options.`,
    };
  });

  if (profile.hasStartup) {
    subjectInsights.push({
      subjectName: 'Startup Hub',
      careers: cards.filter((c) => c.tags.includes('Entrepreneurial')).slice(0, 2).map((c) => c.roleTitle),
      message: 'Startup Hub participation increases founder and product-path compatibility.',
    });
  }

  const compatibilityTrend = targets.length
    ? targets.map((t) => ({ label: t.roleTitle.slice(0, 14), value: Math.round(t.compatibility) }))
    : cards.slice(0, 4).map((c) => ({ label: c.roleTitle.slice(0, 14), value: c.compatibility }));

  const employabilityTrend = [
    { label: 'Now', value: profile.employabilityScore },
    { label: '+3 mo', value: Math.min(99, profile.employabilityScore + 8) },
    { label: '+6 mo', value: Math.min(99, profile.employabilityScore + 15) },
    { label: '+12 mo', value: Math.min(99, profile.employabilityScore + 25) },
  ];

  const allMilestones = cards.flatMap((c) => c.milestones);
  const doneMilestones = allMilestones.filter((m) => m.done).length;

  return {
    hasCompanyPaths,
    companyPathsAvailable: hasCompanyPaths,
    paths: cards,
    bestFit: cards[0] ?? null,
    targets: targets.map((t) => ({
      id: t.id,
      roleTitle: t.roleTitle,
      companyName: t.companyName,
      compatibility: Math.round(t.compatibility),
      isPrimary: t.isPrimary,
    })),
    comparisonDefaults: cards.slice(0, 3).map((c) => c.id),
    evolution: { compatibilityTrend, employabilityTrend },
    subjectInsights,
    alumniExamples: hasCompanyPaths
      ? cards.slice(0, 2).map((c) => ({
          roleTitle: c.roleTitle,
          companies: [c.companyName],
          note: 'Alumni tracking activates as more students follow this path at your university.',
        }))
      : [],
    advisorContext: [
      `Profile strength ${profile.profileStrength}%`,
      profile.gradeAverage != null ? `Grade average ${profile.gradeAverage.toFixed(1)}/20` : null,
      profile.hasStartup ? 'Active startup founder' : null,
      hasCompanyPaths
        ? `${publishedPaths.length} company-defined paths available`
        : 'No company paths yet — showing profile-based directions',
    ]
      .filter(Boolean)
      .join('. '),
    milestonesSummary: { done: doneMilestones, total: allMilestones.length },
  };
}

export function runCareerAdvisor(prompt: string, hub: CareerPathsHub): string {
  const lower = prompt.toLowerCase();
  const best = hub.bestFit;
  const top3 = hub.paths.slice(0, 3);

  if (lower.includes('priorit') || lower.includes('next step') || lower.includes('focus')) {
    if (!best) return 'Complete your profile and academic activity to unlock personalized career guidance.';
    const missing = best.missingSkills.slice(0, 2).map((s) => s.name).join(', ');
    return `Your strongest match is ${best.roleTitle} at ${best.compatibility}%. Focus next on: ${missing || 'building profile depth and maintaining grades'}. ${best.milestones.find((m) => !m.done)?.text ?? ''}`;
  }

  if (lower.includes('skill') && lower.includes('slow')) {
    const gaps = hub.paths.flatMap((p) => p.missingSkills.map((s) => s.name));
    const unique = [...new Set(gaps)].slice(0, 4);
    return unique.length
      ? `Skills most often slowing your progress: ${unique.join(', ')}. Address these through subjects, projects, and profile updates.`
      : 'No major skill gaps detected — keep building momentum across academics and profile.';
  }

  if (lower.includes('income') || lower.includes('salary') || lower.includes('high')) {
    const bySalary = [...hub.paths].sort((a, b) => (b.salaryTenYear ?? 0) - (a.salaryTenYear ?? 0));
    const top = bySalary[0];
    if (!top) return 'Salary projections appear once career paths are matched to your profile.';
    return `Highest projected 10-year path: ${top.roleTitle} (~€${top.salaryTenYear?.toLocaleString() ?? '—'}). Current compatibility: ${top.compatibility}%.`;
  }

  if (lower.includes('intern')) {
    const withIntern = hub.paths.filter((p) => p.recommendedInternships.length > 0);
    if (withIntern.length === 0) {
      return hub.hasCompanyPaths
        ? 'No internship requirements linked yet — check Opportunities as companies publish roles.'
        : 'Company internships will appear here once partners create accounts and publish positions with requirements.';
    }
    return `Recommended internships for your trajectory: ${withIntern[0]!.recommendedInternships.join(', ')}.`;
  }

  if (lower.includes('compare')) {
    return top3.map((p) => `${p.roleTitle}: ${p.compatibility}% match, ${p.pathDifficulty} difficulty`).join(' · ');
  }

  if (best) {
    return `${best.roleTitle} is your best fit (${best.compatibility}%). ${best.whyMatches[0] ?? ''} Ask about skills, salary, internships, or your next step.`;
  }

  return 'Build your academic and profile activity — career paths evolve as you use UniBridge.';
}
