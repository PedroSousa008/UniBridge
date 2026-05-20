import { prisma } from '@/lib/db';
import { buildVerifiedBadges, parseJsonArray } from '@/lib/career/profile-intelligence';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';
import { computePipelineAiLabels, type PipelineAiLabel } from '@/lib/company/company-pipeline-intelligence';

export interface CompanyCandidateCard {
  studentUserId: string;
  studentProfileId: string;
  name: string;
  image: string | null;
  headline: string | null;
  universityName: string;
  program: string | null;
  graduationYear: number | null;
  compatibilityScore: number | null;
  employabilityScore: number;
  profileStrength: number;
  verifiedBadges: string[];
  topSkills: string[];
  startupInvolvement: string | null;
  leadershipScore: number;
  languages: string[];
  recentActivity: string | null;
  availability: string[];
  aiLabels: PipelineAiLabel[];
}

export async function buildCompanyCandidateCard(
  studentUserId: string,
  companyUserId: string
): Promise<CompanyCandidateCard | null> {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentUserId },
    include: {
      user: { select: { name: true, headline: true, image: true } },
      university: { select: { name: true } },
      course: { select: { name: true } },
      identitySettings: true,
      reportedSkills: { take: 6 },
    },
  });
  if (!student) return null;

  const [paths, startups, recentApp] = await Promise.all([
    loadStudentCareerPathsHub(studentUserId).catch(() => null),
    prisma.startup.findMany({
      where: { OR: [{ founderId: studentUserId }, { members: { some: { userId: studentUserId } } }] },
      take: 2,
      select: { name: true, stage: true },
    }),
    prisma.internshipApplication.findFirst({
      where: { studentId: student.id, internship: { companyUserId } },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true, status: true },
    }),
  ]);

  const compatibilityScore =
    paths && paths.paths.length > 0
      ? Math.round(paths.paths.reduce((a, p) => a + p.compatibility, 0) / paths.paths.length)
      : null;

  const verified = buildVerifiedBadges({
    universityLinked: Boolean(student.universityId),
    verifiedInternships: recentApp && ['accepted', 'hired', 'completed'].includes(recentApp.status.toLowerCase()) ? 1 : 0,
    verifiedProjects: 0,
    verifiedCerts: 0,
    leadershipEntries: 0,
    platformValidated: student.profileStrength >= 55,
  });

  const settings = student.identitySettings;
  const availability: string[] = [];
  if (settings?.openToInternships) availability.push('Open to internships');
  if (settings?.openToFullTime) availability.push('Open to full-time');
  if (settings?.openToNetworking) availability.push('Open to networking');
  if (settings?.openToStartup) availability.push('Open to startup');

  const graduationYear = student.yearOfStudy
    ? new Date().getFullYear() + Math.max(0, 4 - student.yearOfStudy)
    : null;

  const card: CompanyCandidateCard = {
    studentUserId,
    studentProfileId: student.id,
    name: student.user.name ?? 'Student',
    image: student.user.image,
    headline: student.user.headline,
    universityName: student.university?.name ?? student.universityName ?? 'University',
    program: student.course?.name ?? student.program,
    graduationYear,
    compatibilityScore,
    employabilityScore: Math.round(student.employabilityScore),
    profileStrength: student.profileStrength,
    verifiedBadges: verified.filter((v) => v.verified).map((v) => v.label),
    topSkills: student.reportedSkills.map((s) => s.skillId),
    startupInvolvement: startups[0] ? `${startups[0].name} (${startups[0].stage ?? 'active'})` : null,
    leadershipScore: Math.min(100, student.profileStrength + (startups.length > 0 ? 15 : 0)),
    languages: parseJsonArray(settings?.languages),
    recentActivity: recentApp
      ? `Application ${recentApp.status} · ${recentApp.updatedAt.toLocaleDateString()}`
      : startups[0]
        ? `Startup: ${startups[0].name}`
        : null,
    availability,
    aiLabels: [],
  };

  card.aiLabels = computePipelineAiLabels(card, startups.length > 0);
  return card;
}
