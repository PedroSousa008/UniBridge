import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';
import { computePathCompatibility } from '@/lib/career/compatibility-engine';
import type { CareerPath } from '@prisma/client';

/** Profile-based career directions shown until companies publish official paths. */
export interface CareerArchetype {
  id: string;
  roleTitle: string;
  industry: string;
  description: string;
  recommendedSkills: string[];
  requiredSubjects: string[];
  salaryMin: number;
  salaryMax: number;
  compatibilityCriteria: string;
}

export const PROFILE_CAREER_ARCHETYPES: CareerArchetype[] = [
  {
    id: 'archetype-founder',
    roleTitle: 'Startup Founder',
    industry: 'Entrepreneurship',
    description: 'Build and scale ventures — ideal for students with startup activity and leadership signals.',
    recommendedSkills: ['leadership', 'entrepreneurial', 'communication', 'analytical'],
    requiredSubjects: [],
    salaryMin: 35000,
    salaryMax: 120000,
    compatibilityCriteria: JSON.stringify({ requiresStartup: false, minProfileStrength: 40 }),
  },
  {
    id: 'archetype-product',
    roleTitle: 'Product Manager',
    industry: 'Technology',
    description: 'Drive product vision across teams — strong fit for analytical and cross-functional thinkers.',
    recommendedSkills: ['analytical', 'communication', 'leadership', 'technical'],
    requiredSubjects: [],
    salaryMin: 42000,
    salaryMax: 85000,
    compatibilityCriteria: JSON.stringify({ minGradeAverage: 12, minProfileStrength: 50 }),
  },
  {
    id: 'archetype-consulting',
    roleTitle: 'Management Consultant',
    industry: 'Consulting',
    description: 'Solve complex business problems for leading organizations — rewards analytical excellence.',
    recommendedSkills: ['analytical', 'communication', 'leadership'],
    requiredSubjects: ['Economics', 'Statistics', 'Management'],
    salaryMin: 45000,
    salaryMax: 90000,
    compatibilityCriteria: JSON.stringify({ minGradeAverage: 13, minAttendance: 80 }),
  },
  {
    id: 'archetype-finance',
    roleTitle: 'Investment Banking Analyst',
    industry: 'Finance',
    description: 'High-intensity finance track — demands strong grades and quantitative subjects.',
    recommendedSkills: ['analytical', 'academic consistency'],
    requiredSubjects: ['Finance', 'Economics', 'Accounting'],
    salaryMin: 55000,
    salaryMax: 95000,
    compatibilityCriteria: JSON.stringify({ minGradeAverage: 14, minAttendance: 85 }),
  },
  {
    id: 'archetype-data',
    roleTitle: 'Data Analyst',
    industry: 'Technology',
    description: 'Turn data into decisions — ideal for students excelling in quantitative subjects.',
    recommendedSkills: ['analytical', 'technical', 'SQL'],
    requiredSubjects: ['Statistics', 'Mathematics'],
    salaryMin: 38000,
    salaryMax: 72000,
    compatibilityCriteria: JSON.stringify({ minGradeAverage: 12 }),
  },
  {
    id: 'archetype-marketing',
    roleTitle: 'Brand & Marketing Strategist',
    industry: 'Marketing',
    description: 'Shape brand narratives and growth — suits creative and communication-oriented profiles.',
    recommendedSkills: ['creative', 'communication'],
    requiredSubjects: ['Marketing'],
    salaryMin: 32000,
    salaryMax: 65000,
    compatibilityCriteria: JSON.stringify({ minProfileStrength: 45 }),
  },
];

export function archetypeToCareerPath(archetype: CareerArchetype, universityId: string | null): CareerPath {
  const now = new Date();
  return {
    id: archetype.id,
    companyUserId: 'system',
    universityId,
    partnershipId: null,
    roleTitle: archetype.roleTitle,
    companyName: 'Profile insight',
    industry: archetype.industry,
    description: archetype.description,
    requiredSubjects: archetype.requiredSubjects,
    gradeRequirements: null,
    recommendedSkills: archetype.recommendedSkills,
    recommendedInternships: [],
    salaryMin: archetype.salaryMin,
    salaryMax: archetype.salaryMax,
    compatibilityCriteria: archetype.compatibilityCriteria,
    status: 'PUBLISHED',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function scoreArchetypes(profile: StudentCareerProfile, universityId: string | null) {
  return PROFILE_CAREER_ARCHETYPES.map((archetype) => {
    const path = archetypeToCareerPath(archetype, universityId);
    const result = computePathCompatibility(path, profile);
    return { path, result, isProfileInsight: true as const };
  }).sort((a, b) => b.result.compatibility - a.result.compatibility);
}
