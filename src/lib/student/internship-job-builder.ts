import type { CareerPath, Internship } from '@prisma/client';
import { computePathCompatibility } from '@/lib/career/compatibility-engine';
import {
  computeBreakdown,
  whyScoreLines,
} from '@/lib/career/compatibility-intelligence';
import {
  formatSalary,
  improveCompatibilityTips,
  inferDepartment,
  jobAiInsight,
  profileCompletionForJob,
  remoteLabel,
} from '@/lib/career/partnership-intelligence';
import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export type InternshipLifecycleStage =
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'interviewing'
  | 'offer_received'
  | 'accepted'
  | 'rejected'
  | 'completed';

export interface InternshipCard {
  id: string;
  partnershipId: string | null;
  companyUserId: string;
  companyName: string;
  title: string;
  department: string;
  description: string | null;
  salaryLabel: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remoteType: string;
  remoteLabel: string;
  employmentType: string;
  compatibility: number;
  requiredSkills: string[];
  preferredSkills: string[];
  certifications: string[];
  tools: string[];
  languages: string[];
  missingSkills: { name: string; gapPercent: number; importance: number }[];
  matchedSkills: { name: string; score: number; matched: boolean }[];
  whyMatches: string[];
  improveTips: string[];
  aiInsight: string;
  breakdown: { id: string; label: string; score: number; status: string }[];
  deadline: string | null;
  availabilityStatus: 'available' | 'filled';
  candidateCount: number;
  isBookmarked: boolean;
  isCandidate: boolean;
  applicationId: string | null;
  lifecycleStage: InternshipLifecycleStage | null;
  applicationStatus: string | null;
  appliedAt: string | null;
  profileCompletion: number;
  cvReadiness: number;
  interviewPrepScore: number;
  portfolioReadiness: number;
  competitiveMessage: string;
  tags: string[];
  createdAt: string;
  companyInsights: {
    culture: string;
    workStyle: string;
    growth: string;
    alumniNote: string;
  };
  interviewPrep: {
    likelyQuestions: string[];
    skillGaps: string[];
    behavioralTips: string[];
    companyTips: string[];
  };
  partnershipHref: string | null;
}

type InternshipWithRelations = Internship & {
  careerPath: CareerPath | null;
  _count: { applications: number };
};

export type InternshipRowInput = Internship & {
  careerPath: CareerPath | null;
  _count: { applications: number };
};

export function resolveLifecycleStage(
  bookmarked: boolean,
  status: string | null | undefined
): InternshipLifecycleStage | null {
  if (!bookmarked && !status) return null;
  if (bookmarked && (!status || status === 'saved')) return 'saved';
  const map: Record<string, InternshipLifecycleStage> = {
    candidate: 'preparing',
    preparing: 'preparing',
    saved: 'saved',
    applied: 'applied',
    interviewing: 'interviewing',
    interview: 'interviewing',
    offer_received: 'offer_received',
    offer: 'offer_received',
    accepted: 'accepted',
    rejected: 'rejected',
    completed: 'completed',
  };
  if (status && map[status]) return map[status];
  if (bookmarked) return 'saved';
  return null;
}

function parseSkillBuckets(
  recommendedSkills: string[],
  criteriaJson: string | null
): { required: string[]; preferred: string[]; certifications: string[]; tools: string[]; languages: string[] } {
  let required = [...recommendedSkills];
  let preferred: string[] = [];
  let certifications: string[] = [];
  let tools: string[] = [];
  let languages: string[] = [];

  if (criteriaJson) {
    try {
      const c = JSON.parse(criteriaJson) as {
        skills?: { name: string; required?: boolean }[];
        certifications?: string[];
        tools?: string[];
        languages?: string[];
      };
      if (c.skills?.length) {
        required = c.skills.filter((s) => s.required).map((s) => s.name);
        preferred = c.skills.filter((s) => !s.required).map((s) => s.name);
      }
      certifications = c.certifications ?? [];
      tools = c.tools ?? [];
      languages = c.languages ?? [];
    } catch {
      /* ignore */
    }
  }

  for (const s of recommendedSkills) {
    const low = s.toLowerCase();
    if (/excel|sql|python|power bi|tableau|figma|jira/.test(low)) tools.push(s);
    else if (/english|portuguese|spanish|french|german/.test(low)) languages.push(s);
    else if (/certification|certified|pmp|cfa/.test(low)) certifications.push(s);
  }

  return {
    required: [...new Set(required)].slice(0, 8),
    preferred: [...new Set(preferred)].slice(0, 6),
    certifications: [...new Set(certifications)].slice(0, 4),
    tools: [...new Set(tools)].slice(0, 6),
    languages: [...new Set(languages)].slice(0, 4),
  };
}

function companyInsightsFrom(
  companyName: string,
  industry: string | null,
  remoteType: string | null
): InternshipCard['companyInsights'] {
  const ind = (industry ?? 'professional services').toLowerCase();
  return {
    culture: `${companyName} emphasizes collaboration and high standards typical of ${industry ?? 'the industry'}.`,
    workStyle: remoteType === 'remote' ? 'Remote-first with async collaboration' : remoteType === 'hybrid' ? 'Hybrid — blend of office and remote' : 'On-site team environment',
    growth: 'Structured mentorship and exposure to real client or product work.',
    alumniNote: 'Alumni paths activate as students complete internships through UniBridge.',
  };
}

