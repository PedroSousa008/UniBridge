import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/roles';
import {
  resolveCompanyWorkspace,
  type CompanyWorkspaceContext,
} from '@/lib/company/company-workspace';
import type { UserRole } from '@prisma/client';

export type AppSession = Awaited<ReturnType<typeof getServerSession>> & {
  user: {
    id: string;
    role: UserRole;
    companyWorkspaceId?: string;
    companyPermission?: string;
  };
};

/** Data queries for company modules — owner id for sub-accounts. */
export function getCompanyWorkspaceUserId(session: {
  user: { id: string; companyWorkspaceId?: string };
}): string {
  return session.user.companyWorkspaceId ?? session.user.id;
}

async function attachCompanyWorkspace(session: NonNullable<AppSession>) {
  if (session.user.role !== 'COMPANY') return session;
  const ws = await resolveCompanyWorkspace(session.user.id);
  if (ws) {
    session.user.companyWorkspaceId = ws.workspaceOwnerId;
    session.user.companyPermission = ws.permission;
  }
  return session;
}

export async function requireSession(expectedRole?: UserRole) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if (expectedRole && session.user.role !== expectedRole) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return attachCompanyWorkspace(session as NonNullable<AppSession>);
}

/** Company routes: resolves shared workspace (owner id) for sub-accounts. */
export async function requireCompanyWorkspace() {
  const session = await requireSession('COMPANY');
  const workspace = await resolveCompanyWorkspace(session.user.id);
  if (!workspace) redirect('/login');
  return { session, workspace };
}

export type { CompanyWorkspaceContext };
