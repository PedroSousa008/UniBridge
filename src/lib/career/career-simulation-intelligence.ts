import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import {
  runSalarySimulation,
  SALARY_LOCATIONS,
  WHAT_IF_MODIFIERS,
  type CareerCurveMeta,
  type SimulationResult,
} from '@/lib/career/salary-simulation';

export type SimulationPathType = 'corporate' | 'startup' | 'entrepreneurial';

export interface SimulationWhatIf {
  id: string;
  label: string;
  description: string;
  salaryMultiplier: number;
  stressDelta: number;
  flexibilityDelta: number;
}

export const SIMULATION_PATH_TYPES: { id: SimulationPathType; label: string; description: string }[] = [
  { id: 'corporate', label: 'Corporate path', description: 'Structured growth in established companies' },
  { id: 'startup', label: 'Startup path', description: 'High-growth venture environments' },
  { id: 'entrepreneurial', label: 'Founder journey', description: 'Build, fund, and scale your own venture' },
];

export const SIMULATION_WHAT_IF: SimulationWhatIf[] = [
  ...WHAT_IF_MODIFIERS.map((w) => ({
    id: w.id,
    label: w.label,
    description: w.description,
    salaryMultiplier: w.salaryMultiplier,
    stressDelta: w.id === 'startup' ? 8 : w.id === 'masters' ? -3 : 0,
    flexibilityDelta: w.id === 'startup' ? 12 : w.id === 'masters' ? -5 : 0,
  })),
  { id: 'abroad', label: 'Move abroad', description: 'Relocate to a global hub city', salaryMultiplier: 1.05, stressDelta: 5, flexibilityDelta: -5 },
  { id: 'networking', label: 'Improve networking', description: 'Stronger professional network', salaryMultiplier: 1.04, stressDelta: -2, flexibilityDelta: 0 },
  { id: 'consulting', label: 'Focus on consulting', description: 'Client-facing analytical track', salaryMultiplier: 1.1, stressDelta: 12, flexibilityDelta: -15 },
  { id: 'remote', label: 'Prioritize remote flexibility', description: 'Location-independent lifestyle', salaryMultiplier: 0.96, stressDelta: -8, flexibilityDelta: 25 },
];

export interface DayInLifeBlock {
  time: string;
  title: string;
  detail: string;
  mood: 'calm' | 'intense' | 'social' | 'focus' | 'uncertain';
}

export interface LifeTimelineNode {
  age: number;
  title: string;
  description: string;
  cinematic: string;
}

export interface CareerRiskProfile {
  jobStability: number;
  burnoutRisk: number;
  industryVolatility: number;
  automationRisk: number;
  startupFailureProb: number;
  summary: string;
}

export interface FutureProbability {
  score: number;
  label: string;
  factors: string[];
}

export interface LifestyleVisual {
  apartment: string;
  cityLife: string;
  travel: string;
  workSchedule: string;
  freeTime: string;
  flexibility: string;
  socialLife: string;
}

export interface WorkLifeIndicators {
  stress: number;
  flexibility: number;
  workHoursPerWeek: number;
  travelIntensity: number;
  freeTime: number;
  remotePossibility: number;
}

export interface TimeWealthAxis {
  money: number;
  time: number;
  freedom: number;
  lifestyle: number;
}

export interface CareerSimulation extends SimulationResult {
  pathType: SimulationPathType;
  dayInLife: DayInLifeBlock[];
  lifeTimeline: LifeTimelineNode[];
  risks: CareerRiskProfile;
  probability: FutureProbability;
  personalityFit: string[];
  strategicInsights: string[];
  lifestyleVisual: LifestyleVisual;
  cinematicMilestones: { id: string; label: string; age: number }[];
  workLife: WorkLifeIndicators;
  timeWealth: TimeWealthAxis;
  networkingIntensity: number;
  growthSpeed: number;
  headline: string;
}

export interface ScenarioCompareRow {
  id: string;
  label: string;
  stress: number;
  lifestyle: number;
  freedom: number;
  growth: number;
  money: number;
  networking: number;
  flexibility: number;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function roleKey(roleTitle: string, industry: string | null): string {
  return `${roleTitle} ${industry ?? ''}`.toLowerCase();
}

export function inferPersonalityTraits(profile: StudentCareerProfile): string[] {
  const traits: string[] = [];
  if (profile.hasStartup) traits.push('entrepreneurial');
  if (profile.gradeAverage != null && profile.gradeAverage >= 14) traits.push('analytical');
  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 85) traits.push('structured');
  if (profile.employabilityScore >= 60) traits.push('leadership-oriented');
  if (profile.inferredSkills.some((s) => s.includes('creative'))) traits.push('creative');
  if (traits.length === 0) traits.push('adaptable');
  return traits;
}

