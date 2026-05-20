import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export interface SalaryLocation {
  id: string;
  city: string;
  country: string;
  currency: string;
  symbol: string;
  costOfLivingIndex: number;
  taxRate: number;
  salaryMultiplier: number;
}

export interface CareerCurveMeta {
  growthRate: number;
  volatility: 'low' | 'medium' | 'high';
  stress: number;
  flexibility: number;
  freeTime: number;
  tags: string[];
}

export interface SalaryStage {
  id: string;
  label: string;
  years: number;
  grossAnnual: number;
  netMonthly: number;
}

export interface LifestyleOutcome {
  tier: 'building' | 'comfortable' | 'premium';
  apartment: string;
  travel: string;
  car: string;
  monthlySavings: number;
  workLifeBalance: string;
  summary: string;
}

export interface SimulationResult {
  careerId: string;
  roleTitle: string;
  industry: string;
  location: SalaryLocation;
  compatibility: number;
  stages: SalaryStage[];
  startingGross: number;
  tenYearGross: number;
  netMonthlyNow: number;
  netMonthlyFiveYear: number;
  lifestyle: LifestyleOutcome;
  lifestyleFiveYear: LifestyleOutcome;
  curve: CareerCurveMeta;
  purchasingPowerNote: string;
}

export interface WhatIfModifier {
  id: string;
  label: string;
  salaryMultiplier: number;
  description: string;
}

export const SALARY_LOCATIONS: SalaryLocation[] = [
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', currency: 'EUR', symbol: '€', costOfLivingIndex: 1, taxRate: 0.28, salaryMultiplier: 1 },
  { id: 'porto', city: 'Porto', country: 'Portugal', currency: 'EUR', symbol: '€', costOfLivingIndex: 0.82, taxRate: 0.28, salaryMultiplier: 0.92 },
  { id: 'london', city: 'London', country: 'UK', currency: 'GBP', symbol: '£', costOfLivingIndex: 1.55, taxRate: 0.35, salaryMultiplier: 1.35 },
  { id: 'nyc', city: 'New York', country: 'USA', currency: 'USD', symbol: '$', costOfLivingIndex: 1.75, taxRate: 0.32, salaryMultiplier: 1.55 },
  { id: 'dubai', city: 'Dubai', country: 'UAE', currency: 'USD', symbol: '$', costOfLivingIndex: 1.2, taxRate: 0.05, salaryMultiplier: 1.25 },
  { id: 'berlin', city: 'Berlin', country: 'Germany', currency: 'EUR', symbol: '€', costOfLivingIndex: 1.05, taxRate: 0.38, salaryMultiplier: 1.1 },
  { id: 'singapore', city: 'Singapore', country: 'Singapore', currency: 'SGD', symbol: 'S$', costOfLivingIndex: 1.35, taxRate: 0.18, salaryMultiplier: 1.3 },
];

export const WHAT_IF_MODIFIERS: WhatIfModifier[] = [
  { id: 'masters', label: "Master's degree", salaryMultiplier: 1.12, description: 'Advanced degree premium in early career' },
  { id: 'gpa', label: 'Improve GPA (+1)', salaryMultiplier: 1.06, description: 'Stronger academic signal' },
  { id: 'internship', label: 'Top internship', salaryMultiplier: 1.08, description: 'Brand-name experience' },
  { id: 'startup', label: 'Join startup', salaryMultiplier: 0.92, description: 'Lower cash, higher upside' },
  { id: 'mba', label: 'MBA later', salaryMultiplier: 1.18, description: 'Mid-career acceleration' },
];

export const FINANCIAL_GOALS = [
  { id: 'house', label: 'Buy a home', targetEur: 80000, years: 8 },
  { id: 'travel', label: 'Travel freely', targetEur: 12000, years: 3 },
  { id: 'retire', label: 'Early financial freedom', targetEur: 400000, years: 20 },
  { id: 'invest', label: 'Startup investing', targetEur: 25000, years: 5 },
  { id: 'luxury', label: 'Premium lifestyle', targetEur: 50000, years: 5 },
];

const STAGE_LABELS = ['Junior', 'Mid-level', 'Senior', 'Director', 'Partner', 'Founder exit'];

function detectCurve(roleTitle: string, industry: string | null): CareerCurveMeta {
  const t = `${roleTitle} ${industry ?? ''}`.toLowerCase();
  if (t.includes('founder') || t.includes('entrepreneur')) {
    return { growthRate: 1.22, volatility: 'high', stress: 85, flexibility: 75, freeTime: 35, tags: ['Entrepreneurial', 'High Growth', 'High Stress'] };
  }
  if (t.includes('bank') || t.includes('investment') || t.includes('finance')) {
    return { growthRate: 1.18, volatility: 'medium', stress: 90, flexibility: 25, freeTime: 30, tags: ['High Salary', 'High Stress', 'Fast Growth'] };
  }
  if (t.includes('consult')) {
    return { growthRate: 1.15, volatility: 'low', stress: 80, flexibility: 30, freeTime: 35, tags: ['High Salary', 'Fast Growth', 'High Stress'] };
  }
  if (t.includes('product') || t.includes('software') || t.includes('data') || t.includes('tech')) {
    return { growthRate: 1.14, volatility: 'medium', stress: 55, flexibility: 70, freeTime: 55, tags: ['Remote Friendly', 'Fast Growth', 'Stable'] };
  }
  if (t.includes('marketing') || t.includes('design')) {
    return { growthRate: 1.1, volatility: 'medium', stress: 50, flexibility: 65, freeTime: 60, tags: ['Creative', 'Stable'] };
  }
  return { growthRate: 1.12, volatility: 'medium', stress: 60, flexibility: 50, freeTime: 50, tags: ['Stable'] };
}

