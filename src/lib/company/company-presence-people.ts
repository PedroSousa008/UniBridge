import { prisma } from '@/lib/db';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';

const PLACEHOLDER_NAMES = new Set([
  'new team member',
  'team member',
  'untitled',
  'new employee',
  'new person',
]);

const MANUAL_MEMBER_TYPES = new Set(['employee', 'mentor', 'recruiter', 'founder', 'leadership']);

export type CompanyTeamMemberRow = {
  id: string;
  name: string;
  photoUrl: string | null;
  age: number | null;
  roleTitle: string | null;
  memberType: string;
  previousUniversity: string | null;
  degree: string | null;
  bio: string | null;
  departmentId: string | null;
  graduationYear: string | null;
  linkedInUrl: string | null;
  portfolioUrl: string | null;
  startedAt: Date | null;
  careerPath: string | null;
  mentoringAvailable: boolean | null;
  messagesAvailable: boolean | null;
  companyRoleId: string | null;
};

export interface CompanyTeamMemberProfile {
  id: string;
  name: string;
  photoUrl: string | null;
  age: number | null;
  roleTitle: string | null;
  memberType: string;
  previousUniversity: string | null;
  degree: string | null;
  graduationYear: string | null;
  bio: string | null;
  departmentId: string | null;
  departmentName: string | null;
  linkedInUrl: string | null;
  portfolioUrl: string | null;
  startedAt: string | null;
  careerPath: string | null;
  mentoringAvailable: boolean;
  messagesAvailable: boolean;
  companyRoleId: string | null;
  linkedRoles: { id: string; title: string; departmentName: string | null; isFilled: boolean }[];
}

export interface CompanyPresenceTeamMemberCard {
  id: string;
  name: string;
  photoUrl: string | null;
  age: number | null;
  roleTitle: string | null;
  memberType: string;
  previousUniversity: string | null;
  degree: string | null;
  bio: string | null;
  departmentId: string | null;
  departmentName: string | null;
  companyRoleId: string | null;
  linkedRoleTitle: string | null;
  graduationYear: string | null;
  linkedInUrl: string | null;
  mentoringAvailable: boolean;
  messagesAvailable: boolean;
}

type RoleLinkRow = {
  id: string;
  title: string;
  departmentId: string | null;
  isFilled: boolean;
  status: string;
  positionHolderId: string | null;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export function isRealPersonName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return !PLACEHOLDER_NAMES.has(normalizeName(trimmed));
}

function rowToCard(
  row: CompanyTeamMemberRow,
  deptNames: Map<string, string>,
  roleById: Map<string, RoleLinkRow>
): CompanyPresenceTeamMemberCard | null {
  if (!isRealPersonName(row.name)) return null;

  const linkedRole = row.companyRoleId ? roleById.get(row.companyRoleId) : undefined;
  const heldRoles = [...roleById.values()].filter((r) => r.positionHolderId === row.id);
  const isPositionHolder = row.memberType === 'position_holder';

  if (isPositionHolder || row.companyRoleId) {
    const activeFilledHeld = heldRoles.filter((r) => r.isFilled && r.status !== 'archived');
    if (activeFilledHeld.length > 0) {
      const primary = activeFilledHeld[0];
      return {
        id: row.id,
        name: row.name.trim(),
        photoUrl: row.photoUrl,
        age: row.age,
        roleTitle: row.roleTitle ?? primary.title,
        memberType: row.memberType,
        previousUniversity: row.previousUniversity,
        degree: row.degree,
        bio: row.bio,
        departmentId: row.departmentId,
        departmentName: row.departmentId ? deptNames.get(row.departmentId) ?? null : null,
        companyRoleId: row.companyRoleId,
        linkedRoleTitle: primary.title,
        graduationYear: row.graduationYear,
        linkedInUrl: row.linkedInUrl,
        mentoringAvailable: Boolean(row.mentoringAvailable),
        messagesAvailable: Boolean(row.messagesAvailable),
      };
    }
    if (linkedRole && linkedRole.isFilled && linkedRole.status !== 'archived') {
      return {
        id: row.id,
        name: row.name.trim(),
        photoUrl: row.photoUrl,
        age: row.age,
        roleTitle: row.roleTitle ?? linkedRole.title,
        memberType: row.memberType,
        previousUniversity: row.previousUniversity,
        degree: row.degree,
        bio: row.bio,
        departmentId: row.departmentId,
        departmentName: row.departmentId ? deptNames.get(row.departmentId) ?? null : null,
        companyRoleId: row.companyRoleId,
        linkedRoleTitle: linkedRole.title,
        graduationYear: row.graduationYear,
        linkedInUrl: row.linkedInUrl,
        mentoringAvailable: Boolean(row.mentoringAvailable),
        messagesAvailable: Boolean(row.messagesAvailable),
      };
    }
    return null;
  }

  if (!MANUAL_MEMBER_TYPES.has(row.memberType)) return null;

  if (linkedRole && (!linkedRole.isFilled || linkedRole.status === 'archived')) {
    return null;
  }

  return {
    id: row.id,
    name: row.name.trim(),
    photoUrl: row.photoUrl,
    age: row.age,
    roleTitle: row.roleTitle,
    memberType: row.memberType,
    previousUniversity: row.previousUniversity,
    degree: row.degree,
    bio: row.bio,
    departmentId: row.departmentId,
    departmentName: row.departmentId ? deptNames.get(row.departmentId) ?? null : null,
    companyRoleId: row.companyRoleId,
    linkedRoleTitle: linkedRole?.title ?? null,
    graduationYear: row.graduationYear,
    linkedInUrl: row.linkedInUrl,
    mentoringAvailable: Boolean(row.mentoringAvailable),
    messagesAvailable: Boolean(row.messagesAvailable),
  };
}

