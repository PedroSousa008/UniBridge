import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import { parsePathRequirements } from '@/lib/career/compatibility-engine';
import type { CareerPath } from '@prisma/client';

export type SkillCategory = 'technical' | 'soft' | 'entrepreneurial' | 'creative';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillVerification = 'verified' | 'self_reported';

export interface SkillCatalogEntry {
  id: string;
  name: string;
  category: SkillCategory;
  careers: string[];
  description: string;
}

export const SKILL_CATALOG: SkillCatalogEntry[] = [
  { id: 'excel', name: 'Excel', category: 'technical', careers: ['Consulting', 'Finance', 'Investment Banking'], description: 'Spreadsheets, modeling, and data organization.' },
  { id: 'python', name: 'Python', category: 'technical', careers: ['Software Engineering', 'Data Science', 'Product Management'], description: 'Programming and automation.' },
  { id: 'finance-modeling', name: 'Finance Modeling', category: 'technical', careers: ['Finance', 'Investment Banking', 'Consulting'], description: 'Valuation and financial analysis.' },
  { id: 'marketing', name: 'Marketing', category: 'technical', careers: ['Marketing', 'Product Management', 'Growth'], description: 'Go-to-market and customer acquisition.' },
  { id: 'data-analysis', name: 'Data Analysis', category: 'technical', careers: ['Product Management', 'Consulting', 'Data Science'], description: 'Metrics, dashboards, and insights.' },
  { id: 'sql', name: 'SQL', category: 'technical', careers: ['Product Management', 'Data Science', 'Software Engineering'], description: 'Structured data querying.' },
  { id: 'leadership', name: 'Leadership', category: 'soft', careers: ['Consulting', 'Management', 'Entrepreneurship'], description: 'Leading teams and initiatives.' },
  { id: 'communication', name: 'Communication', category: 'soft', careers: ['Consulting', 'Sales', 'Product Management'], description: 'Clear written and verbal expression.' },
  { id: 'teamwork', name: 'Teamwork', category: 'soft', careers: ['All corporate roles', 'Consulting', 'Startups'], description: 'Collaboration in group settings.' },
  { id: 'negotiation', name: 'Negotiation', category: 'soft', careers: ['Sales', 'Law', 'Business Development'], description: 'Stakeholder alignment and deals.' },
  { id: 'public-speaking', name: 'Public Speaking', category: 'soft', careers: ['Consulting', 'Entrepreneurship', 'Law'], description: 'Presentations and pitches.' },
  { id: 'pitching', name: 'Pitching', category: 'entrepreneurial', careers: ['Startup Founder', 'Venture', 'Sales'], description: 'Investor and customer pitches.' },
  { id: 'market-validation', name: 'Market Validation', category: 'entrepreneurial', careers: ['Startup Founder', 'Product Management'], description: 'Testing ideas with real users.' },
  { id: 'networking', name: 'Networking', category: 'entrepreneurial', careers: ['Entrepreneurship', 'Sales', 'Consulting'], description: 'Building professional relationships.' },
  { id: 'sales', name: 'Sales', category: 'entrepreneurial', careers: ['Sales', 'Startup Founder', 'Business Development'], description: 'Revenue generation and closing.' },
  { id: 'product-thinking', name: 'Product Thinking', category: 'entrepreneurial', careers: ['Product Management', 'Startup Founder'], description: 'User problems and product strategy.' },
  { id: 'design', name: 'Design', category: 'creative', careers: ['UX Design', 'Marketing', 'Creative Director'], description: 'Visual and experience design.' },
  { id: 'storytelling', name: 'Storytelling', category: 'creative', careers: ['Marketing', 'Media', 'Entrepreneurship'], description: 'Narrative and brand stories.' },
  { id: 'branding', name: 'Branding', category: 'creative', careers: ['Marketing', 'Startup Founder'], description: 'Identity and positioning.' },
  { id: 'content-creation', name: 'Content Creation', category: 'creative', careers: ['Marketing', 'Media', 'Social'], description: 'Content for channels and campaigns.' },
];

export interface SkillSource {
  type: string;
  label: string;
  href: string | null;
  impact: number;
  verifiedBy: string;
}

export interface TrackedSkill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  xp: number;
  verification: SkillVerification;
  whyIncreased: string;
  sources: SkillSource[];
  usedIn: { label: string; href: string | null }[];
  careers: string[];
  trend: 'up' | 'stable' | 'new';
  recentDelta: number;
}

