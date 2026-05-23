import { cache } from 'react';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ensureCompanyWorkspaceTables } from '@/lib/db/ensure-company-workspace-schema';
import {
  canCompany,
  normalizePermission,
  PERMISSION_LABELS,
  type CompanyPermission,
} from '@/lib/company/company-permissions';

export interface CompanyWorkspaceContext {
  actorUserId: string;
  workspaceOwnerId: string;
  permission: CompanyPermission;
  accountType: string;
  isOwner: boolean;
  companyName: string;
}

function newId() {
  return crypto.randomUUID();
}

export async function logWorkspaceActivity(
  workspaceOwnerId: string,
  action: string,
  detail: string,
  actorUserId?: string,
  meta?: Record<string, unknown>
) {
  await ensureCompanyWorkspaceTables();
  try {
    await prisma.$executeRaw`
      INSERT INTO "CompanyWorkspaceActivity" ("id", "workspaceOwnerId", "actorUserId", "action", "detail", "metaJson", "createdAt")
      VALUES (${newId()}, ${workspaceOwnerId}, ${actorUserId ?? null}, ${action}, ${detail}, ${JSON.stringify(meta ?? {})}::jsonb, CURRENT_TIMESTAMP)
    `;
  } catch (e) {
    console.error('[company-workspace:activity]', e);
  }
}

export async function ensureOwnerWorkspaceMember(workspaceOwnerId: string) {
  await ensureCompanyWorkspaceTables();
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CompanyWorkspaceMember"
    WHERE "workspaceOwnerId" = ${workspaceOwnerId} AND "userId" = ${workspaceOwnerId}
    LIMIT 1
  `;
  if (existing.length > 0) return;

  await prisma.$executeRaw`
    INSERT INTO "CompanyWorkspaceMember" (
      "id", "workspaceOwnerId", "userId", "teamMemberId",
      "permission", "accountType", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${newId()}, ${workspaceOwnerId}, ${workspaceOwnerId}, NULL,
      'OWNER', 'Main Owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
}

let companyWorkspaceTablesReady = false;

export const resolveCompanyWorkspace = cache(async function resolveCompanyWorkspace(
  actorUserId: string
): Promise<CompanyWorkspaceContext | null> {
  if (!companyWorkspaceTablesReady) {
    await ensureCompanyWorkspaceTables();
    companyWorkspaceTablesReady = true;
  }

  const user = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true, name: true },
  });
  if (!user || user.role !== 'COMPANY') return null;

  const memberRows = await prisma.$queryRaw<
    {
      workspaceOwnerId: string;
      permission: string;
      accountType: string;
    }[]
  >`
    SELECT "workspaceOwnerId", "permission", "accountType"
    FROM "CompanyWorkspaceMember"
    WHERE "userId" = ${actorUserId} AND "status" = 'active'
    LIMIT 1
  `;

  let workspaceOwnerId = actorUserId;
  let permission: CompanyPermission = 'OWNER';
  let accountType = 'Main Owner';

  if (memberRows.length > 0) {
    workspaceOwnerId = memberRows[0].workspaceOwnerId;
    permission = normalizePermission(memberRows[0].permission);
    accountType = memberRows[0].accountType ?? PERMISSION_LABELS[permission];
  } else {
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: actorUserId },
      select: { userId: true },
    });
    if (!profile) return null;
    await ensureOwnerWorkspaceMember(actorUserId);
  }

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { userId: workspaceOwnerId },
    select: { companyName: true },
  });

  return {
    actorUserId,
    workspaceOwnerId,
    permission,
    accountType,
    isOwner: workspaceOwnerId === actorUserId && permission === 'OWNER',
    companyName: companyProfile?.companyName ?? 'Your company',
  };
});

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const { changeUserPassword: changePassword } = await import('@/lib/auth/password');
  const result = await changePassword(userId, currentPassword, newPassword);
  if (!result.ok) return result;

  const workspace = await resolveCompanyWorkspace(userId);
  if (workspace) {
    await logWorkspaceActivity(
      workspace.workspaceOwnerId,
      'password_changed',
      'Password updated',
      userId
    );
  }

  return { ok: true };
}