function adjustCurve(curve: CareerCurveMeta, pathType: SimulationPathType, modifiers: string[]): CareerCurveMeta {
  let stress = curve.stress;
  let flexibility = curve.flexibility;
  let freeTime = curve.freeTime;
  let growth = curve.growthRate;

  if (pathType === 'startup' || pathType === 'entrepreneurial') {
    stress = Math.min(95, stress + 10);
    flexibility = Math.min(90, flexibility + 15);
    freeTime = Math.max(20, freeTime - 15);
    growth = Math.min(1.28, growth + 0.04);
  }
  if (pathType === 'corporate') {
    stress = Math.min(90, stress + 5);
    flexibility = Math.max(15, flexibility - 10);
    freeTime = Math.max(25, freeTime - 10);
  }

  for (const id of modifiers) {
    const m = SIMULATION_WHAT_IF.find((w) => w.id === id);
    if (m) {
      stress = clamp(stress + m.stressDelta);
      flexibility = clamp(flexibility + m.flexibilityDelta);
    }
  }

  return { ...curve, stress, flexibility, freeTime, growthRate: growth };
}

export function buildDayInLife(
  roleTitle: string,
  city: string,
  curve: CareerCurveMeta,
  pathType: SimulationPathType,
  netMonthly: number,
  symbol: string
): DayInLifeBlock[] {
  const rk = roleTitle.toLowerCase();
  const isFounder = pathType === 'entrepreneurial' || rk.includes('founder');
  const isConsult = rk.includes('consult');
  const isPm = rk.includes('product');
  const isFinance = rk.includes('bank') || rk.includes('investment');

  if (isFounder) {
    return [
      { time: '07:00', title: 'Morning clarity', detail: 'Review metrics, inbox, runway — coffee in a quiet corner', mood: 'calm' },
      { time: '09:30', title: 'Investor / partner sync', detail: 'Pitch updates, tough questions, strategic pivots', mood: 'intense' },
      { time: '12:00', title: 'Team standup', detail: 'Priorities, blockers, ownership — fast decisions', mood: 'focus' },
      { time: '14:00', title: 'Deep work block', detail: 'Product, growth experiments, customer calls', mood: 'focus' },
      { time: '18:30', title: 'Networking dinner', detail: `Founders & angels in ${city} — relationships are currency`, mood: 'social' },
      { time: '22:00', title: 'Uncertainty window', detail: 'Stress peaks, but freedom feels real — tomorrow is unwritten', mood: 'uncertain' },
    ];
  }

  if (isConsult) {
    return [
      { time: '06:30', title: 'Early gym / commute', detail: 'Structure before client chaos — train or transit to office', mood: 'calm' },
      { time: '08:00', title: 'Client workshop', detail: 'Whiteboards, frameworks, senior presence in the room', mood: 'intense' },
      { time: '12:30', title: 'Working lunch', detail: 'Deliverable review with associates — precision matters', mood: 'focus' },
      { time: '15:00', title: 'Analysis sprint', detail: 'Excel, slides, data — billable hours mindset', mood: 'focus' },
      { time: '19:00', title: 'Team debrief', detail: 'Feedback, next steps — high standards', mood: 'intense' },
      { time: '21:00', title: 'Recovery', detail: `${symbol}${netMonthly.toLocaleString()}/mo lifestyle — rewarding but draining`, mood: 'calm' },
    ];
  }

  if (isPm) {
    return [
      { time: '07:00', title: 'Gym & planning', detail: 'Roadmap review before the city wakes', mood: 'calm' },
      { time: '09:00', title: 'Cross-functional sync', detail: 'Engineering, design, stakeholders — alignment', mood: 'focus' },
      { time: '11:00', title: 'User research', detail: 'Calls, insights, prioritization', mood: 'focus' },
      { time: '14:00', title: 'Deep work / specs', detail: curve.flexibility >= 60 ? 'Remote afternoon possible' : 'Office collaboration', mood: 'focus' },
      { time: '17:00', title: 'Leadership block', detail: 'Coaching, decisions, visibility', mood: 'intense' },
      { time: '19:30', title: 'City life', detail: `${city} dinner with product community — network growth`, mood: 'social' },
    ];
  }

  if (isFinance) {
    return [
      { time: '06:00', title: 'Markets check', detail: 'Global markets already moving', mood: 'intense' },
      { time: '08:00', title: 'Deal team', detail: 'Models, decks, client pressure', mood: 'intense' },
      { time: '13:00', title: 'Quick lunch at desk', detail: 'Rarely slow down', mood: 'focus' },
      { time: '16:00', title: 'Senior review', detail: 'Precision, late nights culture', mood: 'intense' },
      { time: '20:00', title: 'Client event', detail: 'High-stakes social capital', mood: 'social' },
      { time: '23:00', title: 'Wind down', detail: 'Premium lifestyle — little free time', mood: 'calm' },
    ];
  }

  return [
    { time: '08:00', title: 'Start the day', detail: `Professional rhythm in ${city}`, mood: 'calm' },
    { time: '10:00', title: 'Core work', detail: 'Projects, collaboration, growth', mood: 'focus' },
    { time: '13:00', title: 'Midday reset', detail: 'Lunch, walk, recharge', mood: 'calm' },
    { time: '15:00', title: 'Execution', detail: 'Deliverables and learning', mood: 'focus' },
    { time: '18:00', title: 'Evening', detail: 'Balance building — social or rest', mood: 'social' },
  ];
}