export interface SkillMilestone {
  id: string;
  skillId: string;
  title: string;
  earned: boolean;
  description: string;
}

export interface SkillGapItem {
  skill: string;
  importance: number;
  currentXp: number;
  targetXp: number;
  gapPercent: number;
}

export interface SkillRecommendation {
  id: string;
  type: 'course' | 'project' | 'internship' | 'workshop' | 'networking';
  title: string;
  reason: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
}

export interface IndustryCompareRow {
  skill: string;
  you: number;
  industry: number;
}

export interface SkillsRadarPoint {
  category: string;
  value: number;
  fullMark: number;
}

export interface EcosystemSkillInput {
  profile: StudentCareerProfile;
  assignments: { id: string; title: string; subjectName: string; status: string; score: number | null; isGroup: boolean }[];
  internships: { title: string; companyName: string; status: string }[];
  startups: { name: string; readinessScore: number; milestonesDone: number }[];
  journals: number;
  primaryRole: string | null;
  pathRequirements: ReturnType<typeof parsePathRequirements>;
  selfReported: { skillId: string; claimedLevel: number }[];
}

function levelFromXp(xp: number): SkillLevel {
  if (xp >= 85) return 'expert';
  if (xp >= 65) return 'advanced';
  if (xp >= 40) return 'intermediate';
  return 'beginner';
}

