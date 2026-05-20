import type { CareerPath } from '@prisma/client';

export interface StudentCareerProfile {
  profileStrength: number;
  employabilityScore: number;
  engagementScore: number;
  gradeAverage: number | null;
  attendanceAverage: number | null;
  subjects: {
    id: string;
    name: string;
    average: number | null;
    attendance: number | null;
  }[];
  hasStartup: boolean;
  startupReadiness: number | null;
  assignmentCompletionRate: number | null;
  inferredSkills: string[];
}

export interface PathRequirements {
  skills?: { name: string; weight: number; required?: boolean }[];
  minGradeAverage?: number;
  minAttendance?: number;
  minProfileStrength?: number;
  minEmployability?: number;
  requiresStartup?: boolean;
  subjects?: { name: string; minGrade?: number; weight: number }[];
}

export interface SkillMatch {
  name: string;
  score: number;
  matched: boolean;
}

export interface CompatibilityResult {
  compatibility: number;
  matchedSkills: SkillMatch[];
  missingSkills: { name: string; importance: number; gapPercent: number }[];
  whyMatches: string[];
  subjectConnections: { subjectName: string; message: string; contributionPercent: number }[];
  tags: string[];
  demandLevel: 'high' | 'medium' | 'low';
  growthTrend: 'rising' | 'stable' | 'emerging';
  pathDifficulty: 'accessible' | 'moderate' | 'challenging';
  salaryProjection: {
    starting: number | null;
    fiveYear: number | null;
    tenYear: number | null;
    currency: string;
  };
  simulation: {
    workStyle: string;
    stressLevel: string;
    remoteFlex: string;
    meetingLoad: string;
  };
  roadmapStages: { stage: string; status: 'done' | 'current' | 'upcoming' }[];
  milestones: { id: string; text: string; done: boolean; href: string | null }[];
}

const SKILL_KEYWORDS: Record<string, string[]> = {
  analytical: ['statistics', 'economics', 'finance', 'math', 'data', 'analytics', 'accounting'],
  communication: ['marketing', 'communication', 'english', 'presentation', 'writing'],
  leadership: ['management', 'strategy', 'business', 'entrepreneurship'],
  technical: ['programming', 'software', 'computer', 'engineering', 'technology', 'sql', 'python'],
  creative: ['design', 'media', 'arts', 'creative', 'innovation'],
  entrepreneurial: ['startup', 'entrepreneurship', 'innovation', 'business'],
};

export function parsePathRequirements(path: Pick<CareerPath, 'compatibilityCriteria' | 'gradeRequirements'>): PathRequirements {
  if (path.compatibilityCriteria) {
    try {
      return JSON.parse(path.compatibilityCriteria) as PathRequirements;
    } catch {
      /* fall through */
    }
  }
  return {};
}

export function inferSkillsFromProfile(profile: StudentCareerProfile): string[] {
  const skills = new Set(profile.inferredSkills.map((s) => s.toLowerCase()));

  for (const subject of profile.subjects) {
    const name = subject.name.toLowerCase();
    for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
      if (keywords.some((k) => name.includes(k))) skills.add(skill);
    }
    if (subject.average != null && subject.average >= 14) skills.add('analytical');
    if (subject.average != null && subject.average >= 12) skills.add('academic consistency');
  }

  if (profile.hasStartup) {
    skills.add('entrepreneurial');
    skills.add('leadership');
  }
  if (profile.gradeAverage != null && profile.gradeAverage >= 15) skills.add('analytical');
  if (profile.profileStrength >= 70) skills.add('communication');
  if (profile.employabilityScore >= 60) skills.add('professional readiness');

  return [...skills];
}

function subjectMatches(requiredName: string, subjectName: string): boolean {
  const a = requiredName.toLowerCase();
  const b = subjectName.toLowerCase();
  return b.includes(a) || a.includes(b);
}