async function loadTeamContext(companyUserId: string) {
  await ensureCompanyPresenceTables();
  const [depts, roles, members] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT "id", "name" FROM "CompanyDepartment" WHERE "companyUserId" = ${companyUserId}
    `,
    prisma.$queryRaw<RoleLinkRow[]>`
      SELECT "id", "title", "departmentId", "isFilled", "status", "positionHolderId"
      FROM "CompanyRole"
      WHERE "companyUserId" = ${companyUserId}
    `,
    prisma.$queryRaw<CompanyTeamMemberRow[]>`
      SELECT "id", "name", "photoUrl", "age", "roleTitle", "memberType",
             "previousUniversity", "degree", "bio", "departmentId",
             "graduationYear", "linkedInUrl", "portfolioUrl", "startedAt", "careerPath",
             "mentoringAvailable", "messagesAvailable", "companyRoleId"
      FROM "CompanyTeamMember"
      WHERE "companyUserId" = ${companyUserId}
      ORDER BY "sortOrder" ASC, "name" ASC
    `,
  ]);
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));
  const roleById = new Map(roles.map((r) => [r.id, r]));
  return { deptNames, roleById, members };
}

/** People section + student presence: real humans only (no open jobs / placeholders). */
export async function loadDisplayableTeamMembers(
  companyUserId: string
): Promise<CompanyPresenceTeamMemberCard[]> {
  const { deptNames, roleById, members } = await loadTeamContext(companyUserId);
  const cards: CompanyPresenceTeamMemberCard[] = [];
  for (const row of members) {
    const card = rowToCard(row, deptNames, roleById);
    if (card) cards.push(card);
  }
  return cards;
}

export async function loadCompanyTeamMemberProfile(
  companyUserId: string,
  memberId: string
): Promise<CompanyTeamMemberProfile | null> {
  const { deptNames, roleById, members } = await loadTeamContext(companyUserId);
  const row = members.find((m) => m.id === memberId);
  if (!row || !rowToCard(row, deptNames, roleById)) return null;

  const linkedRoles = [...roleById.values()]
    .filter((r) => r.positionHolderId === memberId || r.id === row.companyRoleId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      departmentName: r.departmentId ? deptNames.get(r.departmentId) ?? null : null,
      isFilled: r.isFilled,
    }));

  return {
    id: row.id,
    name: row.name.trim(),
    photoUrl: row.photoUrl,
    age: row.age,
    roleTitle: row.roleTitle,
    memberType: row.memberType,
    previousUniversity: row.previousUniversity,
    degree: row.degree,
    graduationYear: row.graduationYear,
    bio: row.bio,
    departmentId: row.departmentId,
    departmentName: row.departmentId ? deptNames.get(row.departmentId) ?? null : null,
    linkedInUrl: row.linkedInUrl,
    portfolioUrl: row.portfolioUrl,
    startedAt: row.startedAt?.toISOString() ?? null,
    careerPath: row.careerPath,
    mentoringAvailable: Boolean(row.mentoringAvailable),
    messagesAvailable: Boolean(row.messagesAvailable),
    companyRoleId: row.companyRoleId,
    linkedRoles,
  };
}

export function buildTeamMemberProfileSnapshot(
  card: CompanyPresenceTeamMemberCard
): CompanyTeamMemberProfile {
  return {
    id: card.id,
    name: card.name,
    photoUrl: card.photoUrl,
    age: card.age,
    roleTitle: card.roleTitle,
    memberType: card.memberType,
    previousUniversity: card.previousUniversity,
    degree: card.degree,
    graduationYear: card.graduationYear ?? null,
    bio: card.bio,
    departmentId: card.departmentId,
    departmentName: card.departmentName,
    linkedInUrl: card.linkedInUrl,
    portfolioUrl: null,
    startedAt: null,
    careerPath: null,
    mentoringAvailable: card.mentoringAvailable,
    messagesAvailable: card.messagesAvailable,
    companyRoleId: card.companyRoleId,
    linkedRoles: card.linkedRoleTitle
      ? [
          {
            id: card.companyRoleId ?? card.id,
            title: card.linkedRoleTitle,
            departmentName: card.departmentName,
            isFilled: true,
          },
        ]
      : [],
  };
}

/** Remove people who only existed because of a deleted role (call before deleting the role). */
export async function pruneTeamMembersExclusiveToRole(
  companyUserId: string,
  roleId: string,
  positionHolderId?: string | null
) {
  await ensureCompanyPresenceTables();
  let holderId = positionHolderId ?? null;
  if (holderId === undefined) {
    const roleRows = await prisma.$queryRaw<{ positionHolderId: string | null }[]>`
      SELECT "positionHolderId" FROM "CompanyRole"
      WHERE "id" = ${roleId} AND "companyUserId" = ${companyUserId}
      LIMIT 1
    `;
    holderId = roleRows[0]?.positionHolderId ?? null;
  }

  const linkedMembers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CompanyTeamMember"
    WHERE "companyUserId" = ${companyUserId} AND "companyRoleId" = ${roleId}
  `;

  const candidateIds = new Set<string>();
  if (holderId) candidateIds.add(holderId);
  for (const m of linkedMembers) candidateIds.add(m.id);

  for (const memberId of candidateIds) {
    await deleteTeamMemberIfOnlyLinkedToRole(companyUserId, memberId, roleId);
  }
}

