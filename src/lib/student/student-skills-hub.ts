import { prisma } from '@/lib/db';
import { ensureSkillsTables } from '@/lib/db/ensure-skills-schema';
import {
  buildEcosystemSkills,
  buildIndustryComparison,
  buildSkillGaps,
  buildSkillMilestones,
  buildSkillRecommendations,
  buildSkillsRadar,
  computeCompatibilitySkillBoost,
  pathRequirementsFromCareerPath,
  runSkillsAdvisor,
  SKILL_CATALOG,
  skillsToProfileSlugs,
  type IndustryCompareRow,
  type SkillCategory,
  type SkillGapItem,
  type SkillMilestone,
  type SkillRecommendation,
  type SkillsRadarPoint,
  type TrackedSkill,
} from '@/lib/career/skills-intelligence';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { loadStudentAssignmentsHub } from '@/lib/student/student-assignments';

export interface SkillsHub {
  catalog: typeof SKILL_CATALOG;
  skills: TrackedSkill[];
  skillsByCategory: Record<SkillCategory, TrackedSkill[]>;
  verifiedSkills: TrackedSkill[];
  selfReportedSkills: TrackedSkill[];
  radar: SkillsRadarPoint[];
  gaps: SkillGapItem[];
  recommendations: SkillRecommendation[];
  milestones: SkillMilestone[];
  industryCompare: IndustryCompareRow[];
  stats: {
    totalSkills: number;
    verifiedCount: number;
    selfReportedCount: number;
    averageXp: number;
    expertCount: number;
    compatibilityBoost: number;
  };
  compatibility: {
    primaryRole: string | null;
    primaryScore: number | null;
    withSkillsEstimate: number | null;
    ecosystemLinks: { label: string; href: string }[];
  };
  liveActivity: { label: string; at: string }[];
  dbReady: boolean;
  serverTime: string;
}

