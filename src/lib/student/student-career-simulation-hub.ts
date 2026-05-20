import { prisma } from '@/lib/db';
import {
  compareScenarios,
  finalizeSimulation,
  runCareerSimulation,
  SIMULATION_PATH_TYPES,
  SIMULATION_WHAT_IF,
  type CareerSimulation,
  type ScenarioCompareRow,
  type SimulationPathType,
} from '@/lib/career/career-simulation-intelligence';
import { SALARY_LOCATIONS } from '@/lib/career/salary-simulation';
import { buildStudentProfile, loadStudentCareerPathsHub } from '@/lib/student/student-career-paths';

export interface SimulationCareerOption {
  id: string;
  roleTitle: string;
  industry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  compatibility: number;
  isPrimary: boolean;
}

export interface CareerSimulationHub {
  studentAge: number;
  yearOfStudy: number | null;
  careers: SimulationCareerOption[];
  locations: typeof SALARY_LOCATIONS;
  pathTypes: typeof SIMULATION_PATH_TYPES;
  whatIfModifiers: typeof SIMULATION_WHAT_IF;
  activeSimulation: CareerSimulation;
  compareSimulations: CareerSimulation[];
  scenarioComparison: ScenarioCompareRow[];
  presetScenarios: { id: string; label: string; careerId: string; locationId: string; pathType: SimulationPathType }[];
  personalityTraits: string[];
  serverTime: string;
}

const PRESETS: CareerSimulationHub['presetScenarios'] = [
  { id: 'consult-london', label: 'Consultant in London', careerId: 'consulting', locationId: 'london', pathType: 'corporate' },
  { id: 'founder-lisbon', label: 'Startup Founder in Lisbon', careerId: 'founder', locationId: 'lisbon', pathType: 'entrepreneurial' },
  { id: 'pm-berlin', label: 'Product Manager in Berlin', careerId: 'product', locationId: 'berlin', pathType: 'corporate' },
  { id: 'ib-nyc', label: 'Investment Banker in NYC', careerId: 'finance', locationId: 'nyc', pathType: 'corporate' },
];

function presetRole(id: string): { roleTitle: string; industry: string; salaryMin: number; salaryMax: number } {
  switch (id) {
    case 'consulting':
      return { roleTitle: 'Management Consultant', industry: 'Consulting', salaryMin: 45000, salaryMax: 75000 };
    case 'founder':
      return { roleTitle: 'Startup Founder', industry: 'Entrepreneurship', salaryMin: 28000, salaryMax: 55000 };
    case 'product':
      return { roleTitle: 'Product Manager', industry: 'Technology', salaryMin: 50000, salaryMax: 85000 };
    case 'finance':
      return { roleTitle: 'Investment Banker', industry: 'Finance', salaryMin: 70000, salaryMax: 120000 };
    default:
      return { roleTitle: 'Professional', industry: 'General', salaryMin: 40000, salaryMax: 65000 };
  }
}

function resolveCareer(
  careers: SimulationCareerOption[],
  careerId?: string
): SimulationCareerOption {
  if (careerId) {
    const found = careers.find((c) => c.id === careerId);
    if (found) return found;
    const preset = PRESETS.find((p) => p.careerId === careerId);
    if (preset) {
      const meta = presetRole(preset.careerId);
      return {
        id: preset.careerId,
        roleTitle: meta.roleTitle,
        industry: meta.industry,
        salaryMin: meta.salaryMin,
        salaryMax: meta.salaryMax,
        compatibility: 70,
        isPrimary: false,
      };
    }
  }
  return careers.find((c) => c.isPrimary) ?? careers[0]!;
}

