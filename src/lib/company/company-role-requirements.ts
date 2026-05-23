import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';
import {
  isVisibleToCompanies,
  studentOpenToRecruiting,
} from '@/lib/company/company-intelligence';
import {
  computeCompanyStudentCompatibility,
  labelForRequirementTag,
} from '@/lib/company/company-presence-intelligence';
import {
  getCompanyPresenceMatchCriteria,
  parseJsonArray,
} from '@/lib/company/company-presence-hub';
import {
  parseCurrentlyHiring,
  recruitmentStatusLabel,
} from '@/lib/company/company-presence-shared';
import type { RoleVisibilitySettings } from '@/lib/company/company-department-hub';
import {
  PREFERRED_QUALITY_TEMPLATES,
  REQUIREMENT_TEMPLATES,
  templateById,
  type RequirementTemplate,
  type RequirementType,
  type RequirementWeight,
  type ValidationSource,
} from '@/lib/company/company-requirement-catalog';
import { countPartnerStudents, quickApplicantCompatibility } from '@/lib/company/company-presence-shared';
import { buildStudentProfile } from '@/lib/student/student-career-paths';
import type { StudentCareerProfile } from '@/lib/career/compatibility-engine';

export interface StructuredRequirement {
  id: string;
  name: string;
  type: RequirementType;
  category: string;
  validationSource: ValidationSource;
  weight: RequirementWeight;
  weightScore: number;
  tagId?: string;
  isPreferred: boolean;
  status: 'active' | 'archived';
  sortOrder: number;
  autoTracking: boolean;
}

export interface RoleRequirementsHubCard {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  compatibilityAverage: number;
  applicationCount: number;
  fitQuality: 'excellent' | 'strong' | 'building' | 'needs_definition';
  requirementsCompletion: number;
  hiringUrgency: string;
  hiringUrgencyLabel: string;
  isFilled: boolean;
  status: string;
  openLabel: string;
}

export interface RoleRequirementsHub {
  companyName: string;
  roles: RoleRequirementsHubCard[];
  totalRoles: number;
}

export interface CompatibilityPreview {
  strongMatches: number;
  potentialMatches: number;
  highLeadershipMatches: number;
  startupAlignedMatches: number;
  missingOneRequirement: number;
  simulations: { text: string; deltaStrong: number; deltaPotential: number }[];
}

export interface RoleFitIntelligenceView {
  id: string;
  title: string;
  departmentId: string | null;
  departmentName: string | null;
  isFilled: boolean;
  status: string;
  hiringPriority: string;
  hero: {
    compatibilityAverage: number;
    totalCompatibleStudents: number;
    strongestMatchingDegree: string;
    topSkills: string[];
    startupAlignment: number;
    leadershipAlignment: number;
    applicationCount: number;
    openLabel: string;
  };
  requirements: StructuredRequirement[];
  preferredQualities: StructuredRequirement[];
  preview: CompatibilityPreview;
  topStudents: {
    userId: string;
    name: string;
    image: string | null;
    compatibility: number;
    headline: string | null;
    whyFits: string[];
  }[];
}

function newId() {
  return randomUUID();
}

