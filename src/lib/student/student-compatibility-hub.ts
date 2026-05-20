import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { archetypeToCareerPath, PROFILE_CAREER_ARCHETYPES } from '@/lib/career/career-archetypes';
import {
  computePathCompatibility,
} from '@/lib/career/compatibility-engine';
import {
  buildSimulations,
  computeBreakdown,
  inferTraitsFromProfileOnly,
  peersInsight,
  traitsFromQuizAnswers,
  whyScoreLines,
  WORK_STYLE_QUESTIONS,
  type WorkStyleTrait,
} from '@/lib/career/compatibility-intelligence';
import { ensureCompatibilityTables } from '@/lib/db/ensure-compatibility-schema';
import { computeStartupReadiness } from '@/lib/startups/readiness';
import { buildStudentProfile } from '@/lib/student/student-career-paths';

export type CompatibilityEntityType =
  | 'career'
  | 'internship'
  | 'company'
  | 'startup_join'
  | 'program'
  | 'opportunity';

export interface CompatibilityScoreItem {
  id: string;
  type: CompatibilityEntityType;
  title: string;
  subtitle: string | null;
  compatibility: number;
  delta: number | null;
  tags: string[];
  whyMatches: string[];
  breakdown: { id: string; label: string; score: number; status: string }[];
  missingRequirements: { name: string; gapPercent: number; importance: number }[];
  targetScore: number;
  href: string;
}

export interface CompatibilityRecommendation {
  id: string;
  text: string;
  impact: string;
  href: string;
}

export interface CompatibilityHub {
  overallScore: number;
  employabilityScore: number;
  primaryGoal: { roleTitle: string; compatibility: number } | null;
  liveDeltas: { label: string; delta: number }[];
  scores: CompatibilityScoreItem[];
  selectedId: string | null;
  evolution: { label: string; overall: number; employability: number }[];
  monthlyEvolution: { label: string; value: number }[];
  recommendations: CompatibilityRecommendation[];
  bestNextStep: string;
  workStyle: WorkStyleTrait[];
  quizCompleted: boolean;
  quizQuestions: typeof WORK_STYLE_QUESTIONS;
  peersInsight: string;
  simulations: ReturnType<typeof buildSimulations>;
  goals: { id: string; roleTitle: string; companyName: string | null; compatibility: number; isPrimary: boolean }[];
  opportunities: CompatibilityScoreItem[];
  serverTime: string;
  hasCompanyData: boolean;
}

function joinCompatibility(
  profile: Awaited<ReturnType<typeof buildStudentProfile>>,
  startup: { name: string; readiness: number; industry: string | null }
): number {
  let score = 50;
  score += Math.min(25, profile.profileStrength * 0.25);
  score += Math.min(20, profile.engagementScore * 0.2);
  if (profile.hasStartup) score -= 10;
  score += Math.min(15, startup.readiness * 0.15);
  if (profile.gradeAverage != null && profile.gradeAverage >= 12) score += 10;
  return Math.min(99, Math.max(0, Math.round(score)));
}

function companyCompatibility(
  profile: Awaited<ReturnType<typeof buildStudentProfile>>,
  industry: string | null,
  baseFromPath?: number
): number {
  if (baseFromPath != null) return baseFromPath;
  let score = 45 + profile.employabilityScore * 0.3 + profile.profileStrength * 0.2;
  const ind = (industry ?? '').toLowerCase();
  if (ind.includes('tech') && profile.gradeAverage != null && profile.gradeAverage >= 13) score += 8;
  if (ind.includes('finance') && profile.gradeAverage != null && profile.gradeAverage >= 14) score += 10;
  if (profile.hasStartup && ind.includes('tech')) score += 12;
  return Math.min(99, Math.round(score));
}