export function buildLifeTimeline(
  studentAge: number,
  roleTitle: string,
  pathType: SimulationPathType,
  sim: SimulationResult
): LifeTimelineNode[] {
  const nodes: LifeTimelineNode[] = [
    {
      age: studentAge,
      title: 'Today',
      description: 'Building foundations — academics & first professional signals',
      cinematic: 'You are here — every choice compounds from this moment.',
    },
    {
      age: studentAge + 2,
      title: 'First internship',
      description: `Break into ${sim.industry} with real-world credibility`,
      cinematic: 'The first door opens — experience becomes your leverage.',
    },
    {
      age: 25,
      title: 'Promotion momentum',
      description: `${roleTitle} trajectory — salary ~${sim.location.symbol}${sim.netMonthlyFiveYear.toLocaleString()}/mo net`,
      cinematic: 'Visibility increases — your work starts shaping your identity.',
    },
  ];

  if (pathType === 'entrepreneurial' || pathType === 'startup') {
    nodes.push({
      age: 27,
      title: 'Startup creation',
      description: 'Founding moment — funding, team, market validation',
      cinematic: 'Uncertainty peaks — freedom and pressure coexist.',
    });
  }

  nodes.push({
    age: 30,
    title: pathType === 'entrepreneurial' ? 'Scale or pivot' : 'Senior leadership',
    description: `Lifestyle tier: ${sim.lifestyleFiveYear.tier} — ${sim.lifestyleFiveYear.apartment}`,
    cinematic: 'A different life rhythm — the tradeoffs become visible.',
  });

  nodes.push({
    age: 40,
    title: 'Long-term outcome',
    description: `Ten-year gross ~${sim.location.symbol}${sim.tenYearGross.toLocaleString()} — industry-defining experience`,
    cinematic: 'The arc completes — wealth, time, and meaning find balance.',
  });

  return nodes;
}

export function buildRisks(roleTitle: string, industry: string | null, pathType: SimulationPathType, curve: CareerCurveMeta): CareerRiskProfile {
  const rk = roleKey(roleTitle, industry);
  let jobStability = 70;
  let burnout = curve.stress;
  let volatility = curve.volatility === 'high' ? 75 : curve.volatility === 'medium' ? 50 : 30;
  let automation = 35;
  let startupFail = 15;

  if (rk.includes('consult')) {
    jobStability = 75;
    burnout = 82;
    volatility = 40;
  }
  if (rk.includes('bank') || rk.includes('finance')) {
    jobStability = 65;
    burnout = 88;
    volatility = 55;
    automation = 45;
  }
  if (rk.includes('tech') || rk.includes('software')) {
    automation = 55;
    volatility = 60;
  }
  if (pathType === 'entrepreneurial') {
    jobStability = 35;
    startupFail = 68;
    volatility = 85;
    burnout = 80;
  }
  if (pathType === 'startup') {
    jobStability = 50;
    startupFail = 45;
    volatility = 70;
  }

  const summary =
    burnout >= 80
      ? 'High intensity path — deliberate recovery is non-negotiable.'
      : volatility >= 70
        ? 'Dynamic industry — agility beats rigid planning.'
        : 'Relatively stable trajectory with manageable volatility.';

  return {
    jobStability: clamp(jobStability),
    burnoutRisk: clamp(burnout),
    industryVolatility: clamp(volatility),
    automationRisk: clamp(automation),
    startupFailureProb: clamp(startupFail),
    summary,
  };
}