function interviewPrepPlaceholder(
  title: string,
  companyName: string,
  missingSkills: { name: string }[]
): InternshipCard['interviewPrep'] {
  const t = title.toLowerCase();
  const questions = [
    'Tell me about yourself and why this role.',
    'Describe a challenge you solved in a team setting.',
    `Why ${companyName}, and why this internship now?`,
  ];
  if (t.includes('consult')) {
    questions.push('Walk me through a case-style problem.');
    questions.push('How do you structure ambiguous problems?');
  }
  if (t.includes('product') || t.includes('tech')) {
    questions.push('How would you prioritize features with limited data?');
  }
  return {
    likelyQuestions: questions.slice(0, 5),
    skillGaps: missingSkills.slice(0, 4).map((s) => s.name),
    behavioralTips: [
      'Use STAR format (Situation, Task, Action, Result)',
      'Prepare 2 leadership examples and 1 failure + learning story',
    ],
    companyTips: [
      `Research ${companyName}'s recent news and values`,
      'Connect your academic projects to the role requirements',
    ],
  };
}

export function internshipToPath(
  internship: InternshipRowInput,
  companyName: string,
  industry: string | null
): CareerPath {
  const linked = internship.careerPath;
  if (linked) return linked;

  return {
    id: internship.id,
    companyUserId: internship.companyUserId,
    universityId: internship.universityId,
    partnershipId: internship.partnershipId,
    roleTitle: internship.title,
    companyName,
    industry,
    description: internship.description,
    requiredSubjects: [],
    gradeRequirements: null,
    recommendedSkills: internship.recommendedSkills ?? [],
    recommendedInternships: [],
    salaryMin: internship.salaryMin,
    salaryMax: internship.salaryMax,
    compatibilityCriteria: internship.compatibilityCriteria,
    status: 'PUBLISHED',
    publishedAt: internship.createdAt,
    createdAt: internship.createdAt,
    updatedAt: internship.updatedAt,
  } as CareerPath;
}

export function buildInternshipCard(
  internship: InternshipRowInput,
  companyName: string,
  industry: string | null,
  profile: StudentCareerProfile,
  bookmarked: Set<string>,
  application: {
    id: string;
    status: string;
    appliedAt: Date | null;
  } | null
): InternshipCard {
  const path = internshipToPath(internship, companyName, industry);
  const result = computePathCompatibility(path, profile);
  const breakdown = computeBreakdown(profile, result);
  const department = internship.department ?? inferDepartment(internship.title, industry);
  const skills = parseSkillBuckets(internship.recommendedSkills ?? [], internship.compatibilityCriteria);
  const profileCompletion = profileCompletionForJob(profile, result);
  const cvReadiness = Math.min(100, Math.round(profile.profileStrength * 0.85 + profileCompletion * 0.15));
  const interviewPrepScore = Math.min(
    100,
    Math.round(
      result.compatibility * 0.4 +
        (profile.gradeAverage != null && profile.gradeAverage >= 13 ? 25 : 10) +
        (profile.assignmentCompletionRate ?? 50) * 0.2
    )
  );
  const portfolioReadiness = Math.min(
    100,
    Math.round(profile.engagementScore * 0.5 + (profile.hasStartup ? 25 : 0) + profile.profileStrength * 0.25)
  );

  const lifecycleStage = resolveLifecycleStage(
    bookmarked.has(internship.id),
    application?.status
  );

  let competitiveMessage =
    result.compatibility >= 75
      ? 'Your profile is competitive for this internship.'
      : result.compatibility >= 55
        ? 'You are building toward competitiveness — close key gaps below.'
        : 'Your profile is not yet competitive for this internship — focused preparation recommended.';

  const topTip = improveCompatibilityTips(result, profile, breakdown)[0];
  if (topTip && result.compatibility < 75) {
    competitiveMessage += ` ${topTip.charAt(0).toUpperCase() + topTip.slice(1)}.`;
  }

  return {
    id: internship.id,
    partnershipId: internship.partnershipId,
    companyUserId: internship.companyUserId,
    companyName,
    title: internship.title,
    department,
    description: internship.description,
    salaryLabel: formatSalary(internship.salaryMin, internship.salaryMax),
    salaryMin: internship.salaryMin,
    salaryMax: internship.salaryMax,
    location: internship.location,
    remoteType: internship.remoteType ?? 'on_site',
    remoteLabel: remoteLabel(internship.remoteType),
    employmentType: internship.employmentType ?? 'internship',
    compatibility: result.compatibility,
    requiredSkills: skills.required,
    preferredSkills: skills.preferred,
    certifications: skills.certifications,
    tools: skills.tools,
    languages: skills.languages,
    missingSkills: result.missingSkills,
    matchedSkills: result.matchedSkills,
    whyMatches: whyScoreLines(result, breakdown),
    improveTips: improveCompatibilityTips(result, profile, breakdown),
    aiInsight: jobAiInsight(result, internship.title, profile),
    breakdown,
    deadline: internship.deadline?.toISOString() ?? null,
    availabilityStatus:
      (internship.availabilityStatus ?? 'available') === 'filled' ? 'filled' : 'available',
    candidateCount: internship._count.applications,
    isBookmarked: bookmarked.has(internship.id),
    isCandidate:
      application?.status === 'candidate' ||
      application?.status === 'preparing' ||
      (bookmarked.has(internship.id) && !application),
    applicationId: application?.id ?? null,
    lifecycleStage,
    applicationStatus: application?.status ?? null,
    appliedAt: application?.appliedAt?.toISOString() ?? null,
    profileCompletion,
    cvReadiness,
    interviewPrepScore,
    portfolioReadiness,
    competitiveMessage,
    tags: result.tags,
    createdAt: internship.createdAt.toISOString(),
    companyInsights: companyInsightsFrom(companyName, industry, internship.remoteType),
    interviewPrep: interviewPrepPlaceholder(internship.title, companyName, result.missingSkills),
    partnershipHref: internship.partnershipId
      ? `/student/career/partnerships/${internship.partnershipId}`
      : null,
  };
}
