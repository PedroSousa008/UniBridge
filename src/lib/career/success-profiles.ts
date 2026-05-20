import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type SuccessCategory =
  | 'Business'
  | 'Startups'
  | 'Law'
  | 'Technology'
  | 'Finance'
  | 'Entrepreneurship'
  | 'Portuguese Leaders';

export interface AgeMilestone {
  age: number;
  title: string;
  detail: string;
}

export interface SuccessProfile {
  id: string;
  name: string;
  category: SuccessCategory;
  nationality: string;
  currentRole: string;
  sourceNote: string;
  milestones: AgeMilestone[];
  habits: string[];
  decisions: string[];
  beforeSuccess: string[];
  whatTheyDidDifferently: string[];
}

export const SUCCESS_PROFILES: SuccessProfile[] = [
  {
    id: 'musk-20',
    name: 'Elon Musk',
    category: 'Technology',
    nationality: 'International',
    currentRole: 'CEO — Tesla, SpaceX',
    sourceNote: 'Public biographies, university records, early Zip2 history',
    milestones: [
      { age: 18, title: 'Left South Africa', detail: 'Moved to Canada for university access' },
      { age: 19, title: 'Queen\'s University', detail: 'Studied before transferring' },
      { age: 20, title: 'Transferred to Penn', detail: 'Physics & economics — not yet a founder' },
      { age: 24, title: 'Zip2 founded', detail: 'First company — years of intense work ahead' },
    ],
    habits: ['Self-directed learning beyond coursework', 'Programming experimentation', 'Long work blocks'],
    decisions: ['Moved countries for opportunity', 'Chose technical + business combination'],
    beforeSuccess: ['Worked difficult jobs early', 'No major funding at 20', 'Uncertain career path'],
    whatTheyDidDifferently: ['Built technical skills before capital', 'Accepted high personal risk early'],
  },
  {
    id: 'pt-farfetch',
    name: 'José Neves',
    category: 'Portuguese Leaders',
    nationality: 'Portugal',
    currentRole: 'Founder — Farfetch',
    sourceNote: 'Public interviews, Farfetch founding history, Portuguese press',
    milestones: [
      { age: 19, title: 'Shoe business interest', detail: 'Early retail experimentation in family context' },
      { age: 21, title: 'London exposure', detail: 'Studied & worked in fashion/tech intersection' },
      { age: 27, title: 'Software for footwear', detail: 'Precursor ideas before Farfetch scale' },
      { age: 30, title: 'Farfetch founded', detail: '2007 — years of iteration followed' },
    ],
    habits: ['Industry immersion', 'Iterative product thinking', 'International networking'],
    decisions: ['Bridged fashion + technology', 'Built in London ecosystem'],
    beforeSuccess: ['Multiple small ventures', 'No unicorn status in early 20s', 'Gradual domain expertise'],
    whatTheyDidDifferently: ['Deep sector knowledge before scaling', 'Chose global hub (London)'],
  },
  {
    id: 'pt-talkdesk',
    name: 'Tiago Paiva',
    category: 'Portuguese Leaders',
    nationality: 'Portugal',
    currentRole: 'Founder — Talkdesk',
    sourceNote: 'Company history, founder interviews, Portuguese startup ecosystem records',
    milestones: [
      { age: 20, title: 'University studies', detail: 'Engineering path in Portugal' },
      { age: 23, title: 'Early work experience', detail: 'Corporate exposure before founding' },
      { age: 26, title: 'Talkdesk idea', detail: 'Customer service pain point identified' },
      { age: 28, title: 'Founded Talkdesk', detail: '2011 — bootstrap then US expansion' },
    ],
    habits: ['Customer obsession', 'Technical product depth', 'US market focus early'],
    decisions: ['Moved go-to-market to US', 'Bootstrapped before institutional capital'],
    beforeSuccess: ['Rejected by accelerators initially (public interviews)', 'Small team beginnings'],
    whatTheyDidDifferently: ['Solved clear B2B pain', 'Expanded beyond Portugal early'],
  },
  {
    id: 'pt-lawyer',
    name: 'Maria Manuel Leitão Marques',
    category: 'Law',
    nationality: 'Portugal',
    currentRole: 'Legal scholar & public leader',
    sourceNote: 'Academic CV, public appointments — illustrative legal excellence path',
    milestones: [
      { age: 20, title: 'Law degree progress', detail: 'Strong academic focus' },
      { age: 23, title: 'Graduation', detail: 'Entered competitive legal market' },
      { age: 28, title: 'Academic specialization', detail: 'Deep expertise building' },
      { age: 35, title: 'Recognized authority', detail: 'Public & academic leadership' },
    ],
    habits: ['Disciplined study', 'Writing & argumentation', 'Institutional networking'],
    decisions: ['Specialized early', 'Combined academia + practice'],
    beforeSuccess: ['Long qualification path', 'Merit-based progression only'],
    whatTheyDidDifferently: ['Chose depth over breadth', 'Built reputation over decades'],
  },
  {
    id: 'consulting-path',
    name: 'McKinsey Partner Archetype',
    category: 'Business',
    nationality: 'International',
    currentRole: 'Senior Partner (composite)',
    sourceNote: 'Industry-standard consulting career frameworks — illustrative composite',
    milestones: [
      { age: 21, title: 'Top university', detail: 'Strong grades & extracurriculars' },
      { age: 22, title: 'Summer internship', detail: 'Prestigious firm internship' },
      { age: 24, title: 'Analyst role', detail: 'High hours, steep learning' },
      { age: 30, title: 'Engagement manager', detail: 'Leadership of case teams' },
    ],
    habits: ['Structured problem solving', 'Presentation excellence', 'Relentless preparation'],
    decisions: ['Chose prestige early', 'Delayed specialization until mid-level'],
    beforeSuccess: ['Rejected from some firms first', 'Brutal hours in analyst years'],
    whatTheyDidDifferently: ['Treated every project as portfolio', 'Built sponsor relationships'],
  },
  {
    id: 'finance-analyst',
    name: 'Investment Banking Analyst Archetype',
    category: 'Finance',
    nationality: 'International',
    currentRole: 'Managing Director (composite)',
    sourceNote: 'Public finance career ladders — composite for education',
    milestones: [
      { age: 21, title: 'Finance degree', detail: 'Quantitative excellence' },
      { age: 22, title: 'Internship', detail: 'Bulge bracket or elite boutique' },
      { age: 23, title: 'Analyst program', detail: 'Intense 2-year foundation' },
      { age: 28, title: 'Associate / VP path', detail: 'Deal exposure accumulates' },
    ],
    habits: ['Excel & modeling mastery', 'Attention to detail', 'Network in deal flow'],
    decisions: ['Accepted early lifestyle tradeoff', 'Chose high-earning track'],
    beforeSuccess: ['80+ hour weeks early', 'High attrition around analyst years'],
    whatTheyDidDifferently: ['Speed + accuracy under pressure', 'Reliable staffer reputation'],
  },
];