export async function loadStudentCareerSimulationHub(
  userId: string,
  options?: {
    careerId?: string;
    locationId?: string;
    pathType?: SimulationPathType;
    modifierIds?: string[];
    compareIds?: string[];
    presetId?: string;
  }
): Promise<CareerSimulationHub> {
  const [profile, pathsHub, studentRow] = await Promise.all([
    buildStudentProfile(userId),
    loadStudentCareerPathsHub(userId),
    prisma.studentProfile.findUnique({ where: { userId } }),
  ]);

  const studentAge = Math.min(28, Math.max(18, 18 + (studentRow?.yearOfStudy ?? 2)));
  const careers: SimulationCareerOption[] = [];

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

  for (const preset of PRESETS) {
    if (!careers.some((c) => c.id === preset.careerId)) {
      const meta = presetRole(preset.careerId);
      careers.push({
        id: preset.careerId,
        roleTitle: meta.roleTitle,
        industry: meta.industry,
        salaryMin: meta.salaryMin,
        salaryMax: meta.salaryMax,
        compatibility: 65,
        isPrimary: false,
      });
    }
  }

  let careerId = options?.careerId;
  let locationId = options?.locationId ?? 'lisbon';
  let pathType: SimulationPathType = options?.pathType ?? 'corporate';

  if (options?.presetId) {
    const preset = PRESETS.find((p) => p.id === options.presetId);
    if (preset) {
      careerId = preset.careerId;
      locationId = preset.locationId;
      pathType = preset.pathType;
    }
  }

  const activeCareer = resolveCareer(careers, careerId);
  const modifierIds = options?.modifierIds ?? [];

  const rawActive = runCareerSimulation({
    careerId: activeCareer.id,
    roleTitle: activeCareer.roleTitle,
    industry: activeCareer.industry,
    salaryMin: activeCareer.salaryMin,
    salaryMax: activeCareer.salaryMax,
    locationId,
    compatibility: activeCareer.compatibility,
    pathType,
    modifierIds,
    profile,
    studentAge,
  });
  const activeSimulation = finalizeSimulation(rawActive, profile);

  const compareIds = options?.compareIds ?? [];
  const compareSimulations: CareerSimulation[] = [];

  for (const cid of compareIds.slice(0, 3)) {
    const c = resolveCareer(careers, cid);
    const sim = finalizeSimulation(
      runCareerSimulation({
        careerId: c.id,
        roleTitle: c.roleTitle,
        industry: c.industry,
        salaryMin: c.salaryMin,
        salaryMax: c.salaryMax,
        locationId: c.id === activeCareer.id ? locationId : 'lisbon',
        compatibility: c.compatibility,
        pathType: c.id === 'founder' ? 'entrepreneurial' : 'corporate',
        modifierIds,
        profile,
        studentAge,
      }),
      profile
    );
    if (!compareSimulations.some((x) => x.careerId === sim.careerId)) compareSimulations.push(sim);
  }

  if (compareSimulations.length === 0) {
    const alt = careers.find((c) => c.id !== activeCareer.id);
    if (alt) {
      compareSimulations.push(
        finalizeSimulation(
          runCareerSimulation({
            careerId: alt.id,
            roleTitle: alt.roleTitle,
            industry: alt.industry,
            salaryMin: alt.salaryMin,
            salaryMax: alt.salaryMax,
            locationId: 'lisbon',
            compatibility: alt.compatibility,
            pathType: alt.id === 'founder' ? 'entrepreneurial' : 'startup',
            modifierIds,
            profile,
            studentAge,
          }),
          profile
        )
      );
    }
  }

  compareSimulations.unshift(activeSimulation);
  const uniqueCompare = Array.from(new Map(compareSimulations.map((s) => [s.careerId + s.location.id, s])).values()).slice(0, 3);

  return {
    studentAge,
    yearOfStudy: studentRow?.yearOfStudy ?? null,
    careers,
    locations: SALARY_LOCATIONS,
    pathTypes: SIMULATION_PATH_TYPES,
    whatIfModifiers: SIMULATION_WHAT_IF,
    activeSimulation,
    compareSimulations: uniqueCompare,
    scenarioComparison: compareScenarios(uniqueCompare),
    presetScenarios: PRESETS,
    personalityTraits: activeSimulation.personalityFit,
    serverTime: new Date().toISOString(),
  };
}