export function parseStructuredRequirements(val: unknown): StructuredRequirement[] {
  if (!Array.isArray(val)) return [];
  const parsed: (StructuredRequirement | null)[] = val.map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const weight = (['critical', 'important', 'bonus'].includes(String(o.weight))
        ? String(o.weight)
        : 'important') as RequirementWeight;
      const weightScore =
        typeof o.weightScore === 'number'
          ? o.weightScore
          : weight === 'critical'
            ? 10
            : weight === 'bonus'
              ? 4
              : 7;
      return {
        id: String(o.id ?? newId()),
        name: String(o.name ?? 'Requirement'),
        type: (['academic', 'skill', 'experience', 'language', 'availability', 'behavioral'].includes(
          String(o.type)
        )
          ? String(o.type)
          : 'skill') as RequirementType,
        category: String(o.category ?? 'General'),
        validationSource: (['verified', 'university_verified', 'self_declared', 'ai_inferred', 'missing_data'].includes(
          String(o.validationSource)
        )
          ? String(o.validationSource)
          : 'ai_inferred') as ValidationSource,
        weight,
        weightScore,
        tagId: typeof o.tagId === 'string' ? o.tagId : undefined,
        isPreferred: Boolean(o.isPreferred),
        status: o.status === 'archived' ? 'archived' : 'active',
        sortOrder: typeof o.sortOrder === 'number' ? o.sortOrder : i,
        autoTracking: o.autoTracking !== false,
      };
    });
  return parsed
    .filter((r): r is StructuredRequirement => r !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function migrateLegacyToStructured(input: {
  nonNegotiables: string[];
  preferredQualities: string[];
  requiredSkills: string[];
}): StructuredRequirement[] {
  const out: StructuredRequirement[] = [];
  let order = 0;

  const addFromLabel = (label: string, isPreferred: boolean) => {
    const template =
      REQUIREMENT_TEMPLATES.find((t) => t.name.toLowerCase() === label.toLowerCase()) ??
      PREFERRED_QUALITY_TEMPLATES.find((t) => t.name.toLowerCase() === label.toLowerCase()) ??
      REQUIREMENT_TEMPLATES.find((t) => t.tagId && labelForRequirementTag(t.tagId!).toLowerCase() === label.toLowerCase());
    if (template) {
      out.push(structuredFromTemplate(template, isPreferred, order++));
      return;
    }
    out.push({
      id: newId(),
      name: label,
      type: isPreferred ? 'behavioral' : 'skill',
      category: 'Custom',
      validationSource: 'ai_inferred',
      weight: isPreferred ? 'bonus' : 'important',
      weightScore: isPreferred ? 4 : 7,
      isPreferred,
      status: 'active',
      sortOrder: order++,
      autoTracking: true,
    });
  };

  for (const s of input.requiredSkills) {
    const label = labelForRequirementTag(s);
    addFromLabel(label, false);
  }
  for (const n of input.nonNegotiables) addFromLabel(n, false);
  for (const p of input.preferredQualities) addFromLabel(p, true);

  return out;
}

export function structuredFromTemplate(
  template: RequirementTemplate,
  isPreferred: boolean,
  sortOrder: number
): StructuredRequirement {
  return {
    id: newId(),
    name: template.name,
    type: template.type,
    category: template.category,
    validationSource: template.defaultValidation,
    weight: template.defaultWeight,
    weightScore:
      template.defaultWeight === 'critical' ? 10 : template.defaultWeight === 'bonus' ? 4 : 7,
    tagId: template.tagId,
    isPreferred,
    status: 'active',
    sortOrder,
    autoTracking: true,
  };
}

export function syncLegacyFromStructured(requirements: StructuredRequirement[]): {
  nonNegotiables: string[];
  preferredQualities: string[];
  requiredSkills: string[];
} {
  const active = requirements.filter((r) => r.status === 'active');
  const nonNegotiables = active
    .filter((r) => !r.isPreferred && r.weight === 'critical')
    .map((r) => r.tagId ?? r.name);
  const preferredQualities = active
    .filter((r) => r.isPreferred)
    .map((r) => r.tagId ?? r.name);
  const requiredSkills = active
    .filter((r) => !r.isPreferred && r.type === 'skill')
    .map((r) => r.tagId ?? r.name);
  return { nonNegotiables, preferredQualities, requiredSkills };
}

export function requirementsCompletionPct(requirements: StructuredRequirement[]): number {
  const active = requirements.filter((r) => r.status === 'active');
  if (active.length === 0) return 0;
  const nonPref = active.filter((r) => !r.isPreferred);
  const pref = active.filter((r) => r.isPreferred);
  const nonScore = nonPref.length > 0 ? Math.min(100, nonPref.length * 18) : 0;
  const prefScore = pref.length > 0 ? Math.min(40, pref.length * 8) : 0;
  return Math.min(100, nonScore + prefScore);
}

export function fitQualityLabel(
  completion: number,
  compat: number
): RoleRequirementsHubCard['fitQuality'] {
  if (completion < 25) return 'needs_definition';
  if (compat >= 78 && completion >= 60) return 'excellent';
  if (compat >= 65) return 'strong';
  return 'building';
}

function labelsForCompatibility(requirements: StructuredRequirement[]) {
  const active = requirements.filter((r) => r.status === 'active');
  const nonNegotiables = active
    .filter((r) => !r.isPreferred)
    .map((r) => (r.tagId ? labelForRequirementTag(r.tagId) : r.name));
  const preferredQualities = active
    .filter((r) => r.isPreferred)
    .map((r) => (r.tagId ? labelForRequirementTag(r.tagId) : r.name));
  const requiredSkills = active
    .filter((r) => !r.isPreferred && r.type === 'skill')
    .map((r) => (r.tagId ? labelForRequirementTag(r.tagId) : r.name));
  return { nonNegotiables, preferredQualities, requiredSkills };
}

function studentMeetsRequirement(profile: StudentCareerProfile, req: StructuredRequirement): boolean {
  const name = req.name.toLowerCase();
  const tag = req.tagId ? labelForRequirementTag(req.tagId).toLowerCase() : name;

  if (/gpa|14|15|grade|academic/i.test(tag) || req.type === 'academic') {
    if (/15/.test(tag)) return (profile.gradeAverage ?? 0) >= 15;
    if (/14|gpa/i.test(tag)) return (profile.gradeAverage ?? 0) >= 14;
    return (profile.gradeAverage ?? 0) >= 13;
  }
  if (/english|language|portuguese|spanish|french/i.test(tag) || req.type === 'language') {
    return profile.profileStrength >= (req.weight === 'critical' ? 58 : 48);
  }
  if (/startup|founder|entrepreneur/i.test(tag)) return profile.hasStartup;
  if (/leadership|lead/i.test(tag)) return profile.hasStartup || profile.engagementScore >= 55;
  if (/network|event/i.test(tag)) return profile.engagementScore >= 50;
  if (/internship|experience/i.test(tag)) return (profile.employabilityScore ?? 0) >= 52;
  if (/communication|analytical|creative|discipline|behavioral/i.test(tag) || req.type === 'behavioral') {
    return profile.profileStrength >= 52 && (profile.employabilityScore ?? 0) >= 48;
  }
  if (/excel|python|financial|skill|technical/i.test(tag) || req.type === 'skill') {
    return profile.profileStrength >= 50;
  }
  if (/availability|part-time|summer|full-time|immediate/i.test(tag)) {
    return true;
  }
  return profile.profileStrength >= 45;
}

function countMissingCritical(
  profile: StudentCareerProfile,
  requirements: StructuredRequirement[]
): number {
  const critical = requirements.filter(
    (r) => r.status === 'active' && !r.isPreferred && r.weight === 'critical'
  );
  return critical.filter((r) => !studentMeetsRequirement(profile, r)).length;
}

export function generateWhyStudentFits(
  profile: StudentCareerProfile,
  compat: ReturnType<typeof computeCompanyStudentCompatibility>,
  requirements: StructuredRequirement[]
): string[] {
  const lines: string[] = [];
  const active = requirements.filter((r) => r.status === 'active');
  const missingCritical = countMissingCritical(profile, active);

  if (missingCritical === 0 && active.some((r) => !r.isPreferred && r.weight === 'critical')) {
    lines.push('Meets all non-negotiables');
  }
  if (compat.leadership >= 72) lines.push('Matches leadership culture');
  if (compat.startupActivity >= 70) lines.push('Excellent startup alignment');
  if (compat.communication >= 72) lines.push('Strong communication indicators');
  if (compat.academicAlignment >= 75) lines.push('Strong analytical profile');
  const prefHits = active.filter((r) => r.isPreferred && studentMeetsRequirement(profile, r)).length;
  if (prefHits >= 2) lines.push('High compatibility with preferred qualities');
  if (lines.length === 0) {
    if (compat.overall >= 75) lines.push('Strong overall ecosystem alignment');
    else lines.push('Potential match with room to grow on key signals');
  }
  return lines.slice(0, 4);
}

export function buildStudentRoleFitGaps(
  profile: StudentCareerProfile,
  companyName: string,
  requirements: StructuredRequirement[]
): string[] {
  const gaps: string[] = [];
  const active = requirements.filter((r) => r.status === 'active');

  for (const req of active) {
    if (studentMeetsRequirement(profile, req)) continue;
    if (req.type === 'language' && /english/i.test(req.name)) {
      gaps.push('Complete English verification');
    } else if (/leadership|event/i.test(req.name)) {
      gaps.push('Attend leadership events');
    } else if (/network/i.test(req.name)) {
      gaps.push('Improve networking activity');
    } else if (req.type === 'skill') {
      gaps.push(`Add a verified project demonstrating ${req.name}`);
    } else if (req.type === 'academic') {
      gaps.push(`Strengthen academic performance for ${req.name}`);
    } else if (/startup/i.test(req.name)) {
      gaps.push('Document startup experience in Startup Hub');
    } else {
      gaps.push(`Improve signal for ${req.name}`);
    }
  }

  if (profile.profileStrength < 65) gaps.push('Complete your profile');
  if (gaps.length === 0) return [`Your profile aligns well with ${companyName} requirements.`];
  return [...new Set(gaps)].slice(0, 5);
}

async function loadPartnerStudents(companyUserId: string, visibility?: RoleVisibilitySettings) {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId);
  if (uniIds.length === 0) return [];

  const students = await prisma.studentProfile.findMany({
    where: { universityId: { in: uniIds } },
    include: {
      user: { select: { headline: true } },
      identitySettings: true,
    },
    take: 150,
  });

  return students.filter((s) => {
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
    if (visibility?.finalYearOnly && (s.yearOfStudy ?? 0) < 3) return false;
    return true;
  });
}

