import { prisma } from '@/lib/db';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import { loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';

export interface TalentCandidate {
  id: string;
  userId: string;
  name: string;
  headline: string | null;
  image: string | null;
  universityName: string;
  program: string | null;
  employabilityScore: number;
  profileStrength: number;
  compatibilityAvg: number | null;
  primaryRole: string | null;
  verifiedSkills: number;
  openTo: string[];
  source: 'partnership' | 'applicant';
  href: string;
}

export interface CompanyTalentHub {
  candidates: TalentCandidate[];
  filters: { universities: string[]; roles: string[] };
  stats: { total: number; openToInternships: number; highCompatibility: number };
  hasPartnerships: boolean;
  serverTime: string;
}

export async function loadCompanyTalentHub(userId: string): Promise<CompanyTalentHub> {
  const dbReady = await ensureProfileIdentityTables();

  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId: userId, status: 'ACTIVE' },
    select: { universityId: true, university: { select: { name: true } } },
  });
  const uniIds = partnerships.map((p) => p.universityId).filter(Boolean) as string[];

  const applicantRows = await prisma.internshipApplication.findMany({
    where: { internship: { companyUserId: userId } },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, headline: true, image: true } },
          university: { select: { name: true } },
          course: { select: { name: true } },
        },
      },
      internship: { select: { title: true } },
    },
  });

  const applicantUserIds = new Set(applicantRows.map((a) => a.student.userId));
  const candidateMap = new Map<string, TalentCandidate>();

  for (const app of applicantRows) {
    const s = app.student;
    candidateMap.set(s.userId, {
      id: s.id,
      userId: s.userId,
      name: s.user.name ?? 'Student',
      headline: s.user.headline,
      image: s.user.image,
      universityName: s.university?.name ?? s.universityName ?? 'University',
      program: s.course?.name ?? s.program,
      employabilityScore: Math.round(s.employabilityScore),
      profileStrength: s.profileStrength,
      compatibilityAvg: null,
      primaryRole: app.internship.title,
      verifiedSkills: 0,
      openTo: ['Applied to your role'],
      source: 'applicant',
      href: `/company/opportunities?application=${app.id}`,
    });
  }

  if (uniIds.length > 0 && dbReady) {
    const students = await prisma.studentProfile.findMany({
      where: { universityId: { in: uniIds } },
      include: {
        user: { select: { id: true, name: true, headline: true, image: true } },
        university: { select: { name: true } },
        course: { select: { name: true } },
        identitySettings: true,
        reportedSkills: { select: { id: true } },
      },
      take: 80,
    });

    const visibleStudents = students.filter((s) => {
      if (applicantUserIds.has(s.userId)) return false;
      const settings = s.identitySettings;
      if (!isVisibleToCompanies(settings?.visibilityProfile ?? null)) return false;
      if (
        settings &&
        !studentOpenToRecruiting({
          openToInternships: settings.openToInternships,
          openToFullTime: settings.openToFullTime,
          openToNetworking: settings.openToNetworking,
        })
      ) {
        return false;
      }
      return true;
    });

    const pathResults = await Promise.all(
      visibleStudents.slice(0, 30).map(async (s) => ({
        userId: s.userId,
        paths: await loadStudentCareerPathsHub(s.userId).catch(() => null),
      }))
    );
    const pathByUser = new Map(pathResults.map((r) => [r.userId, r.paths]));

    for (const s of visibleStudents) {
      const settings = s.identitySettings;
      const paths = pathByUser.get(s.userId);
      const compatibilityAvg =
        paths && paths.paths.length > 0
          ? Math.round(paths.paths.reduce((a, p) => a + p.compatibility, 0) / paths.paths.length)
          : null;
      const primary = paths?.paths.find((p) => p.isPrimaryTarget) ?? paths?.bestFit;

      const openTo: string[] = [];
      if (settings?.openToInternships) openTo.push('Internships');
      if (settings?.openToFullTime) openTo.push('Full-time');
      if (settings?.openToNetworking) openTo.push('Networking');
      if (settings?.openToStartup) openTo.push('Startup projects');

      candidateMap.set(s.userId, {
        id: s.id,
        userId: s.userId,
        name: s.user.name ?? 'Student',
        headline: s.user.headline,
        image: s.user.image,
        universityName: s.university?.name ?? s.universityName ?? 'University',
        program: s.course?.name ?? s.program,
        employabilityScore: Math.round(s.employabilityScore),
        profileStrength: s.profileStrength,
        compatibilityAvg,
        primaryRole: primary?.roleTitle ?? null,
        verifiedSkills: s.reportedSkills.length,
        openTo,
        source: 'partnership',
        href: `/company/talent?student=${s.userId}`,
      });
    }
  }

  const candidates = [...candidateMap.values()].sort(
    (a, b) => (b.compatibilityAvg ?? 0) - (a.compatibilityAvg ?? 0)
  );

  const universities = [...new Set(candidates.map((c) => c.universityName))];
  const roles = [...new Set(candidates.map((c) => c.primaryRole).filter(Boolean))] as string[];

  return {
    candidates,
    filters: { universities, roles },
    stats: {
      total: candidates.length,
      openToInternships: candidates.filter((c) => c.openTo.some((o) => o.includes('Intern'))).length,
      highCompatibility: candidates.filter((c) => (c.compatibilityAvg ?? 0) >= 70).length,
    },
    hasPartnerships: partnerships.length > 0,
    serverTime: new Date().toISOString(),
  };
}