function inferTags(
  path: Pick<CareerPath, 'industry' | 'roleTitle' | 'recommendedSkills'>,
  compatibility: number
): string[] {
  const tags: string[] = [];
  const text = `${path.roleTitle} ${path.industry ?? ''} ${path.recommendedSkills.join(' ')}`.toLowerCase();

  if (text.includes('remote') || text.includes('digital')) tags.push('Remote Friendly');
  if (text.includes('founder') || text.includes('startup')) tags.push('Entrepreneurial');
  if (text.includes('analyst') || text.includes('finance') || text.includes('data')) tags.push('Analytical');
  if (text.includes('design') || text.includes('creative')) tags.push('Creative');
  if (text.includes('consult') || text.includes('bank') || text.includes('investment')) tags.push('High Salary');
  if (text.includes('lead') || text.includes('manager') || text.includes('director')) tags.push('Leadership');
  if (compatibility >= 75) tags.push('Strong Match');
  if (compatibility < 50) tags.push('Growth Opportunity');

  return tags.slice(0, 5);
}

function inferDemand(industry: string | null): 'high' | 'medium' | 'low' {
  const t = (industry ?? '').toLowerCase();
  if (t.includes('tech') || t.includes('data') || t.includes('software')) return 'high';
  if (t.includes('finance') || t.includes('consult')) return 'high';
  if (t.includes('retail') || t.includes('hospitality')) return 'medium';
  return 'medium';
}

function inferGrowth(roleTitle: string): 'rising' | 'stable' | 'emerging' {
  const t = roleTitle.toLowerCase();
  if (t.includes('ai') || t.includes('data') || t.includes('product') || t.includes('founder')) return 'rising';
  if (t.includes('analyst') || t.includes('consultant')) return 'stable';
  return 'emerging';
}

function inferDifficulty(compatibility: number, requirements: PathRequirements): 'accessible' | 'moderate' | 'challenging' {
  const reqCount =
    (requirements.skills?.filter((s) => s.required).length ?? 0) +
    (requirements.minGradeAverage ? 1 : 0) +
    (requirements.requiresStartup ? 1 : 0);
  if (compatibility >= 70 && reqCount <= 2) return 'accessible';
  if (compatibility >= 50 || reqCount <= 4) return 'moderate';
  return 'challenging';
}

function salaryProjection(path: Pick<CareerPath, 'salaryMin' | 'salaryMax'>) {
  const start = path.salaryMin ?? path.salaryMax ?? null;
  return {
    starting: start,
    fiveYear: start != null ? Math.round(start * 1.45) : null,
    tenYear: start != null ? Math.round(start * 2.1) : null,
    currency: 'EUR',
  };
}