function netMonthly(grossAnnual: number, taxRate: number): number {
  return Math.round((grossAnnual * (1 - taxRate)) / 12);
}

function lifestyleFromNet(netMonthly: number, location: SalaryLocation, tierOverride?: LifestyleOutcome['tier']): LifestyleOutcome {
  const adjusted = netMonthly / location.costOfLivingIndex;
  let tier: LifestyleOutcome['tier'] = tierOverride ?? 'building';
  if (adjusted >= 4500) tier = 'premium';
  else if (adjusted >= 2800) tier = 'comfortable';

  const apartment =
    tier === 'premium'
      ? `Modern ${location.city} apartment (central or premium district)`
      : tier === 'comfortable'
        ? `Quality apartment in a good ${location.city} neighborhood`
        : `Shared or suburban apartment while building savings`;

  const travel =
    tier === 'premium' ? '2–3 international trips per year' : tier === 'comfortable' ? '1–2 trips per year' : 'Local travel, 1 trip every 2 years';

  const car =
    tier === 'premium' ? 'Own or lease a quality vehicle' : tier === 'comfortable' ? 'Reliable used car or strong transit' : 'Public transport focus';

  const monthlySavings = Math.max(0, Math.round(adjusted * (tier === 'premium' ? 0.25 : tier === 'comfortable' ? 0.15 : 0.08)));

  return {
    tier,
    apartment,
    travel,
    car,
    monthlySavings,
    workLifeBalance:
      tier === 'premium' ? 'Demanding career, strong rewards' : tier === 'comfortable' ? 'Balanced progression' : 'Building phase — prioritize growth',
    summary: `In ${location.city}, an estimated lifestyle after progression could include ${apartment.toLowerCase()}, ${travel.toLowerCase()}, and ~${location.symbol}${monthlySavings.toLocaleString()} monthly savings.`,
  };
}

export function buildSalaryTimeline(
  baseGross: number,
  curve: CareerCurveMeta,
  location: SalaryLocation,
  modifierMult = 1
): SalaryStage[] {
  const start = Math.round(baseGross * location.salaryMultiplier * modifierMult);
  const years = [0, 3, 5, 10];
  const labels = ['Starting', '3 years', '5 years', '10 years'];

  return years.map((y, i) => {
    const gross = Math.round(start * Math.pow(curve.growthRate, y));
    return {
      id: `y${y}`,
      label: labels[i]!,
      years: y,
      grossAnnual: gross,
      netMonthly: netMonthly(gross, location.taxRate),
    };
  });
}

export function runSalarySimulation(input: {
  careerId: string;
  roleTitle: string;
  industry: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  locationId: string;
  compatibility: number;
  modifierIds?: string[];
}): SimulationResult {
  const location = SALARY_LOCATIONS.find((l) => l.id === input.locationId) ?? SALARY_LOCATIONS[0]!;
  const base = Math.round(((input.salaryMin ?? 40000) + (input.salaryMax ?? 70000)) / 2);
  const curve = detectCurve(input.roleTitle, input.industry);

  let modifierMult = 1;
  for (const id of input.modifierIds ?? []) {
    const m = WHAT_IF_MODIFIERS.find((w) => w.id === id);
    if (m) modifierMult *= m.salaryMultiplier;
  }

  const stages = buildSalaryTimeline(base, curve, location, modifierMult);
  const lifestyle = lifestyleFromNet(stages[0]!.netMonthly, location);
  const lifestyleFiveYear = lifestyleFromNet(stages.find((s) => s.years === 5)?.netMonthly ?? stages[2]!.netMonthly, location);

  const pp = stages[2]!.netMonthly / location.costOfLivingIndex;
  const lisbonPp = stages[2]!.grossAnnual / 1.45 / 12 / 1;

  return {
    careerId: input.careerId,
    roleTitle: input.roleTitle,
    industry: input.industry ?? 'General',
    location,
    compatibility: input.compatibility,
    stages,
    startingGross: stages[0]!.grossAnnual,
    tenYearGross: stages[3]!.grossAnnual,
    netMonthlyNow: stages[0]!.netMonthly,
    netMonthlyFiveYear: stages.find((s) => s.years === 5)?.netMonthly ?? stages[2]!.netMonthly,
    lifestyle,
    lifestyleFiveYear,
    curve,
    purchasingPowerNote:
      pp >= lisbonPp
        ? `Purchasing power in ${location.city} is stronger than Lisbon at this career stage.`
        : `Lisbon may offer better lifestyle value despite headline salary differences.`,
  };
}

