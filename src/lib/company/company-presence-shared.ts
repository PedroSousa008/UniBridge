import { prisma } from '@/lib/db';
import { sanitizeStoredImageUrl } from '@/lib/uploads/stored-image-url';

/** Batch application counts for many internships in one query. */
export async function batchInternshipApplicationCounts(
  internshipIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (internshipIds.length === 0) return map;
  const counts = await prisma.internshipApplication.groupBy({
    by: ['internshipId'],
    where: { internshipId: { in: internshipIds } },
    _count: { id: true },
  });
  for (const c of counts) map.set(c.internshipId, c._count.id);
  return map;
}

export type RoleStatus = 'hiring' | 'filled';

export function roleStatusFromFilled(isFilled: boolean): RoleStatus {
  return isFilled ? 'filled' : 'hiring';
}

export function parseCurrentlyHiring(value: unknown, isFilled = false): boolean {
  if (isFilled) return false;
  if (value === false || value === 0 || value === 'false') return false;
  return true;
}

/** Single label for recruitment state — used across Presence, Opportunities, and student views. */
export function recruitmentStatusLabel(
  isFilled: boolean,
  currentlyHiring: boolean,
  hiringPriority?: string | null
): string {
  if (isFilled) return 'Position filled';
  if (!currentlyHiring) return 'Not actively hiring';
  if (hiringPriority === 'high') return 'High urgency';
  if (hiringPriority === 'low') return 'Steady hiring';
  return 'Actively hiring';
}

export interface PositionHolderData {
  id?: string;
  photoUrl: string | null;
  name: string;
  age: number | null;
  roleTitle: string;
  departmentName: string;
  previousUniversity: string | null;
  degree: string | null;
  graduationYear: string | null;
  bio: string | null;
  linkedInUrl: string | null;
  startedAt: string | null;
  careerPath: string | null;
  mentoringAvailable: boolean;
  messagesAvailable: boolean;
}

/** Quick partner-universe size for estimates (no per-student profile builds). */
export async function countPartnerStudents(companyUserId: string): Promise<number> {
  const partnerships = await prisma.companyPartnership.findMany({
    where: { companyUserId, status: 'ACTIVE' },
    select: { universityId: true },
  });
  const uniIds = partnerships.map((p) => p.universityId);
  if (uniIds.length === 0) return 0;
  return prisma.studentProfile.count({
    where: { universityId: { in: uniIds } },
  });
}

export function quickApplicantCompatibility(
  employabilityScore: number,
  profileStrength: number,
  fallback = 68
): number {
  if (employabilityScore > 0 || profileStrength > 0) {
    return Math.min(
      99,
      Math.max(42, Math.round(employabilityScore * 0.72 + profileStrength * 0.28))
    );
  }
  return fallback;
}

export function parsePositionHolder(val: unknown): PositionHolderData | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  if (!o.name || typeof o.name !== 'string') return null;
  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    photoUrl: sanitizeStoredImageUrl(o.photoUrl),
    name: o.name,
    age: typeof o.age === 'number' ? o.age : null,
    roleTitle: String(o.roleTitle ?? ''),
    departmentName: String(o.departmentName ?? ''),
    previousUniversity:
      typeof o.previousUniversity === 'string' ? o.previousUniversity : null,
    degree: typeof o.degree === 'string' ? o.degree : null,
    graduationYear: typeof o.graduationYear === 'string' ? o.graduationYear : null,
    bio: typeof o.bio === 'string' ? o.bio : null,
    linkedInUrl: typeof o.linkedInUrl === 'string' ? o.linkedInUrl : null,
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : null,
    careerPath: typeof o.careerPath === 'string' ? o.careerPath : null,
    mentoringAvailable: Boolean(o.mentoringAvailable),
    messagesAvailable: Boolean(o.messagesAvailable),
  };
}