/** Fast heuristic preview — no per-student profile builds (for instant UI). */
export async function estimateCompatibilityPreviewFast(
  companyUserId: string,
  requirements: StructuredRequirement[]
): Promise<CompatibilityPreview> {
  const pool = await countPartnerStudents(companyUserId);
  const active = requirements.filter((r) => r.status === 'active');
  const critical = active.filter((r) => !r.isPreferred && r.weight === 'critical').length;
  const pref = active.filter((r) => r.isPreferred).length;
  const openness = Math.max(0.28, 1 - critical * 0.07 + pref * 0.025);
  const strongMatches = Math.max(0, Math.round(pool * 0.12 * openness));
  const potentialMatches = Math.max(
    strongMatches,
    Math.round(pool * 0.34 * openness)
  );
  return {
    strongMatches,
    potentialMatches,
    highLeadershipMatches: Math.round(strongMatches * 0.35),
    startupAlignedMatches: Math.round(strongMatches * 0.4),
    missingOneRequirement: Math.round(potentialMatches * 0.22),
    simulations: [],
  };
}

export async function computeRoleCompatibilityPreview(
  companyUserId: string,
  requirements: StructuredRequirement[],
  visibility?: RoleVisibilitySettings,
  compareRequirements?: StructuredRequirement[],
  options?: { full?: boolean }
): Promise<CompatibilityPreview> {
  if (!options?.full) {
    return estimateCompatibilityPreviewFast(companyUserId, requirements);
  }
  const companyCriteria = await getCompanyPresenceMatchCriteria(companyUserId);
  const { nonNegotiables, preferredQualities, requiredSkills } = labelsForCompatibility(requirements);
  const students = await loadPartnerStudents(companyUserId, visibility);

  const active = requirements.filter((r) => r.status === 'active');
  const critical = active.filter((r) => !r.isPreferred && r.weight === 'critical');

  let strongMatches = 0;
  let potentialMatches = 0;
  let highLeadershipMatches = 0;
  let startupAlignedMatches = 0;
  let missingOneRequirement = 0;

  const degreeCounts = new Map<string, number>();

  for (const s of students.slice(0, 100)) {
    try {
      const profile = await buildStudentProfile(s.userId);
      const c = computeCompanyStudentCompatibility(profile, {
        nonNegotiables: [...companyCriteria.nonNegotiables, ...nonNegotiables],
        preferredQualities: [...companyCriteria.preferredQualities, ...preferredQualities],
        requiredSkills,
        preferredSkills: [],
      });

      const missingCrit = countMissingCritical(profile, active);
      if (missingCrit === 1) missingOneRequirement++;
      if (c.overall >= 75 && missingCrit === 0) strongMatches++;
      else if (c.overall >= 58) potentialMatches++;
      if (c.leadership >= 72) highLeadershipMatches++;
      if (c.startupActivity >= 70) startupAlignedMatches++;

      const deg = s.program ?? 'General';
      if (c.overall >= 65) degreeCounts.set(deg, (degreeCounts.get(deg) ?? 0) + 1);
    } catch {
      /* skip */
    }
  }

  const simulations: CompatibilityPreview['simulations'] = [];
  if (compareRequirements) {
    const base = await computeRoleCompatibilityPreview(companyUserId, requirements, visibility);
    const alt = await computeRoleCompatibilityPreview(companyUserId, compareRequirements, visibility);
    const dStrong = alt.strongMatches - base.strongMatches;
    const dPot = alt.potentialMatches - base.potentialMatches;
    if (dStrong !== 0 || dPot !== 0) {
      simulations.push({
        text: `Scenario change: ${dStrong >= 0 ? '+' : ''}${dStrong} strong, ${dPot >= 0 ? '+' : ''}${dPot} potential matches`,
        deltaStrong: dStrong,
        deltaPotential: dPot,
      });
    }
  }

  const gpaReq = critical.find((r) => /gpa/i.test(r.name));
  if (gpaReq) {
    const relaxed = active.map((r) =>
      r.id === gpaReq.id ? { ...r, weight: 'bonus' as RequirementWeight, weightScore: 4 } : r
    );
    const withoutGpa = active.filter((r) => r.id !== gpaReq.id);
    const [withBonus, withoutGpaPreview] = await Promise.all([
      computeRoleCompatibilityPreview(companyUserId, relaxed, visibility),
      computeRoleCompatibilityPreview(companyUserId, withoutGpa, visibility),
    ]);
    const delta = withoutGpaPreview.strongMatches - withBonus.strongMatches;
    if (Math.abs(delta) >= 3) {
      simulations.push({
        text: `If you remove GPA threshold: ${delta >= 0 ? '+' : ''}${Math.abs(delta)} compatible students`,
        deltaStrong: delta,
        deltaPotential: withoutGpaPreview.potentialMatches - withBonus.potentialMatches,
      });
    }
  }

  const englishReq = active.find((r) => /english/i.test(r.name) && !r.isPreferred);
  if (englishReq) {
    const stricter = active.map((r) =>
      r.id === englishReq.id ? { ...r, weight: 'critical' as RequirementWeight, weightScore: 10 } : r
    );
    const [baseLine, strict] = await Promise.all([
      computeRoleCompatibilityPreview(companyUserId, active, visibility),
      computeRoleCompatibilityPreview(companyUserId, stricter, visibility),
    ]);
    const delta = strict.strongMatches - baseLine.strongMatches;
    if (delta <= -5) {
      simulations.push({
        text: `If English becomes Critical: ${delta} compatible students`,
        deltaStrong: delta,
        deltaPotential: strict.potentialMatches - baseLine.potentialMatches,
      });
    }
  }

  const startupPref = active.find((r) => r.isPreferred && /startup/i.test(r.name));
  if (startupPref) {
    const asBonus = active.map((r) =>
      r.id === startupPref.id ? { ...r, weight: 'bonus' as RequirementWeight } : r
    );
    const asCritical = active.map((r) =>
      r.id === startupPref.id
        ? { ...r, weight: 'critical' as RequirementWeight, isPreferred: false, weightScore: 10 }
        : r
    );
    const [bonus, crit] = await Promise.all([
      computeRoleCompatibilityPreview(companyUserId, asBonus, visibility),
      computeRoleCompatibilityPreview(companyUserId, asCritical, visibility),
    ]);
    const delta = bonus.potentialMatches - crit.potentialMatches;
    if (delta >= 8) {
      simulations.push({
        text: `If Startup Experience becomes Bonus instead of Critical: +${delta} potential matches`,
        deltaStrong: bonus.strongMatches - crit.strongMatches,
        deltaPotential: delta,
      });
    }
  }

  return {
    strongMatches,
    potentialMatches: strongMatches + potentialMatches,
    highLeadershipMatches,
    startupAlignedMatches,
    missingOneRequirement,
    simulations: simulations.slice(0, 4),
  };
}