function buildRoadmap(profile: StudentCareerProfile, compatibility: number) {
  const stages = ['Current student', 'Internship', 'Junior role', 'Mid-level', 'Senior', 'Leadership'];
  let currentIdx = 0;
  if (profile.gradeAverage != null && profile.gradeAverage >= 12) currentIdx = 0;
  if (profile.hasStartup || profile.employabilityScore >= 40) currentIdx = Math.max(currentIdx, 0);
  if (compatibility >= 55) currentIdx = Math.max(currentIdx, 1);
  if (compatibility >= 70 && profile.profileStrength >= 60) currentIdx = Math.max(currentIdx, 2);

  return stages.map((stage, i) => ({
    stage,
    status: (i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming') as
      | 'done'
      | 'current'
      | 'upcoming',
  }));
}

function buildMilestones(
  profile: StudentCareerProfile,
  path: Pick<CareerPath, 'recommendedSkills' | 'recommendedInternships'>,
  missingSkills: { name: string }[]
): CompatibilityResult['milestones'] {
  const items: CompatibilityResult['milestones'] = [
    {
      id: 'cv',
      text: 'Build a strong CV on your profile',
      done: profile.profileStrength >= 50,
      href: '/student/profile',
    },
    {
      id: 'grades',
      text: 'Maintain solid academic performance',
      done: profile.gradeAverage != null && profile.gradeAverage >= 12,
      href: '/student/academics/gradebook',
    },
  ];

  if (path.recommendedInternships.length > 0) {
    items.push({
      id: 'intern',
      text: `Complete internship: ${path.recommendedInternships[0]}`,
      done: false,
      href: '/student/career/internships',
    });
  }

  for (const skill of missingSkills.slice(0, 2)) {
    items.push({
      id: `skill-${skill.name}`,
      text: `Develop ${skill.name}`,
      done: false,
      href: '/student/academics/resources',
    });
  }

  return items;
}

function simulationForRole(roleTitle: string, industry: string | null) {
  const t = `${roleTitle} ${industry ?? ''}`.toLowerCase();
  if (t.includes('founder') || t.includes('startup')) {
    return {
      workStyle: 'Fast-paced, ownership-driven, high autonomy',
      stressLevel: 'High — variable but energizing',
      remoteFlex: 'Flexible — often hybrid or remote',
      meetingLoad: 'Heavy with investors, team, and customers',
    };
  }
  if (t.includes('consult') || t.includes('bank')) {
    return {
      workStyle: 'Structured, client-facing, analytical depth',
      stressLevel: 'High during project cycles',
      remoteFlex: 'Hybrid — client site dependent',
      meetingLoad: 'Very high — presentations and workshops',
    };
  }
  if (t.includes('product') || t.includes('tech')) {
    return {
      workStyle: 'Cross-functional, iterative, data-informed',
      stressLevel: 'Moderate — sprint-driven',
      remoteFlex: 'Remote friendly',
      meetingLoad: 'Moderate — standups and stakeholder syncs',
    };
  }
  return {
    workStyle: 'Collaborative professional environment',
    stressLevel: 'Moderate',
    remoteFlex: 'Hybrid options',
    meetingLoad: 'Balanced',
  };
}

export function computePathCompatibility(
  path: CareerPath,
  profile: StudentCareerProfile
): CompatibilityResult {
  const requirements = parsePathRequirements(path);
  const allSkills = inferSkillsFromProfile(profile);
  const skillSet = new Set(allSkills.map((s) => s.toLowerCase()));

  const requiredSkillNames = [
    ...path.recommendedSkills,
    ...(requirements.skills?.map((s) => s.name) ?? []),
  ].filter(Boolean);

  const uniqueSkills = [...new Set(requiredSkillNames.map((s) => s.trim()).filter(Boolean))];

  let totalWeight = 0;
  let earnedWeight = 0;
  const matchedSkills: SkillMatch[] = [];
  const missingSkills: { name: string; importance: number; gapPercent: number }[] = [];

  for (const skillName of uniqueSkills) {
    const req = requirements.skills?.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
    const weight = req?.weight ?? 10;
    const required = req?.required ?? false;
    totalWeight += weight;

    const matched =
      skillSet.has(skillName.toLowerCase()) ||
      [...skillSet].some(
        (s) =>
          skillName.toLowerCase().includes(s) ||
          s.includes(skillName.toLowerCase()) ||
          SKILL_KEYWORDS[s]?.some((k) => skillName.toLowerCase().includes(k))
      );

    const score = matched ? 100 : 0;
    if (matched) earnedWeight += weight;
    else {
      missingSkills.push({
        name: skillName,
        importance: required ? 100 : 60,
        gapPercent: 100,
      });
    }
    matchedSkills.push({ name: skillName, score, matched });
  }

  for (const reqSubject of path.requiredSubjects) {
    const weight = 15;
    totalWeight += weight;
    const enrollment = profile.subjects.find((s) => subjectMatches(reqSubject, s.name));
    if (enrollment && enrollment.average != null && enrollment.average >= (requirements.subjects?.find((x) => subjectMatches(reqSubject, x.name))?.minGrade ?? 10)) {
      earnedWeight += weight;
    } else if (!enrollment) {
      missingSkills.push({ name: reqSubject, importance: 90, gapPercent: 100 });
    } else {
      missingSkills.push({ name: reqSubject, importance: 80, gapPercent: Math.round(100 - (enrollment.average ?? 0) * 5) });
    }
  }

  for (const reqSubject of requirements.subjects ?? []) {
    const weight = reqSubject.weight ?? 12;
    totalWeight += weight;
    const enrollment = profile.subjects.find((s) => subjectMatches(reqSubject.name, s.name));
    if (enrollment && enrollment.average != null && enrollment.average >= (reqSubject.minGrade ?? 10)) {
      earnedWeight += weight;
    } else {
      missingSkills.push({
        name: reqSubject.name,
        importance: 85,
        gapPercent: enrollment?.average != null ? Math.max(20, Math.round(100 - enrollment.average * 5)) : 100,
      });
    }
  }

  if (requirements.minGradeAverage != null) {
    totalWeight += 20;
    if (profile.gradeAverage != null && profile.gradeAverage >= requirements.minGradeAverage) {
      earnedWeight += 20;
    } else {
      missingSkills.push({
        name: `Grade average ≥ ${requirements.minGradeAverage}`,
        importance: 95,
        gapPercent: profile.gradeAverage != null ? Math.round((1 - profile.gradeAverage / 20) * 100) : 100,
      });
    }
  }

  if (requirements.minAttendance != null) {
    totalWeight += 10;
    if (profile.attendanceAverage != null && profile.attendanceAverage >= requirements.minAttendance) {
      earnedWeight += 10;
    } else {
      missingSkills.push({
        name: `Attendance ≥ ${requirements.minAttendance}%`,
        importance: 70,
        gapPercent: profile.attendanceAverage != null ? Math.round(100 - profile.attendanceAverage) : 100,
      });
    }
  }

  if (requirements.minProfileStrength != null) {
    totalWeight += 10;
    if (profile.profileStrength >= requirements.minProfileStrength) earnedWeight += 10;
    else missingSkills.push({ name: 'Profile strength', importance: 75, gapPercent: Math.round(100 - profile.profileStrength) });
  }

  if (requirements.requiresStartup) {
    totalWeight += 15;
    if (profile.hasStartup) earnedWeight += 15;
    else missingSkills.push({ name: 'Startup experience', importance: 90, gapPercent: 100 });
  }

  if (totalWeight === 0) {
    totalWeight = 100;
    earnedWeight =
      (profile.gradeAverage != null ? (profile.gradeAverage / 20) * 30 : 10) +
      profile.profileStrength * 0.3 +
      profile.employabilityScore * 0.2 +
      (profile.hasStartup ? 15 : 0);
  }

  const compatibility = Math.min(99, Math.max(0, Math.round((earnedWeight / totalWeight) * 100)));

  const whyMatches: string[] = [];
  if (profile.gradeAverage != null && profile.gradeAverage >= 14) {
    whyMatches.push(`Strong academic performance (${profile.gradeAverage.toFixed(1)}/20 average).`);
  }
  if (profile.hasStartup) {
    whyMatches.push('Startup Hub activity signals entrepreneurial drive and leadership.');
  }
  if (profile.profileStrength >= 60) {
    whyMatches.push('Your profile strength increases recruiter visibility for this path.');
  }
  if (matchedSkills.filter((s) => s.matched).length >= 2) {
    whyMatches.push(
      `Skills alignment: ${matchedSkills
        .filter((s) => s.matched)
        .slice(0, 3)
        .map((s) => s.name)
        .join(', ')}.`
    );
  }
  if (whyMatches.length === 0) {
    whyMatches.push('Early profile signals — keep building academics and profile depth to sharpen this match.');
  }

  const subjectConnections = profile.subjects
    .filter((s) =>
      path.requiredSubjects.some((r) => subjectMatches(r, s.name)) ||
      uniqueSkills.some((sk) => subjectMatches(sk, s.name))
    )
    .slice(0, 4)
    .map((s) => ({
      subjectName: s.name,
      message: `${s.name} contributes to ${path.roleTitle} readiness.`,
      contributionPercent: s.average != null ? Math.min(95, Math.round((s.average / 20) * 100)) : 50,
    }));

  if (profile.hasStartup) {
    subjectConnections.push({
      subjectName: 'Startup Hub',
      message: 'Startup participation increases founder and product-path compatibility.',
      contributionPercent: profile.startupReadiness ?? 60,
    });
  }

  missingSkills.sort((a, b) => b.importance - a.importance);

  return {
    compatibility,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 6),
    whyMatches,
    subjectConnections,
    tags: inferTags(path, compatibility),
    demandLevel: inferDemand(path.industry),
    growthTrend: inferGrowth(path.roleTitle),
    pathDifficulty: inferDifficulty(compatibility, requirements),
    salaryProjection: salaryProjection(path),
    simulation: simulationForRole(path.roleTitle, path.industry),
    roadmapStages: buildRoadmap(profile, compatibility),
    milestones: buildMilestones(profile, path, missingSkills),
  };
}