async function recordSnapshot(
  studentId: string,
  overall: number,
  employability: number,
  scores: CompatibilityScoreItem[],
  dbReady: boolean
) {
  if (!dbReady) return;
  const last = await prisma.studentCompatibilitySnapshot.findFirst({
    where: { studentId },
    orderBy: { capturedAt: 'desc' },
  });
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const scoresPayload = scores.slice(0, 12).map((s) => ({ id: s.id, score: s.compatibility }));
  if (
    last &&
    last.capturedAt.getTime() > hourAgo &&
    last.overallScore === overall &&
    JSON.stringify(last.scoresJson) === JSON.stringify(scoresPayload)
  ) {
    return;
  }
  await prisma.studentCompatibilitySnapshot.create({
    data: {
      studentId,
      overallScore: overall,
      employabilityScore: employability,
      scoresJson: scoresPayload,
    },
  });
  const old = await prisma.studentCompatibilitySnapshot.findMany({
    where: { studentId },
    orderBy: { capturedAt: 'desc' },
    skip: 24,
    select: { id: true },
  });
  if (old.length > 0) {
    await prisma.studentCompatibilitySnapshot.deleteMany({
      where: { id: { in: old.map((o) => o.id) } },
    });
  }
}

function computeDeltas(
  current: CompatibilityScoreItem[],
  previous: { id: string; score: number }[] | null
): { label: string; delta: number }[] {
  if (!previous?.length) return [];
  const prevMap = new Map(previous.map((p) => [p.id, p.score]));
  return current
    .map((c) => {
      const prev = prevMap.get(c.id);
      if (prev == null || prev === c.compatibility) return null;
      return { label: c.title, delta: c.compatibility - prev };
    })
    .filter((d): d is { label: string; delta: number } => d != null && d.delta !== 0)
    .slice(0, 4);
}