export async function pruneTeamMembersForDeletedRoles(
  companyUserId: string,
  roleIds: string[]
) {
  for (const roleId of roleIds) {
    await pruneTeamMembersExclusiveToRole(companyUserId, roleId);
  }
}

async function deleteTeamMemberIfOnlyLinkedToRole(
  companyUserId: string,
  memberId: string,
  excludeRoleId: string
) {
  const rows = await prisma.$queryRaw<
    { memberType: string; companyRoleId: string | null; name: string }[]
  >`
    SELECT "memberType", "companyRoleId", "name" FROM "CompanyTeamMember"
    WHERE "id" = ${memberId} AND "companyUserId" = ${companyUserId}
    LIMIT 1
  `;
  const member = rows[0];
  if (!member) return;

  const otherHolderCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "CompanyRole"
    WHERE "companyUserId" = ${companyUserId}
      AND "positionHolderId" = ${memberId}
      AND "id" != ${excludeRoleId}
  `;
  const otherHolds = Number(otherHolderCount[0]?.count ?? 0);
  if (otherHolds > 0) return;

  if (MANUAL_MEMBER_TYPES.has(member.memberType) && member.memberType !== 'position_holder') {
    if (member.companyRoleId === excludeRoleId) {
      await prisma.$executeRaw`
        UPDATE "CompanyTeamMember" SET "companyRoleId" = NULL
        WHERE "id" = ${memberId} AND "companyUserId" = ${companyUserId}
      `;
    }
    return;
  }

  if (member.companyRoleId && member.companyRoleId !== excludeRoleId) {
    const otherRole = await prisma.$queryRaw<{ isFilled: boolean; status: string }[]>`
      SELECT "isFilled", "status" FROM "CompanyRole"
      WHERE "id" = ${member.companyRoleId} AND "companyUserId" = ${companyUserId}
      LIMIT 1
    `;
    if (otherRole[0] && otherRole[0].isFilled && otherRole[0].status !== 'archived') return;
  }

  await prisma.$executeRaw`
    DELETE FROM "CompanyTeamMember" WHERE "id" = ${memberId} AND "companyUserId" = ${companyUserId}
  `;
}

/** After a role switches from filled → hiring, drop orphan position-holder records. */
export async function prunePositionHolderAfterRoleUnfilled(
  companyUserId: string,
  roleId: string,
  previousHolderId: string | null
) {
  if (!previousHolderId) return;
  await deleteTeamMemberIfOnlyLinkedToRole(companyUserId, previousHolderId, roleId);
}
