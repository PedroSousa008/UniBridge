import { prisma } from '@/lib/db';
import { PROFILE_CAREER_ARCHETYPES } from '@/lib/career/career-archetypes';
import {
  aiFinancialInsight,
  compareLocationsForCareer,
  FINANCIAL_GOALS,
  runSalarySimulation,
  SALARY_LOCATIONS,
  startupFounderSimulation,
  WHAT_IF_MODIFIERS,
  type SimulationResult,
} from '@/lib/career/salary-simulation';
import {
  buildAtAgeComparison,
  portugueseProfiles,
  SUCCESS_PROFILES,
  type AtAgeComparison,
} from '@/lib/career/success-profiles';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';

export interface SalaryCareerOption {
  id: string;
  roleTitle: string;
  industry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  compatibility: number;
  isPrimary: boolean;
}

export interface SalaryHub {
  studentAge: number;
  yearOfStudy: number | null;
  careers: SalaryCareerOption[];
  locations: typeof SALARY_LOCATIONS;
  whatIfModifiers: typeof WHAT_IF_MODIFIERS;
  financialGoals: typeof FINANCIAL_GOALS;
  activeSimulation: SimulationResult;
  locationComparison: ReturnType<typeof compareLocationsForCareer>;
  compareCareers: SimulationResult[];
  startupSimulation: ReturnType<typeof startupFounderSimulation>;
  aiInsights: string[];
  atAgeComparisons: AtAgeComparison[];
  portugueseSection: typeof SUCCESS_PROFILES;
  successProfiles: typeof SUCCESS_PROFILES;
  primaryCompatibility: number | null;
  serverTime: string;
}

export async function loadStudentSalaryHub(
  userId: string,
  options?: {
    careerId?: string;
    locationId?: string;
    modifierIds?: string[];
    compareCareerIds?: string[];
    successProfileId?: string;
  }
): Promise<SalaryHub> {
  const [profile, pathsHub, studentRow] = await Promise.all([
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  const studentAge = Math.min(28, Math.max(18, 18 + (studentRow?.yearOfStudy ?? 2)));
  const yearOfStudy = studentRow?.yearOfStudy ?? null;

  const careers: SalaryCareerOption[] = [];

  for (const card of pathsHub.paths) {
    careers.push({
      id: card.id,
      roleTitle: card.roleTitle,
      industry: card.industry,
      salaryMin: card.salaryStarting ?? card.salaryFiveYear,
      salaryMax: card.salaryTenYear ?? card.salaryFiveYear ?? card.salaryStarting,
      compatibility: card.compatibility,
      isPrimary: card.isPrimaryTarget,
    });
  }

  if (careers.length === 0) {
    for (const arch of PROFILE_CAREER_ARCHETYPES) {
      careers.push({
        id: arch.id,
        roleTitle: arch.roleTitle,
        industry: arch.industry,
        salaryMin: arch.salaryMin,
        salaryMax: arch.salaryMax,
        compatibility: 60,
        isPrimary: false,
      });
    }
  }

  const primary =
    careers.find((c) => c.isPrimary) ??
    careers.find((c) => c.id === options?.careerId) ??
    careers[0];

  const careerId = options?.careerId ?? primary?.id ?? careers[0]!.id;
  const career = careers.find((c) => c.id === careerId) ?? careers[0]!;
  const locationId = options?.locationId ?? 'lisbon';
  const modifierIds = options?.modifierIds ?? [];

  const activeSimulation = runSalarySimulation({
    careerId: career.id,
    roleTitle: career.roleTitle,
    industry: career.industry,
    salaryMin: career.salaryMin,
    salaryMax: career.salaryMax,
    locationId,
    compatibility: career.compatibility,
    modifierIds,
  });

  const locationComparison = compareLocationsForCareer(
    career.roleTitle,
    career.industry,
    career.salaryMin,
    career.salaryMax,
    career.id,
    career.compatibility
  );

  const compareIds = options?.compareCareerIds ?? careers.slice(0, 4).map((c) => c.id);
  const compareCareers = compareIds
    .map((id) => {
      const c = careers.find((x) => x.id === id);
      if (!c) return null;
      return runSalarySimulation({
        careerId: c.id,
        roleTitle: c.roleTitle,
        industry: c.industry,
        salaryMin: c.salaryMin,
        salaryMax: c.salaryMax,
        locationId,
        compatibility: c.compatibility,
        modifierIds,
      });
    })
    .filter((s): s is SimulationResult => s != null);

  const startupSimulation = startupFounderSimulation(locationId);
  const aiInsights = aiFinancialInsight(
    compareCareers.length > 0 ? compareCareers : [activeSimulation],
    profile
  );

  const successProfileId = options?.successProfileId ?? portugueseProfiles()[0]?.id ?? SUCCESS_PROFILES[0]!.id;
  const atAgeComparisons = [
    buildAtAgeComparison(profile, successProfileId, studentAge, yearOfStudy),
    buildAtAgeComparison(profile, 'musk-20', studentAge, yearOfStudy),
  ].filter((c): c is AtAgeComparison => c != null);

  return {
    studentAge,
    yearOfStudy,
    careers,
    locations: SALARY_LOCATIONS,
    whatIfModifiers: WHAT_IF_MODIFIERS,
    financialGoals: FINANCIAL_GOALS,
    activeSimulation,
    locationComparison,
    compareCareers,
    startupSimulation,
    aiInsights,
    atAgeComparisons,
    portugueseSection: portugueseProfiles(),
    successProfiles: SUCCESS_PROFILES,
    primaryCompatibility: primary?.compatibility ?? null,
    serverTime: new Date().toISOString(),
  };
}

export function runSalaryAdvisor(prompt: string, hub: SalaryHub): string {
  const lower = prompt.toLowerCase();
  const sim = hub.activeSimulation;

  if (lower.includes('london') || lower.includes('move')) {
    const london = hub.locationComparison.find((l) => l.location.id === 'london');
    const lisbon = hub.locationComparison.find((l) => l.location.id === 'lisbon');
    if (london && lisbon) {
      return `Moving to London: ~${london.location.symbol}${london.netMonthlyFiveYear}/mo net at 5 years vs ${lisbon.location.symbol}${lisbon.netMonthlyFiveYear} in Lisbon for ${sim.roleTitle}. Higher gross but cost of living changes lifestyle tier: ${london.tier} vs ${lisbon.tier}.`;
    }
  }

  if (lower.includes('startup') || lower.includes('founder')) {
    return `Founder path: bootstrap salaries are low early but equity drives long-term upside. Your startup activity ${hub.aiInsights.find((i) => i.includes('entrepreneurial')) ? 'aligns' : 'could strengthen'} this trajectory. See Startup Founder simulation on this page.`;
  }

  if (lower.includes('master') || lower.includes('degree')) {
    return `A Master's modifier adds ~12% to early-career salary in this model — strongest when combined with internships and target-city selection.`;
  }

  if (lower.includes('happiness') || lower.includes('balance') || lower.includes('stress')) {
    return `${sim.roleTitle}: stress index ${sim.curve.stress}/100, flexibility ${sim.curve.flexibility}/100. ${sim.curve.stress >= 75 ? 'High earnings often trade with intensity — plan recovery deliberately.' : 'Relatively balanced progression potential.'}`;
  }

  return `${hub.aiInsights[0] ?? ''} ${hub.aiInsights[1] ?? ''} Ask about cities, startup paths, or work-life balance.`;
}