export interface AtAgeComparison {
  profile: SuccessProfile;
  studentAge: number;
  targetAge: number;
  similarityScore: number;
  studentSnapshot: { label: string; value: string }[];
  roleModelSnapshot: { label: string; value: string }[];
  stillNeed: string[];
  timeline: { age: number; student?: string; roleModel: string }[];
}

export function computeSimilarity(profile: StudentCareerProfile, success: SuccessProfile, studentAge: number): number {
  let score = 35;
  if (profile.gradeAverage != null && profile.gradeAverage >= 14) score += 12;
  if (profile.hasStartup) score += success.category === 'Startups' || success.category === 'Portuguese Leaders' ? 18 : 8;
  if (profile.profileStrength >= 60) score += 10;
  if (profile.employabilityScore >= 55) score += 8;
  if (profile.engagementScore >= 50) score += 7;
  if (profile.assignmentCompletionRate != null && profile.assignmentCompletionRate >= 80) score += 5;
  return Math.min(92, Math.round(score));
}

export function buildAtAgeComparison(
  profile: StudentCareerProfile,
  successId: string,
  studentAge: number,
  yearOfStudy: number | null
): AtAgeComparison | null {
  const sp = SUCCESS_PROFILES.find((s) => s.id === successId);
  if (!sp) return null;

  const targetAge = studentAge;
  const milestoneAtAge = sp.milestones.find((m) => Math.abs(m.age - targetAge) <= 2) ?? sp.milestones[0];

  const studentSnapshot = [
    { label: 'Age', value: String(studentAge) },
    { label: 'Studies', value: yearOfStudy ? `Year ${yearOfStudy}` : 'University' },
    { label: 'Grades', value: profile.gradeAverage != null ? `${profile.gradeAverage.toFixed(1)}/20` : 'Building' },
    { label: 'Startup', value: profile.hasStartup ? 'Active founder/member' : 'Not yet' },
    { label: 'Profile', value: `${profile.profileStrength}% strength` },
    { label: 'Employability', value: `${Math.round(profile.employabilityScore)}%` },
  ];

  const roleModelSnapshot = [
    { label: 'Age', value: String(milestoneAtAge?.age ?? targetAge) },
    { label: 'Focus', value: milestoneAtAge?.title ?? 'Building foundation' },
    { label: 'Detail', value: milestoneAtAge?.detail ?? '' },
    { label: 'Path', value: sp.currentRole },
  ];

  const stillNeed: string[] = [];
  if (!profile.hasStartup && (sp.category === 'Startups' || sp.category === 'Portuguese Leaders')) {
    stillNeed.push('Entrepreneurial projects or startup exposure');
  }
  if (profile.profileStrength < 55) stillNeed.push('Stronger CV & profile depth');
  if (profile.gradeAverage != null && profile.gradeAverage < 13) stillNeed.push('Academic excellence for competitive paths');
  if (profile.engagementScore < 45) stillNeed.push('Networking & platform engagement');
  if (stillNeed.length === 0) stillNeed.push('Continue internships and leadership projects');

  const timeline = [18, 21, 25, 30, 40].map((age) => ({
    age,
    student: age === studentAge ? 'You are here' : age < studentAge ? '—' : 'Future',
    roleModel: sp.milestones.find((m) => m.age === age)?.title ?? (age < (milestoneAtAge?.age ?? 25) ? 'Earlier stage' : 'Growth phase'),
  }));

  return {
    profile: sp,
    studentAge,
    targetAge,
    similarityScore: computeSimilarity(profile, sp, studentAge),
    studentSnapshot,
    roleModelSnapshot,
    stillNeed: stillNeed.slice(0, 4),
    timeline,
  };
}

export function portugueseProfiles(): SuccessProfile[] {
  return SUCCESS_PROFILES.filter((p) => p.category === 'Portuguese Leaders' || p.nationality === 'Portugal');
}