function clamp(n: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

type SkillAccumulator = {
  xp: number;
  sources: SkillSource[];
  usedIn: { label: string; href: string | null }[];
  why: string[];
};

function acc(
  map: Map<string, SkillAccumulator>,
  skillId: string,
  delta: number,
  source: SkillSource,
  used?: { label: string; href: string | null }
) {
  const cur = map.get(skillId) ?? { xp: 0, sources: [], usedIn: [], why: [] };
  cur.xp += delta;
  if (!cur.sources.some((s) => s.label === source.label)) cur.sources.push(source);
  if (used && !cur.usedIn.some((u) => u.label === used.label)) cur.usedIn.push(used);
  map.set(skillId, cur);
}

export function buildEcosystemSkills(input: EcosystemSkillInput): TrackedSkill[] {
  const map = new Map<string, SkillAccumulator>();
  const { profile } = input;
  const subjectText = profile.subjects.map((s) => s.name.toLowerCase()).join(' ');

  const touch = (
    skillId: string,
    delta: number,
    source: SkillSource,
    why: string,
    used?: { label: string; href: string | null }
  ) => {
    acc(map, skillId, delta, source, used);
    const cur = map.get(skillId)!;
    if (!cur.why.includes(why)) cur.why.push(why);
  };

  if (profile.gradeAverage != null) {
    const g = profile.gradeAverage;
    touch('data-analysis', g >= 13 ? 12 : 6, { type: 'gradebook', label: 'Academic average', href: '/student/academics/gradebook', impact: 12, verifiedBy: 'university' }, 'Strong academic performance');
    if (subjectText.match(/finance|economics|accounting/)) {
      touch('finance-modeling', g >= 14 ? 18 : 10, { type: 'subject', label: 'Finance coursework', href: '/student/academics/gradebook', impact: 18, verifiedBy: 'university' }, 'Finance subject grades');
      touch('excel', g >= 13 ? 15 : 8, { type: 'subject', label: 'Finance coursework', href: '/student/academics/gradebook', impact: 15, verifiedBy: 'university' }, 'Finance-related coursework');
    }
    if (subjectText.match(/programming|computer|software|data/)) {
      touch('python', g >= 14 ? 20 : 12, { type: 'subject', label: 'Technical coursework', href: '/student/academics/subjects', impact: 20, verifiedBy: 'university' }, 'Technical subject performance');
      touch('sql', g >= 13 ? 14 : 8, { type: 'subject', label: 'Technical coursework', href: '/student/academics/subjects', impact: 14, verifiedBy: 'university' }, 'Data/CS coursework');
    }
    if (subjectText.match(/marketing|communication/)) {
      touch('marketing', g >= 13 ? 16 : 9, { type: 'subject', label: 'Marketing coursework', href: '/student/academics/subjects', impact: 16, verifiedBy: 'university' }, 'Marketing subjects');
      touch('communication', g >= 12 ? 14 : 8, { type: 'subject', label: 'Communication coursework', href: '/student/academics/subjects', impact: 14, verifiedBy: 'university' }, 'Communication subjects');
    }
    if (subjectText.match(/design|media|creative/)) {
      touch('design', g >= 13 ? 17 : 10, { type: 'subject', label: 'Creative coursework', href: '/student/academics/subjects', impact: 17, verifiedBy: 'university' }, 'Creative subjects');
      touch('content-creation', g >= 12 ? 12 : 7, { type: 'subject', label: 'Creative coursework', href: '/student/academics/subjects', impact: 12, verifiedBy: 'university' }, 'Creative coursework');
    }
  }

  if (profile.attendanceAverage != null && profile.attendanceAverage >= 80) {
    touch('communication', 8, { type: 'attendance', label: 'Attendance consistency', href: '/student/academics/attendance', impact: 8, verifiedBy: 'university' }, 'Reliable participation');
  }

  if (profile.assignmentCompletionRate != null) {
    const c = profile.assignmentCompletionRate;
    touch('teamwork', c >= 85 ? 12 : 6, { type: 'assignments', label: 'Assignment completion', href: '/student/academics/assignments', impact: 12, verifiedBy: 'platform' }, 'Consistent deliverable completion');
  }

  for (const a of input.assignments) {
    if (a.status !== 'GRADED' || a.score == null) continue;
    const strong = a.score >= 80;
    touch(
      'data-analysis',
      strong ? 8 : 4,
      { type: 'assignment', label: a.title, href: '/student/academics/assignments', impact: 8, verifiedBy: 'teacher' },
      `Graded assignment: ${a.title}`,
      { label: a.title, href: '/student/academics/assignments' }
    );
    if (a.isGroup) {
      touch(
        'teamwork',
        strong ? 14 : 8,
        { type: 'assignment', label: `Group: ${a.title}`, href: '/student/academics/assignments', impact: 14, verifiedBy: 'teacher' },
        'Group project participation',
        { label: a.title, href: '/student/academics/assignments' }
      );
      touch('leadership', strong ? 10 : 5, { type: 'assignment', label: `Group: ${a.title}`, href: '/student/academics/assignments', impact: 10, verifiedBy: 'teacher' }, 'Group project leadership potential');
    }
    if (a.title.toLowerCase().match(/presentation|pitch|demo/)) {
      touch(
        'public-speaking',
        strong ? 16 : 9,
        { type: 'assignment', label: a.title, href: '/student/academics/assignments', impact: 16, verifiedBy: 'teacher' },
        'Presentation deliverable graded',
        { label: a.title, href: '/student/academics/assignments' }
      );
      touch('pitching', strong ? 12 : 6, { type: 'assignment', label: a.title, href: '/student/academics/assignments', impact: 12, verifiedBy: 'teacher' }, 'Pitch-style assignment');
    }
  }

  for (const app of input.internships) {
    const done = ['completed', 'accepted', 'offer_received', 'offer'].includes(app.status);
    if (done) {
      touch(
        'communication',
        12,
        { type: 'internship', label: app.title, href: '/student/career/internships', impact: 12, verifiedBy: 'company' },
        `Internship at ${app.companyName}`,
        { label: app.title, href: '/student/career/internships' }
      );
      touch('teamwork', 10, { type: 'internship', label: app.title, href: '/student/career/internships', impact: 10, verifiedBy: 'company' }, 'Professional teamwork');
      touch('negotiation', 8, { type: 'internship', label: app.title, href: '/student/career/internships', impact: 8, verifiedBy: 'company' }, 'Workplace stakeholder exposure');
    }
  }

  for (const s of input.startups) {
    const r = s.readinessScore;
    touch(
      'pitching',
      clamp(r * 0.2),
      { type: 'startup', label: s.name, href: '/student/startup', impact: 20, verifiedBy: 'platform' },
      'Startup Hub pitching activity',
      { label: s.name, href: '/student/startup' }
    );
    touch('market-validation', clamp(r * 0.18), { type: 'startup', label: s.name, href: '/student/startup', impact: 18, verifiedBy: 'platform' }, 'Market validation in Startup Hub');
    touch('product-thinking', clamp(r * 0.16), { type: 'startup', label: s.name, href: '/student/startup', impact: 16, verifiedBy: 'platform' }, 'Product building in startup');
    touch('leadership', clamp(r * 0.22), { type: 'startup', label: 'Founder role', href: '/student/startup', impact: 22, verifiedBy: 'platform' }, 'Startup Hub founder activity');
    touch('networking', clamp(r * 0.12 + s.milestonesDone * 3), { type: 'startup', label: s.name, href: '/student/startup', impact: 12, verifiedBy: 'platform' }, 'Entrepreneurial networking');
    touch('sales', clamp(r * 0.1), { type: 'startup', label: s.name, href: '/student/startup', impact: 10, verifiedBy: 'platform' }, 'Startup commercial activity');
    touch('branding', clamp(r * 0.14), { type: 'startup', label: s.name, href: '/student/startup', impact: 14, verifiedBy: 'platform' }, 'Startup brand building');
    touch('storytelling', clamp(r * 0.12), { type: 'startup', label: s.name, href: '/student/startup', impact: 12, verifiedBy: 'platform' }, 'Venture narrative work');
  }

  if (input.journals > 0) {
    touch('communication', 6, { type: 'journal', label: 'Internship journal', href: '/student/career/internships', impact: 6, verifiedBy: 'platform' }, 'Reflective professional writing');
  }

  if (profile.employabilityScore >= 55) {
    touch('networking', 8, { type: 'platform', label: 'Career engagement', href: '/student/career', impact: 8, verifiedBy: 'platform' }, 'Active career ecosystem usage');
  }

  const verified: TrackedSkill[] = [];
  for (const entry of SKILL_CATALOG) {
    const data = map.get(entry.id);
    if (!data || data.xp < 8) continue;
    const xp = clamp(data.xp);
    verified.push({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      level: levelFromXp(xp),
      xp,
      verification: 'verified',
      whyIncreased: data.why.slice(0, 3).join(' · ') || 'Ecosystem activity',
      sources: data.sources.slice(0, 5),
      usedIn: data.usedIn.slice(0, 4),
      careers: entry.careers,
      trend: xp >= 70 ? 'up' : 'stable',
      recentDelta: Math.min(12, Math.round(data.xp * 0.15)),
    });
  }

  for (const sr of input.selfReported) {
    const catalog = SKILL_CATALOG.find((c) => c.id === sr.skillId);
    if (!catalog) continue;
    if (verified.some((v) => v.id === sr.skillId)) continue;
    const xp = clamp(sr.claimedLevel);
    verified.push({
      id: catalog.id,
      name: catalog.name,
      category: catalog.category,
      level: levelFromXp(xp),
      xp,
      verification: 'self_reported',
      whyIncreased: 'Self-reported — awaiting ecosystem verification',
      sources: [{ type: 'self', label: 'Student claim', href: null, impact: 0, verifiedBy: 'student' }],
      usedIn: [],
      careers: catalog.careers,
      trend: 'new',
      recentDelta: 0,
    });
  }

  return verified.sort((a, b) => b.xp - a.xp);
}

export function skillsToProfileSlugs(skills: TrackedSkill[]): string[] {
  const slugs = new Set<string>();
  for (const s of skills) {
    slugs.add(s.id);
    slugs.add(s.name.toLowerCase());
    if (s.category === 'technical') slugs.add('technical');
    if (s.category === 'soft' && s.id === 'leadership') slugs.add('leadership');
    if (s.category === 'entrepreneurial') slugs.add('entrepreneurial');
    if (s.category === 'creative') slugs.add('creative');
    if (s.xp >= 65) slugs.add('analytical');
    if (s.id === 'communication' && s.xp >= 60) slugs.add('communication');
  }
  return [...slugs];
}

export function buildSkillsRadar(skills: TrackedSkill[]): SkillsRadarPoint[] {
  const cats: SkillCategory[] = ['technical', 'soft', 'entrepreneurial', 'creative'];
  return cats.map((category) => {
    const inCat = skills.filter((s) => s.category === category && s.verification === 'verified');
    const value =
      inCat.length === 0 ? 0 : Math.round(inCat.reduce((a, s) => a + s.xp, 0) / inCat.length);
    return {
      category: category.charAt(0).toUpperCase() + category.slice(1),
      value,
      fullMark: 100,
    };
  });
}

export function buildSkillGaps(
  skills: TrackedSkill[],
  primaryRole: string | null,
  pathRequirements: ReturnType<typeof parsePathRequirements>
): SkillGapItem[] {
  const required = pathRequirements.skills ?? [];
  const gaps: SkillGapItem[] = [];

  for (const req of required) {
    const key = req.name.toLowerCase().replace(/\s+/g, '-');
    const match =
      skills.find((s) => s.name.toLowerCase() === req.name.toLowerCase()) ??
      skills.find((s) => s.id.includes(key) || key.includes(s.id));
    const currentXp = match?.xp ?? 0;
    const targetXp = req.required ? 70 : 55;
    gaps.push({
      skill: req.name,
      importance: req.weight ?? 1,
      currentXp,
      targetXp,
      gapPercent: Math.max(0, targetXp - currentXp),
    });
  }

  if (gaps.length === 0 && primaryRole) {
    const role = primaryRole.toLowerCase();
    const defaults: Record<string, string[]> = {
      product: ['product-thinking', 'sql', 'data-analysis', 'communication'],
      consult: ['excel', 'communication', 'leadership', 'data-analysis'],
      finance: ['finance-modeling', 'excel', 'data-analysis'],
      founder: ['pitching', 'market-validation', 'leadership', 'sales'],
      engineer: ['python', 'sql', 'product-thinking'],
    };
    let ids: string[] = ['communication', 'teamwork', 'leadership'];
    for (const [k, list] of Object.entries(defaults)) {
      if (role.includes(k)) ids = list;
    }
    for (const id of ids) {
      const catalog = SKILL_CATALOG.find((c) => c.id === id)!;
      const match = skills.find((s) => s.id === id);
      const currentXp = match?.xp ?? 0;
      gaps.push({
        skill: catalog.name,
        importance: 1,
        currentXp,
        targetXp: 65,
        gapPercent: Math.max(0, 65 - currentXp),
      });
    }
  }

  return gaps.sort((a, b) => b.gapPercent * b.importance - a.gapPercent * a.importance).slice(0, 8);
}

export function buildSkillRecommendations(
  gaps: SkillGapItem[],
  primaryRole: string | null
): SkillRecommendation[] {
  const recs: SkillRecommendation[] = [];
  for (const g of gaps.slice(0, 4)) {
    const skillLower = g.skill.toLowerCase();
    if (skillLower.includes('sql') || skillLower.includes('python') || skillLower.includes('data')) {
      recs.push({
        id: `course-${g.skill}`,
        type: 'course',
        title: `Strengthen ${g.skill} via technical coursework`,
        reason: `Gap of ${g.gapPercent}% for ${primaryRole ?? 'your target role'}`,
        href: '/student/academics/subjects',
        priority: 'high',
      });
    } else if (skillLower.includes('leadership') || skillLower.includes('communication')) {
      recs.push({
        id: `proj-${g.skill}`,
        type: 'project',
        title: `Lead a group assignment to grow ${g.skill}`,
        reason: 'Verified through professor-graded group work',
        href: '/student/academics/assignments',
        priority: 'high',
      });
    } else if (skillLower.includes('pitch') || skillLower.includes('market')) {
      recs.push({
        id: `startup-${g.skill}`,
        type: 'project',
        title: 'Advance Startup Hub milestones',
        reason: 'Entrepreneurial skills verify through venture activity',
        href: '/student/startup',
        priority: 'high',
      });
    } else {
      recs.push({
        id: `intern-${g.skill}`,
        type: 'internship',
        title: `Target internships requiring ${g.skill}`,
        reason: 'Company validation boosts verified level',
        href: '/student/career/internships',
        priority: g.gapPercent > 30 ? 'high' : 'medium',
      });
    }
  }

  recs.push({
    id: 'compat',
    type: 'workshop',
    title: 'Review compatibility breakdown',
    reason: 'See how skills affect match % across paths',
    href: '/student/career/compatibility',
    priority: 'medium',
  });

  recs.push({
    id: 'mentor',
    type: 'networking',
    title: 'Ask AI Career Mentor for a skill sprint plan',
    reason: 'Personalized weekly actions from your gaps',
    href: '/student/career/mentor',
    priority: 'medium',
  });

  return recs.slice(0, 8);
}

export function buildSkillMilestones(skills: TrackedSkill[]): SkillMilestone[] {
  const milestones: SkillMilestone[] = [];
  for (const s of skills.filter((x) => x.verification === 'verified')) {
    if (s.xp >= 85) {
      milestones.push({
        id: `m-expert-${s.id}`,
        skillId: s.id,
        title: `Expert ${s.name}`,
        earned: true,
        description: `Reached expert level (${s.xp} XP) through verified activity.`,
      });
    } else if (s.xp >= 65) {
      milestones.push({
        id: `m-adv-${s.id}`,
        skillId: s.id,
        title: `Advanced ${s.name}`,
        earned: true,
        description: `Advanced tier unlocked via ecosystem evidence.`,
      });
    }
  }
  const leadership = skills.find((s) => s.id === 'leadership' && s.xp >= 60);
  milestones.push({
    id: 'm-leadership',
    skillId: 'leadership',
    title: 'Verified Leader',
    earned: !!leadership,
    description: 'Leadership verified through startup or group projects.',
  });
  const speaking = skills.find((s) => s.id === 'public-speaking' && s.xp >= 55);
  milestones.push({
    id: 'm-speaker',
    skillId: 'public-speaking',
    title: 'Verified Public Speaker',
    earned: !!speaking,
    description: 'Presentations or pitches graded on platform.',
  });
  const net = skills.find((s) => s.id === 'networking' && s.xp >= 50);
  milestones.push({
    id: 'm-network',
    skillId: 'networking',
    title: 'Startup Networking Milestone',
    earned: !!net,
    description: 'Networking skill from venture + career activity.',
  });
  return milestones;
}

export function buildIndustryComparison(skills: TrackedSkill[], primaryRole: string | null): IndustryCompareRow[] {
  const role = (primaryRole ?? 'consulting').toLowerCase();
  const benchmarks: Record<string, number> = {
    leadership: role.includes('founder') ? 75 : 68,
    communication: 72,
    'data-analysis': role.includes('product') || role.includes('data') ? 78 : 62,
    excel: role.includes('finance') || role.includes('consult') ? 80 : 58,
    python: role.includes('engineer') || role.includes('software') ? 82 : 45,
    teamwork: 70,
    pitching: role.includes('founder') ? 76 : 48,
  };
  const keys = Object.keys(benchmarks);
  return keys.map((key) => {
    const catalog = SKILL_CATALOG.find((c) => c.id === key);
    const you = skills.find((s) => s.id === key)?.xp ?? 0;
    return {
      skill: catalog?.name ?? key,
      you,
      industry: benchmarks[key]!,
    };
  });
}

export function computeCompatibilitySkillBoost(skills: TrackedSkill[]): number {
  const verified = skills.filter((s) => s.verification === 'verified');
  if (verified.length === 0) return 0;
  const avg = verified.reduce((a, s) => a + s.xp, 0) / verified.length;
  return Math.min(15, Math.round(avg / 10));
}

export function runSkillsAdvisor(
  prompt: string,
  hub: {
    primaryRole: string | null;
    gaps: SkillGapItem[];
    topSkills: TrackedSkill[];
    verifiedCount: number;
  }
): string {
  const p = prompt.toLowerCase();
  if (p.includes('gap') || p.includes('need')) {
    const top = hub.gaps.slice(0, 3).map((g) => g.skill).join(', ');
    return hub.primaryRole
      ? `To progress toward ${hub.primaryRole}, prioritize: ${top || 'communication and leadership'}. Each gain updates compatibility and internship matching live.`
      : `Set a primary career path first. Your largest gaps: ${top || 'none detected yet — add more ecosystem activity'}.`;
  }
  if (p.includes('product')) {
    return 'Product Management benefits most from product-thinking, SQL, data-analysis, and communication — complete analytics coursework and ship a Startup Hub MVP milestone.';
  }
  if (p.includes('verified')) {
    return `You have ${hub.verifiedCount} verified skills from real evidence. Self-reported skills stay visible but do not boost compatibility until verified.`;
  }
  const best = hub.topSkills[0];
  if (best) {
    return `Your strongest verified skill is ${best.name} (${best.xp} XP, ${best.level}). ${best.whyIncreased}`;
  }
  return 'Complete assignments, internships, or Startup Hub work — skills level up automatically from ecosystem evidence.';
}

export function pathRequirementsFromCareerPath(
  path: Pick<CareerPath, 'compatibilityCriteria' | 'gradeRequirements'> | null
) {
  if (!path) return {};
  return parsePathRequirements(path);
}