export async function loadStudentCompatibilityHub(
  studentId: string,
  selectedId?: string | null
): Promise<CompatibilityHub> {
  const dbReady = await ensureCompatibilityTables();
  const profile = await buildStudentProfile(studentId);
  const studentProfile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
  const universityId = studentProfile?.universityId ?? null;

  const [targets, publishedPaths, internships, challenges, partnerships, otherStartups, workStyle, snapshots] =
    await Promise.all([
      prisma.careerTarget.findMany({
        where: { userId: studentId },
        orderBy: [{ isPrimary: 'desc' }, { compatibility: 'desc' }],
      }),
      universityId
        ? prisma.careerPath.findMany({ where: { universityId, status: 'PUBLISHED' } })
        : Promise.resolve([]),
      universityId
        ? prisma.internship.findMany({
            where: { universityId, status: 'ACTIVE' },
            include: { companyUser: { include: { companyProfile: true } } },
            take: 8,
          })
        : Promise.resolve([]),
      universityId
        ? prisma.companyChallenge.findMany({
            where: { universityId, status: 'ACTIVE' },
            include: { companyUser: { include: { companyProfile: true } } },
            take: 6,
          })
        : Promise.resolve([]),
      universityId
        ? prisma.companyPartnership.findMany({
            where: { universityId, status: 'ACTIVE' },
            include: { companyUser: { include: { companyProfile: true } } },
            take: 8,
          })
        : Promise.resolve([]),
      prisma.startup.findMany({
        where: { founderId: { not: studentId }, defaultVisibility: 'PUBLIC' },
        include: { members: true, milestones: true, media: true, tractionMetrics: true, openings: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
      dbReady
        ? prisma.studentWorkStyleProfile.findUnique({ where: { studentId } })
        : Promise.resolve(null),
      dbReady
        ? prisma.studentCompatibilitySnapshot.findMany({
            where: { studentId },
            orderBy: { capturedAt: 'asc' },
            take: 12,
          })
        : Promise.resolve([]),
    ]);

  const hasCompanyData =
    publishedPaths.length > 0 || internships.length > 0 || partnerships.length > 0;

  const scores: CompatibilityScoreItem[] = [];
  const previousSnapshot = snapshots[snapshots.length - 2];
  const prevScores = (previousSnapshot?.scoresJson as { id: string; score: number }[]) ?? null;

  const addScore = (
    item: Omit<CompatibilityScoreItem, 'delta' | 'targetScore'> & { targetScore?: number }
  ) => {
    const prev = prevScores?.find((p) => p.id === item.id)?.score;
    scores.push({
      ...item,
      targetScore: item.targetScore ?? 90,
      delta: prev != null ? item.compatibility - prev : null,
    });
  };

  if (publishedPaths.length > 0) {
    for (const path of publishedPaths) {
      const result = computePathCompatibility(path, profile);
      const breakdown = computeBreakdown(profile, result);
      addScore({
        id: `career-${path.id}`,
        type: 'career',
        title: path.roleTitle,
        subtitle: path.companyName,
        compatibility: result.compatibility,
        tags: result.tags,
        whyMatches: whyScoreLines(result, breakdown),
        breakdown,
        missingRequirements: result.missingSkills,
        href: '/student/career/paths',
      });
    }
  } else {
    for (const archetype of PROFILE_CAREER_ARCHETYPES) {
      const path = archetypeToCareerPath(archetype, universityId);
      const result = computePathCompatibility(path, profile);
      const breakdown = computeBreakdown(profile, result);
      addScore({
        id: `career-${archetype.id}`,
        type: 'career',
        title: path.roleTitle,
        subtitle: 'Profile insight',
        compatibility: result.compatibility,
        tags: result.tags,
        whyMatches: whyScoreLines(result, breakdown),
        breakdown,
        missingRequirements: result.missingSkills,
        href: '/student/career/paths',
      });
    }
  }

  for (const i of internships) {
    const company = i.companyUser.companyProfile?.companyName ?? 'Company';
    const pseudoPath = archetypeToCareerPath(
      {
        ...PROFILE_CAREER_ARCHETYPES[0]!,
        id: `intern-${i.id}`,
        roleTitle: i.title,
        industry: 'Internship',
        recommendedSkills: ['communication', 'analytical'],
        requiredSubjects: [],
      },
      universityId
    );
    pseudoPath.companyName = company;
    const result = computePathCompatibility(pseudoPath, profile);
    const breakdown = computeBreakdown(profile, result);
    addScore({
      id: `intern-${i.id}`,
      type: 'internship',
      title: i.title,
      subtitle: company,
      compatibility: Math.min(99, result.compatibility),
      tags: ['Internship', ...result.tags.slice(0, 2)],
      whyMatches: whyScoreLines(result, breakdown),
      breakdown,
      missingRequirements: result.missingSkills,
      href: '/student/career/internships',
    });
  }

  const companySeen = new Set<string>();
  for (const p of partnerships) {
    const name = p.companyUser.companyProfile?.companyName ?? 'Partner company';
    if (companySeen.has(name)) continue;
    companySeen.add(name);
    const relatedPath = publishedPaths.find((cp) => cp.companyName === name);
    const compat = companyCompatibility(
      profile,
      p.companyUser.companyProfile?.industry ?? null,
      relatedPath ? computePathCompatibility(relatedPath, profile).compatibility : undefined
    );
    const breakdown = computeBreakdown(
      profile,
      computePathCompatibility(
        archetypeToCareerPath(PROFILE_CAREER_ARCHETYPES[1]!, universityId),
        profile
      )
    );
    addScore({
      id: `company-${p.id}`,
      type: 'company',
      title: name,
      subtitle: p.partnershipType ?? 'Industry partner',
      compatibility: compat,
      tags: ['Company', 'Partnership'],
      whyMatches: [
        `Employability and profile strength drive ${name} compatibility.`,
        profile.gradeAverage != null
          ? `Academic average ${profile.gradeAverage.toFixed(1)}/20 influences this match.`
          : 'Build academic signals to improve this score.',
      ],
      breakdown,
      missingRequirements: [],
      href: '/student/career/partnerships',
    });
  }

  if (partnerships.length === 0) {
    const envs = [
      { id: 'env-tech', title: 'Tech company environment', industry: 'Technology', tags: ['Remote Friendly', 'Fast Growth'] },
      { id: 'env-finance', title: 'Finance firm environment', industry: 'Finance', tags: ['High Salary', 'Analytical'] },
      { id: 'env-startup', title: 'Startup accelerator environment', industry: 'Entrepreneurship', tags: ['Entrepreneurial', 'Fast Growth'] },
    ];
    for (const env of envs) {
      const compat = companyCompatibility(profile, env.industry);
      const breakdown = computeBreakdown(
        profile,
        computePathCompatibility(archetypeToCareerPath(PROFILE_CAREER_ARCHETYPES[0]!, universityId), profile)
      );
      addScore({
        id: env.id,
        type: 'company',
        title: env.title,
        subtitle: 'Updates when companies join UniBridge',
        compatibility: compat,
        tags: env.tags,
        whyMatches: [`Your profile aligns ${compat}% with a typical ${env.industry.toLowerCase()} environment.`],
        breakdown,
        missingRequirements: [],
        href: '/student/career/paths',
      });
    }
  }

  for (const s of otherStartups) {
    const readiness = computeStartupReadiness(s).readinessScore;
    const compat = joinCompatibility(profile, { name: s.name, readiness, industry: s.industry });
    addScore({
      id: `join-${s.id}`,
      type: 'startup_join',
      title: `Join ${s.name}`,
      subtitle: s.industry ?? 'Startup team',
      compatibility: compat,
      tags: ['Entrepreneurial', 'Startup'],
      whyMatches: [
        `Team fit estimated from profile strength and startup readiness (${readiness}%).`,
        profile.hasStartup
          ? 'Your founder experience may transfer — or focus on your own venture.'
          : 'Joining a team builds entrepreneurial experience.',
      ],
      breakdown: computeBreakdown(
        profile,
        computePathCompatibility(archetypeToCareerPath(PROFILE_CAREER_ARCHETYPES[0]!, universityId), profile)
      ),
      missingRequirements: [],
      href: `/student/startup/${s.id}`,
    });
  }

  for (const c of challenges) {
    const company = c.companyUser.companyProfile?.companyName ?? 'Company';
    addScore({
      id: `opp-${c.id}`,
      type: 'opportunity',
      title: c.title,
      subtitle: company,
      compatibility: Math.min(95, 55 + profile.employabilityScore / 4),
      tags: ['Challenge', 'Opportunity'],
      whyMatches: ['Matched from employability and engagement signals.'],
      breakdown: computeBreakdown(
        profile,
        computePathCompatibility(archetypeToCareerPath(PROFILE_CAREER_ARCHETYPES[2]!, universityId), profile)
      ),
      missingRequirements: [],
      href: '/student/career',
    });
  }

  scores.sort((a, b) => b.compatibility - a.compatibility);

  const overallScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, s) => a + s.compatibility, 0) / scores.length)
      : profile.employabilityScore;

  await recordSnapshot(studentId, overallScore, profile.employabilityScore, scores, dbReady);

  const evolution =
    snapshots.length > 0
      ? snapshots.map((s, i) => ({
          label: i === snapshots.length - 1 ? 'Now' : `W${i + 1}`,
          overall: s.overallScore,
          employability: s.employabilityScore,
        }))
      : [{ label: 'Now', overall: overallScore, employability: profile.employabilityScore }];

  const monthlyEvolution = snapshots.slice(-6).map((s, i) => ({
    label: `Point ${i + 1}`,
    value: s.overallScore,
  }));

  const primary = targets.find((t) => t.isPrimary);
  const selected =
    (selectedId ? scores.find((s) => s.id === selectedId) : null) ??
    scores.find((s) => primary && s.title === primary.roleTitle) ??
    scores[0] ??
    null;

  const recommendations: CompatibilityRecommendation[] = [];
  if (!profile.hasStartup) {
    recommendations.push({
      id: 'startup-hub',
      text: 'Join Startup Hub activity',
      impact: '+5–8% on entrepreneurial paths',
      href: '/student/startup',
    });
  }
  if (profile.profileStrength < 70) {
    recommendations.push({
      id: 'profile',
      text: 'Strengthen your profile for recruiter visibility',
      impact: '+4–6% employability',
      href: '/student/profile',
    });
  }
  if (internships.length > 0) {
    recommendations.push({
      id: 'intern',
      text: `Apply to ${internships[0]!.title}`,
      impact: '+8–12% on related careers',
      href: '/student/career/internships',
    });
  }
  for (const m of selected?.missingRequirements.slice(0, 2) ?? []) {
    recommendations.push({
      id: `skill-${m.name}`,
      text: `Develop ${m.name}`,
      impact: `Closes ${m.gapPercent}% gap`,
      href: '/student/academics/resources',
    });
  }

  const quizAnswers = (workStyle?.answers as Record<string, string> | null) ?? {};
  const quizCompleted = WORK_STYLE_QUESTIONS.every((q) => quizAnswers[q.id]);
  const storedTraits = workStyle?.traits as unknown;
  const workStyleTraits = quizCompleted
    ? traitsFromQuizAnswers(quizAnswers, profile)
    : Array.isArray(storedTraits) && storedTraits.length > 0
      ? (storedTraits as WorkStyleTrait[])
      : inferTraitsFromProfileOnly(profile);

  const topCareers = scores.filter((s) => s.type === 'career').slice(0, 3).map((s) => s.title);

  const bestNextStepText = selected
    ? (() => {
        const weakest = [...selected.breakdown].sort((a, b) => a.score - b.score)[0];
        const missing = selected.missingRequirements[0];
        if (missing) {
          return `Most impactful next action: develop ${missing.name} — could unlock significant compatibility gains.`;
        }
        if (weakest && weakest.score < 55) {
          return `Most impactful next action: strengthen ${weakest.label.toLowerCase()} (currently ${weakest.score}%).`;
        }
        return 'Most impactful next action: complete an internship or leadership project to push into the next tier.';
      })()
    : 'Complete your profile and take the micro-quiz to unlock personalized guidance.';

  return {
    overallScore,
    employabilityScore: profile.employabilityScore,
    primaryGoal: primary
      ? { roleTitle: primary.roleTitle, compatibility: Math.round(primary.compatibility) }
      : null,
    liveDeltas: computeDeltas(scores, prevScores),
    scores,
    selectedId: selected?.id ?? null,
    evolution,
    monthlyEvolution,
    recommendations,
    bestNextStep: bestNextStepText,
    workStyle: workStyleTraits,
    quizCompleted,
    quizQuestions: WORK_STYLE_QUESTIONS,
    peersInsight: peersInsight(topCareers),
    simulations: selected ? buildSimulations(selected.compatibility, selected.title) : [],
    goals: targets.map((t) => ({
      id: t.id,
      roleTitle: t.roleTitle,
      companyName: t.companyName,
      compatibility: Math.round(t.compatibility),
      isPrimary: t.isPrimary,
    })),
    opportunities: scores.filter((s) => s.type === 'internship' || s.type === 'opportunity'),
    serverTime: new Date().toISOString(),
    hasCompanyData,
  };
}

export async function saveWorkStyleQuiz(studentId: string, answers: Record<string, string>) {
  const dbReady = await ensureCompatibilityTables();
  if (!dbReady) return null;
  const profile = await buildStudentProfile(studentId);
  const traits = traitsFromQuizAnswers(answers, profile);
  const jsonAnswers = answers as Prisma.InputJsonValue;
  const jsonTraits = traits as unknown as Prisma.InputJsonValue;
  return prisma.studentWorkStyleProfile.upsert({
    where: { studentId },
    create: { studentId, answers: jsonAnswers, traits: jsonTraits },
    update: { answers: jsonAnswers, traits: jsonTraits },
  });
}