export async function createTeamMemberAccount(input: {
  workspace: CompanyWorkspaceContext;
  teamMemberId: string;
  email: string;
  password: string;
  permission: CompanyPermission;
}) {
  if (!canCompany(input.workspace.permission, 'manage_team_accounts')) {
    return { ok: false as const, error: 'You do not have permission to create team accounts' };
  }

  await ensureCompanyWorkspaceTables();

  const email = input.email.toLowerCase().trim();
  if (!email || input.password.length < 8) {
    return { ok: false as const, error: 'Valid email and password (8+ chars) required' };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { ok: false as const, error: 'An account with this email already exists' };
  }

  const teamRows = await prisma.$queryRaw<{ id: string; name: string; roleTitle: string | null }[]>`
    SELECT "id", "name", "roleTitle" FROM "CompanyTeamMember"
    WHERE "id" = ${input.teamMemberId} AND "companyUserId" = ${input.workspace.workspaceOwnerId}
    LIMIT 1
  `;
  if (!teamRows.length) {
    return { ok: false as const, error: 'Team member not found in your company' };
  }

  const linked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CompanyWorkspaceMember"
    WHERE "teamMemberId" = ${input.teamMemberId} AND "userId" IS NOT NULL
    LIMIT 1
  `;
  if (linked.length > 0) {
    return { ok: false as const, error: 'This team member already has login access' };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const team = teamRows[0];

  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: team.name,
      role: 'COMPANY',
    },
  });

  const memberId = newId();
  await prisma.$executeRaw`
    INSERT INTO "CompanyWorkspaceMember" (
      "id", "workspaceOwnerId", "userId", "teamMemberId",
      "permission", "accountType", "roleInCompany", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${memberId}, ${input.workspace.workspaceOwnerId}, ${newUser.id}, ${input.teamMemberId},
      ${input.permission}, ${PERMISSION_LABELS[input.permission]}, ${team.roleTitle},
      'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;

  await logWorkspaceActivity(
    input.workspace.workspaceOwnerId,
    'team_account_created',
    `Created login for ${team.name} (${email}) as ${input.permission}`,
    input.workspace.actorUserId,
    { teamMemberId: input.teamMemberId, userId: newUser.id, permission: input.permission }
  );

  return { ok: true as const, userId: newUser.id };
}

export async function updateWorkspaceMemberPermission(
  workspace: CompanyWorkspaceContext,
  workspaceMemberId: string,
  permission: CompanyPermission
) {
  if (!canCompany(workspace.permission, 'manage_permissions')) {
    return { ok: false as const, error: 'Permission denied' };
  }

  await prisma.$executeRaw`
    UPDATE "CompanyWorkspaceMember"
    SET "permission" = ${permission}, "accountType" = ${PERMISSION_LABELS[permission]}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${workspaceMemberId} AND "workspaceOwnerId" = ${workspace.workspaceOwnerId}
  `;

  await logWorkspaceActivity(
    workspace.workspaceOwnerId,
    'permission_changed',
    `Permission set to ${permission}`,
    workspace.actorUserId,
    { workspaceMemberId, permission }
  );

  return { ok: true as const };
}

export async function deactivateWorkspaceMember(
  workspace: CompanyWorkspaceContext,
  workspaceMemberId: string
) {
  if (!canCompany(workspace.permission, 'manage_team_accounts')) {
    return { ok: false as const, error: 'Permission denied' };
  }

  await prisma.$executeRaw`
    UPDATE "CompanyWorkspaceMember"
    SET "status" = 'deactivated', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${workspaceMemberId} AND "workspaceOwnerId" = ${workspace.workspaceOwnerId}
      AND "userId" != ${workspace.workspaceOwnerId}
  `;

  await logWorkspaceActivity(
    workspace.workspaceOwnerId,
    'team_access_deactivated',
    'Team member login access deactivated',
    workspace.actorUserId,
    { workspaceMemberId }
  );

  return { ok: true as const };
}