export async function loadStudentSkillsHub(userId: string): Promise<SkillsHub> {
  const dbReady = await ensureSkillsTables();

  const [baseProfile, pathsHub, assignmentsHub, studentRow] = await Promise.all([
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    loadStudentAssignmentsHub(userId).catch(() => ({ assignments: [], notifications: [], dbReady: false })),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  const [startups, applications, journals, selfRows] = await Promise.all([
    prisma.startup.findMany({
      where: { founderId: userId },
      include: { milestones: true },
    }),
    studentRow && dbReady
      ? prisma.internshipApplication.findMany({
          where: { studentId: studentRow.id },
          include: {
            internship: {
              select: {
                title: true,
                companyUser: { select: { companyProfile: { select: { companyName: true } }, name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    studentRow && dbReady
      ? prisma.studentInternshipJournal.count({ where: { studentId: studentRow.id } })
      : Promise.resolve(0),
    studentRow && dbReady
      ? prisma.studentReportedSkill.findMany({ where: { studentProfileId: studentRow.id } })
      : Promise.resolve([]),
  ]);

  const primary = pathsHub.paths.find((p) => p.isPrimaryTarget) ?? pathsHub.bestFit;
  const primaryPathRow = primary
    ? await prisma.careerPath.findUnique({
        where: { id: primary.id },
        select: { compatibilityCriteria: true, gradeRequirements: true },
      })
    : null;

  const pathReqs = pathRequirementsFromCareerPath(primaryPathRow);

  const skills = buildEcosystemSkills({
    profile: baseProfile,
    assignments: assignmentsHub.assignments.map((a) => ({
      id: a.id,
      title: a.title,
      subjectName: a.subject.name,
      status: a.status,
      score: a.score,
      isGroup: a.isGroup,
    })),
    internships: applications.map((a) => ({
      title: a.internship.title,
      companyName:
        a.internship.companyUser.companyProfile?.companyName ??
        a.internship.companyUser.name ??
        'Company',
      status: a.status,
    })),
    startups: startups.map((s) => ({
      name: s.name,
      readinessScore: s.readinessScore,
      milestonesDone: s.milestones.filter((m) => m.status === 'done').length,
    })),
    journals,
    primaryRole: primary?.roleTitle ?? null,
    pathRequirements: pathReqs,
    selfReported: selfRows.map((r) => ({ skillId: r.skillId, claimedLevel: r.claimedLevel })),
  });

  const verifiedSkills = skills.filter((s) => s.verification === 'verified');
  const selfReportedSkills = skills.filter((s) => s.verification === 'self_reported');
  const radar = buildSkillsRadar(skills);
  const gaps = buildSkillGaps(skills, primary?.roleTitle ?? null, pathReqs);
  const recommendations = buildSkillRecommendations(gaps, primary?.roleTitle ?? null);
  const milestones = buildSkillMilestones(skills);
  const industryCompare = buildIndustryComparison(skills, primary?.roleTitle ?? null);
  const boost = computeCompatibilitySkillBoost(skills);

  const skillsByCategory: Record<SkillCategory, TrackedSkill[]> = {
    technical: [],
    soft: [],
    entrepreneurial: [],
    creative: [],
  };
  for (const s of skills) skillsByCategory[s.category].push(s);

  const avgXp =
    verifiedSkills.length > 0
      ? Math.round(verifiedSkills.reduce((a, s) => a + s.xp, 0) / verifiedSkills.length)
      : 0;

  const liveActivity: SkillsHub['liveActivity'] = [];
  if (assignmentsHub.assignments.some((a) => a.status === 'GRADED')) {
    liveActivity.push({ label: 'Assignment graded — skills recalculated', at: new Date().toISOString() });
  }
  if (startups.length > 0) {
    liveActivity.push({ label: 'Startup Hub activity synced', at: new Date().toISOString() });
  }
  if (applications.length > 0) {
    liveActivity.push({ label: 'Internship track linked', at: new Date().toISOString() });
  }

  return {
    catalog: SKILL_CATALOG,
    skills,
    skillsByCategory,
    verifiedSkills,
    selfReportedSkills,
    radar,
    gaps,
    recommendations,
    milestones,
    industryCompare,
    stats: {
      totalSkills: skills.length,
      verifiedCount: verifiedSkills.length,
      selfReportedCount: selfReportedSkills.length,
      averageXp: avgXp,
      expertCount: verifiedSkills.filter((s) => s.level === 'expert').length,
      compatibilityBoost: boost,
    },
    compatibility: {
      primaryRole: primary?.roleTitle ?? null,
      primaryScore: primary?.compatibility ?? null,
      withSkillsEstimate:
        primary?.compatibility != null ? Math.min(100, primary.compatibility + boost) : null,
      ecosystemLinks: [
        { label: 'Compatibility Engine', href: '/student/career/compatibility' },
        { label: 'CV Builder', href: '/student/career/cv' },
        { label: 'Career Paths', href: '/student/career/paths' },
        { label: 'Internships', href: '/student/career/internships' },
        { label: 'AI Mentor', href: '/student/career/mentor' },
        { label: 'Salary Simulator', href: '/student/career/salary' },
      ],
    },
    liveActivity,
    dbReady,
    serverTime: new Date().toISOString(),
  };
}

export async function addSelfReportedSkill(
  userId: string,
  skillId: string,
  claimedLevel: number,
  note?: string
) {
  await ensureSkillsTables();
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) return null;
  if (!SKILL_CATALOG.some((c) => c.id === skillId)) return null;

  return prisma.studentReportedSkill.upsert({
    where: {
      studentProfileId_skillId: { studentProfileId: student.id, skillId },
    },
    create: {
      studentProfileId: student.id,
      skillId,
      claimedLevel: Math.min(100, Math.max(20, claimedLevel)),
      note,
    },
    update: {
      claimedLevel: Math.min(100, Math.max(20, claimedLevel)),
      note,
    },
  });
}

export function runSkillsAdvisorFromHub(prompt: string, hub: SkillsHub): string {
  return runSkillsAdvisor(prompt, {
    primaryRole: hub.compatibility.primaryRole,
    gaps: hub.gaps,
    topSkills: hub.skills.slice(0, 5),
    verifiedCount: hub.stats.verifiedCount,
  });
}

/** Used by buildStudentProfile to feed compatibility engine */
export async function loadInferredSkillSlugsForUser(userId: string): Promise<string[]> {
  const hub = await loadStudentSkillsHub(userId);
  return skillsToProfileSlugs(hub.skills);
}