export function compareLocationsForCareer(
  roleTitle: string,
  industry: string | null,
  salaryMin: number | null,
  salaryMax: number | null,
  careerId: string,
  compatibility: number
) {
  return SALARY_LOCATIONS.map((loc) => {
    const sim = runSalarySimulation({
      careerId,
      roleTitle,
      industry,
      salaryMin,
      salaryMax,
      locationId: loc.id,
      compatibility,
    });
    return {
      location: loc,
      netMonthlyFiveYear: sim.netMonthlyFiveYear,
      tenYearGross: sim.tenYearGross,
      monthlySavings: sim.lifestyleFiveYear.monthlySavings,
      tier: sim.lifestyleFiveYear.tier,
    };
  }).sort((a, b) => b.netMonthlyFiveYear - a.netMonthlyFiveYear);
}

export function startupFounderSimulation(locationId: string): {
  stages: { label: string; salary: number; equity: string }[];
  fundingRounds: { round: string; dilution: string; valuation: string }[];
  exitScenarios: { label: string; outcome: string }[];
} {
  const loc = SALARY_LOCATIONS.find((l) => l.id === locationId) ?? SALARY_LOCATIONS[0]!;
  return {
    stages: [
      { label: 'Bootstrap (Year 0–2)', salary: Math.round(24000 * loc.salaryMultiplier), equity: '100% founder' },
      { label: 'Seed funded', salary: Math.round(42000 * loc.salaryMultiplier), equity: '~70% after dilution' },
      { label: 'Series A', salary: Math.round(65000 * loc.salaryMultiplier), equity: '~45% cumulative' },
      { label: 'Scale / exit window', salary: Math.round(95000 * loc.salaryMultiplier), equity: 'Varies — liquidity event' },
    ],
    fundingRounds: [
      { round: 'Pre-seed', dilution: '10–15%', valuation: '€1–3M' },
      { round: 'Seed', dilution: '15–20%', valuation: '€5–12M' },
      { round: 'Series A', dilution: '20–25%', valuation: '€20–50M' },
    ],
    exitScenarios: [
      { label: 'Modest exit', outcome: '€500K–2M personal outcome (illustrative)' },
      { label: 'Strong exit', outcome: '€5M+ if equity retained through scale' },
      { label: 'Continue building', outcome: 'Salary + equity — long-term wealth path' },
    ],
  };
}

export function financialGoalProgress(monthlySavings: number, goalId: string): { feasible: boolean; years: number; message: string } {
  const goal = FINANCIAL_GOALS.find((g) => g.id === goalId);
  if (!goal) return { feasible: false, years: 99, message: 'Unknown goal' };
  const annual = monthlySavings * 12;
  if (annual <= 0) return { feasible: false, years: 99, message: 'Increase savings capacity first' };
  const years = Math.ceil(goal.targetEur / annual);
  return {
    feasible: years <= goal.years,
    years,
    message:
      years <= goal.years
        ? `On track in ~${years} years at current savings pace`
        : `Needs ~${years} years — accelerate income or reduce goal timeline`,
  };
}

export function aiFinancialInsight(
  simulations: SimulationResult[],
  profile: StudentCareerProfile
): string[] {
  const insights: string[] = [];
  if (simulations.length === 0) return ['Select a career path to unlock personalized financial intelligence.'];

  const top = simulations[0]!;
  const founder = simulations.find((s) => s.roleTitle.toLowerCase().includes('founder'));
  const consult = simulations.find((s) => s.roleTitle.toLowerCase().includes('consult'));
  const finance = simulations.find((s) => s.roleTitle.toLowerCase().includes('bank') || s.roleTitle.toLowerCase().includes('finance'));

  insights.push(
    `${top.roleTitle} in ${top.location.city}: ~${top.location.symbol}${top.netMonthlyFiveYear.toLocaleString()}/mo net at 5 years (${top.compatibility}% path compatibility).`
  );

  if (consult && finance) {
    insights.push(
      consult.netMonthlyFiveYear > finance.netMonthlyFiveYear
        ? 'Consulting may maximize early-career earnings in this simulation.'
        : 'Finance paths can outpace consulting at senior levels despite higher early stress.'
    );
  }

  if (founder && profile.hasStartup) {
    insights.push('Your entrepreneurial profile may outperform traditional paths long-term — with higher volatility.');
  } else if (founder) {
    insights.push('Founder paths trade early salary for upside — align with Startup Hub activity to improve realism.');
  }

  if (top.curve.stress >= 80) {
    insights.push('This path has higher salary growth but lower work-life balance — plan recovery and boundaries deliberately.');
  }

  return insights.slice(0, 4);
}