export async function loadRoleRequirementsHub(companyUserId: string): Promise<RoleRequirementsHub> {
  await ensureCompanyPresenceTables();
  const [profile, rolesRaw, deptRows] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { userId: companyUserId } }),
    prisma.$queryRaw<
      {
        id: string;
        title: string;
        departmentId: string | null;
        isFilled: boolean;
        currentlyHiring: boolean | null;
        status: string;
        hiringPriority: string | null;
        nonNegotiables: unknown;
        preferredQualities: unknown;
        requiredSkills: unknown;
        structuredRequirements: unknown;
        internshipId: string | null;
      }[]
    >`
      SELECT "id", "title", "departmentId", "isFilled", "currentlyHiring", "status", "hiringPriority",
             "nonNegotiables", "preferredQualities", "requiredSkills", "structuredRequirements",
             "internshipId"
      FROM "CompanyRole"
      WHERE "companyUserId" = ${companyUserId} AND "status" != 'archived'
      ORDER BY "sortOrder" ASC, "title" ASC
    `,
    prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT "id", "name" FROM "CompanyDepartment" WHERE "companyUserId" = ${companyUserId}
    `,
  ]);

  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));

  const roles: RoleRequirementsHubCard[] = await Promise.all(
    rolesRaw.map(async (r) => {
      let applicationCount = 0;
      if (r.internshipId) {
        applicationCount = await prisma.internshipApplication.count({
          where: { internshipId: r.internshipId },
        });
      }

      let structured = parseStructuredRequirements(r.structuredRequirements);
      if (structured.length === 0) {
        structured = migrateLegacyToStructured({
          nonNegotiables: parseJsonArray(r.nonNegotiables).map(labelForRequirementTag),
          preferredQualities: parseJsonArray(r.preferredQualities).map(labelForRequirementTag),
          requiredSkills: parseJsonArray(r.requiredSkills).map(labelForRequirementTag),
        });
      }

      const preview = await computeRoleCompatibilityPreview(companyUserId, structured);
      const completion = requirementsCompletionPct(structured);
      const compat =
        preview.strongMatches > 0
          ? Math.min(92, 68 + Math.min(20, preview.strongMatches))
          : 62 + Math.min(12, completion / 8);

      const priority = r.hiringPriority ?? 'normal';
      const currentlyHiring = parseCurrentlyHiring(r.currentlyHiring, r.isFilled);
      return {
        id: r.id,
        title: r.title,
        departmentId: r.departmentId,
        departmentName: r.departmentId ? deptMap.get(r.departmentId) ?? null : null,
        compatibilityAverage: compat,
        applicationCount,
        fitQuality: fitQualityLabel(completion, compat),
        requirementsCompletion: completion,
        hiringUrgency: priority,
        hiringUrgencyLabel: recruitmentStatusLabel(r.isFilled, currentlyHiring, priority),
        isFilled: r.isFilled,
        status: r.status,
        openLabel: r.isFilled
          ? 'Filled'
          : currentlyHiring
            ? 'Open'
            : 'Open · not actively hiring',
      };
    })
  );

  return {
    companyName: profile?.companyName ?? 'Your company',
    roles,
    totalRoles: roles.length,
  };
}

export function buildRoleFitSnapshot(input: {
  id: string;
  title: string;
  departmentId?: string | null;
  departmentName?: string | null;
  isFilled?: boolean;
  compatibilityAverage?: number;
  applicationCount?: number;
  hiringPriority?: string;
}): RoleFitIntelligenceView {
  const isFilled = Boolean(input.isFilled);
  const compat = input.compatibilityAverage ?? 68;
  const apps = input.applicationCount ?? 0;
  return {
    id: input.id,
    title: input.title,
    departmentId: input.departmentId ?? null,
    departmentName: input.departmentName ?? null,
    isFilled,
    status: 'published',
    hiringPriority: input.hiringPriority ?? 'normal',
    hero: {
      compatibilityAverage: compat,
      totalCompatibleStudents: Math.max(apps * 3, 24),
      strongestMatchingDegree: '—',
      topSkills: [],
      startupAlignment: 58,
      leadershipAlignment: 60,
      applicationCount: apps,
      openLabel: isFilled ? 'Filled' : 'Open',
    },
    requirements: [],
    preferredQualities: [],
    preview: {
      strongMatches: 0,
      potentialMatches: 0,
      highLeadershipMatches: 0,
      startupAlignedMatches: 0,
      missingOneRequirement: 0,
      simulations: [],
    },
    topStudents: [],
  };
}

export async function loadRoleFitIntelligence(
  companyUserId: string,
  roleId: string,
  options?: { includeFullPreview?: boolean }
): Promise<RoleFitIntelligenceView | null> {
  await ensureCompanyPresenceTables();
  const rows = await prisma.$queryRaw<
    Record<string, unknown>[]
  >`
    SELECT * FROM "CompanyRole" WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const departmentId = row.departmentId as string | null;
  let departmentName: string | null = null;
  if (departmentId) {
    const d = await prisma.$queryRaw<{ name: string }[]>`
      SELECT "name" FROM "CompanyDepartment" WHERE "id" = ${departmentId} LIMIT 1
    `;
    departmentName = d[0]?.name ?? null;
  }

  let allReqs = parseStructuredRequirements(row.structuredRequirements);
  if (allReqs.length === 0) {
    allReqs = migrateLegacyToStructured({
      nonNegotiables: parseJsonArray(row.nonNegotiables).map(labelForRequirementTag),
      preferredQualities: parseJsonArray(row.preferredQualities).map(labelForRequirementTag),
      requiredSkills: parseJsonArray(row.requiredSkills).map(labelForRequirementTag),
    });
  }

  const requirements = allReqs.filter((r) => !r.isPreferred && r.status === 'active');
  const preferredQualities = allReqs.filter((r) => r.isPreferred && r.status === 'active');
  const archived = allReqs.filter((r) => r.status === 'archived');

  const visibility =
    row.visibilitySettings && typeof row.visibilitySettings === 'object'
      ? (row.visibilitySettings as RoleVisibilitySettings)
      : undefined;

  const [preview, applications] = await Promise.all([
    options?.includeFullPreview
      ? computeRoleCompatibilityPreview(companyUserId, allReqs, visibility, undefined, {
          full: true,
        })
      : estimateCompatibilityPreviewFast(companyUserId, allReqs),
    (async () => {
      const internshipId = row.internshipId as string | null;
      if (!internshipId) return [];
      return prisma.internshipApplication.findMany({
        where: { internshipId },
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, image: true, headline: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      });
    })(),
  ]);

  const requiredSkills = parseJsonArray(row.requiredSkills).map(labelForRequirementTag);
  const cardCompat =
    applications.length > 0
      ? 68
      : preview.strongMatches > 0
        ? 74
        : 62;

  const topStudents = applications.slice(0, 8).map((app) => {
    const sp = app.student;
    const compat = quickApplicantCompatibility(
      sp.employabilityScore ?? 0,
      sp.profileStrength ?? 0,
      cardCompat
    );
    return {
      userId: app.student.userId,
      name: app.student.user.name ?? 'Student',
      image: app.student.user.image,
      compatibility: compat,
      headline: app.student.user.headline,
      whyFits: [
        compat >= 75 ? 'Strong ecosystem alignment' : 'Potential match with growth areas',
        'Meets visibility in partner universities',
      ],
    };
  });

  topStudents.sort((a, b) => b.compatibility - a.compatibility);

  let topSkills = requiredSkills.slice(0, 4);
  const strongestDegree = 'Business & Management';

  const isFilled = Boolean(row.isFilled);
  const priority = String(row.hiringPriority ?? 'normal');

  return {
    id: roleId,
    title: String(row.title),
    departmentId,
    departmentName,
    isFilled,
    status: String(row.status ?? 'published'),
    hiringPriority: priority,
    hero: {
      compatibilityAverage:
        topStudents.length > 0
          ? Math.round(topStudents.reduce((a, s) => a + s.compatibility, 0) / topStudents.length)
          : preview.strongMatches > 0
            ? 74
            : 62,
      totalCompatibleStudents: preview.potentialMatches,
      strongestMatchingDegree: strongestDegree,
      topSkills: topSkills.length ? topSkills : ['Communication', 'Analytical thinking'],
      startupAlignment: Math.min(92, 52 + preview.startupAlignedMatches),
      leadershipAlignment: Math.min(92, 50 + preview.highLeadershipMatches),
      applicationCount: applications.length,
      openLabel: isFilled ? 'Filled' : 'Open',
    },
    requirements: [...requirements, ...archived.filter((r) => !r.isPreferred)],
    preferredQualities: [...preferredQualities, ...archived.filter((r) => r.isPreferred)],
    preview,
    topStudents,
  };
}

export async function saveRoleStructuredRequirements(
  companyUserId: string,
  roleId: string,
  requirements: StructuredRequirement[]
): Promise<void> {
  const legacy = syncLegacyFromStructured(requirements);
  await prisma.$executeRaw`
    UPDATE "CompanyRole" SET
      "structuredRequirements" = ${JSON.stringify(requirements)}::jsonb,
      "nonNegotiables" = ${JSON.stringify(legacy.nonNegotiables)}::jsonb,
      "preferredQualities" = ${JSON.stringify(legacy.preferredQualities)}::jsonb,
      "requiredSkills" = ${JSON.stringify(legacy.requiredSkills)}::jsonb,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
  `;
}

export { REQUIREMENT_TEMPLATES, PREFERRED_QUALITY_TEMPLATES, templateById };