export function buildProbability(
  profile: StudentCareerProfile,
  compatibility: number,
  pathType: SimulationPathType,
  traits: string[]
): FutureProbability {
  let score = compatibility * 0.45 + profile.profileStrength * 0.2 + profile.employabilityScore * 0.15;
  if (profile.hasStartup && (pathType === 'startup' || pathType === 'entrepreneurial')) score += 15;
  if (traits.includes('analytical') && pathType === 'corporate') score += 8;
  score = clamp(score);

  let label = 'Moderately realistic — gaps to close';
  if (score >= 82) label = 'Highly realistic on your current trajectory';
  else if (score >= 68) label = 'Achievable with focused next steps';
  else if (score < 55) label = 'Ambitious — significant development needed';

  const factors: string[] = [];
  if (compatibility >= 75) factors.push('Strong compatibility alignment');
  if (profile.hasStartup) factors.push('Startup Hub activity');
  if (profile.gradeAverage != null && profile.gradeAverage >= 13) factors.push('Solid academic signal');
  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 80)
    factors.push('Consistent delivery track record');
  if (factors.length === 0) factors.push('Build experience and verified skills to raise realism');

  return { score, label, factors };
}

export function buildStrategicInsights(
  sim: CareerSimulation,
  profile: StudentCareerProfile,
  traits: string[]
): string[] {
  const lines: string[] = [];
  if (sim.compatibility >= 75) lines.push('This path fits your current strengths and ecosystem signals.');
  if (sim.curve.stress >= 80 && traits.includes('structured'))
    lines.push('Leadership development would significantly improve this trajectory.');
  if (traits.includes('entrepreneurial') && sim.pathType === 'corporate')
    lines.push('Your profile may perform better in fast-paced startup environments.');
  if (sim.workLife.freeTime < 40)
    lines.push('Protect free time deliberately — this path trades time for compounding growth.');
  if (profile.hasStartup && sim.pathType === 'entrepreneurial')
    lines.push('Founder journey aligns with your live Startup Hub momentum.');
  return lines.slice(0, 3);
}

export function runCareerSimulation(input: {
  careerId: string;
  roleTitle: string;
  industry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  locationId: string;
  compatibility: number;
  pathType: SimulationPathType;
  modifierIds?: string[];
  profile: StudentCareerProfile;
  studentAge: number;
}): CareerSimulation {
  let roleTitle = input.roleTitle;
  let industry = input.industry;
  if (input.pathType === 'entrepreneurial') {
    roleTitle = roleTitle.toLowerCase().includes('founder') ? roleTitle : 'Startup Founder';
    industry = industry ?? 'Entrepreneurship';
  }

  const salarySim = runSalarySimulation({
    careerId: input.careerId,
    roleTitle,
    industry,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    locationId: input.locationId,
    compatibility: input.compatibility,
    modifierIds: input.modifierIds?.filter((id) => WHAT_IF_MODIFIERS.some((w) => w.id === id)),
  });

  const curve = adjustCurve(salarySim.curve, input.pathType, input.modifierIds ?? []);
  const traits = inferPersonalityTraits(input.profile);

  const workLife: WorkLifeIndicators = {
    stress: curve.stress,
    flexibility: curve.flexibility,
    workHoursPerWeek: clamp(38 + (100 - curve.freeTime) * 0.35),
    travelIntensity: clamp(
      roleTitle.toLowerCase().includes('consult') ? 75 : input.locationId === 'london' || input.locationId === 'nyc' ? 55 : 35
    ),
    freeTime: curve.freeTime,
    remotePossibility: clamp(curve.flexibility),
  };

  const lifestyleVisual: LifestyleVisual = {
    apartment: salarySim.lifestyleFiveYear.apartment,
    cityLife: `Urban ${salarySim.location.city} rhythm — ${salarySim.lifestyleFiveYear.tier} tier`,
    travel: salarySim.lifestyleFiveYear.travel,
    workSchedule:
      workLife.workHoursPerWeek >= 55
        ? 'Long days, high intensity weeks'
        : workLife.remotePossibility >= 60
          ? 'Hybrid / remote-flexible cadence'
          : 'Structured office-week rhythm',
    freeTime: `${workLife.freeTime}% free-time index — ${curve.freeTime >= 50 ? 'evenings & weekends protected' : 'limited — peak career phase'}`,
    flexibility: `${workLife.flexibility}% flexibility — ${input.pathType === 'startup' ? 'high autonomy' : 'process-driven'}`,
    socialLife:
      workLife.stress >= 75
        ? 'Selective social energy — high-impact networking'
        : 'Active city social life alongside career',
  };

  const timeWealth: TimeWealthAxis = {
    money: clamp((salarySim.netMonthlyFiveYear / 8000) * 100),
    time: curve.freeTime,
    freedom: curve.flexibility,
    lifestyle: clamp(
      (salarySim.lifestyleFiveYear.tier === 'premium' ? 85 : salarySim.lifestyleFiveYear.tier === 'comfortable' ? 65 : 45) -
        curve.stress * 0.2
    ),
  };

  const cinematicMilestones = [
    { id: 'promo', label: 'First promotion', age: input.studentAge + 4 },
    { id: 'intl', label: 'International move', age: 28 },
    { id: 'lead', label: 'Management role', age: 32 },
  ];
  if (input.pathType === 'entrepreneurial') {
    cinematicMilestones.unshift({ id: 'fund', label: 'First startup funding', age: input.studentAge + 5 });
  }

  const headline = `A day as ${roleTitle} in ${salarySim.location.city}`;

  return {
    ...salarySim,
    curve,
    pathType: input.pathType,
    dayInLife: buildDayInLife(roleTitle, salarySim.location.city, curve, input.pathType, salarySim.netMonthlyFiveYear, salarySim.location.symbol),
    lifeTimeline: buildLifeTimeline(input.studentAge, roleTitle, input.pathType, salarySim),
    risks: buildRisks(roleTitle, industry, input.pathType, curve),
    probability: buildProbability(input.profile, input.compatibility, input.pathType, traits),
    personalityFit: traits,
    strategicInsights: [],
    lifestyleVisual,
    cinematicMilestones,
    workLife,
    timeWealth,
    networkingIntensity: clamp(40 + curve.growthRate * 25 + (input.modifierIds?.includes('networking') ? 15 : 0)),
    growthSpeed: clamp(curve.growthRate * 70),
    headline,
  };
}

export function finalizeSimulation(sim: CareerSimulation, profile: StudentCareerProfile): CareerSimulation {
  return {
    ...sim,
    strategicInsights: buildStrategicInsights(sim, profile, sim.personalityFit),
  };
}

export function compareScenarios(simulations: CareerSimulation[]): ScenarioCompareRow[] {
  return simulations.map((s) => ({
    id: s.careerId + s.location.id,
    label: `${s.roleTitle} · ${s.location.city}`,
    stress: s.workLife.stress,
    lifestyle: s.timeWealth.lifestyle,
    freedom: s.timeWealth.freedom,
    growth: s.growthSpeed,
    money: s.timeWealth.money,
    networking: s.networkingIntensity,
    flexibility: s.workLife.flexibility,
  }));
}

export function simulationAdvisor(prompt: string, active: CareerSimulation, compare: CareerSimulation[]): string {
  const p = prompt.toLowerCase();
  if (p.includes('abroad') || p.includes('move')) {
    return `Moving to ${active.location.city} shifts purchasing power and lifestyle tier — compare scenarios side-by-side before deciding.`;
  }
  if (p.includes('startup') || p.includes('founder')) {
    return active.pathType === 'entrepreneurial'
      ? `Founder path: ${active.probability.label}. Failure risk ${active.risks.startupFailureProb}% — upside is real but volatility is high.`
      : 'Toggle Founder journey path type to see the full entrepreneurial simulation.';
  }
  if (compare.length >= 2) {
    const bestLife = [...compare].sort((a, b) => b.timeWealth.lifestyle - a.timeWealth.lifestyle)[0]!;
    const bestMoney = [...compare].sort((a, b) => b.timeWealth.money - a.timeWealth.money)[0]!;
    return `${bestMoney.roleTitle} in ${bestMoney.location.city} maximizes wealth; ${bestLife.roleTitle} in ${bestLife.location.city} optimizes lifestyle balance. Your call defines the tradeoff.`;
  }
  return `${active.probability.label} — ${active.strategicInsights[0] ?? 'Explore what-if variables to stress-test your future.'}`;
}
