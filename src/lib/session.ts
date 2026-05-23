import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ROLE_HOME } from '@/lib/roles';
import {
  resolveCompanyWorkspace,
  type CompanyWorkspaceContext,
} from '@/lib/company/company-workspace';
import type { Session } from 'next-auth';
import type { UserRole } from '@prisma/client';

export type AppSession = NonNullable<Session>;

const getCachedServerSession = cache(() => getServerSession(authOptions));

/** Data queries for company modules — owner id for sub-accounts. */
export function getCompanyWorkspaceUserId(session: {
  user: { id: string; companyWorkspaceId?: string };
}): string {
  return session.user.companyWorkspaceId ?? session.user.id;
}

async function attachCompanyWorkspace(session: NonNullable<AppSession>) {
  if (session.user.role !== 'COMPANY') return session;
  if (session.user.companyWorkspaceId) return session;

  const ws = await resolveCompanyWorkspace(session.user.id);
  if (ws) {
    session.user.companyWorkspaceId = ws.workspaceOwnerId;
    session.user.companyPermission = ws.permission;
  }
  return session;
}

export const requireSession = cache(async (expectedRole?: UserRole) => {
  const session = await getCachedServerSession();
  if (!session?.user?.id) redirect('/login');
  if (expectedRole && session.user.role !== expectedRole) {
    redirect(ROLE_HOME[session.user.role]);
  }
  return attachCompanyWorkspace(session as NonNullable<AppSession>);
});

/** Company routes: session + workspace in one cached pass. */
export const requireCompanyWorkspace = cache(async () => {
  const session = await requireSession('COMPANY');
  const workspace = await resolveCompanyWorkspace(session.user.id);
  if (!workspace) redirect('/login');
  return { session, workspace };
});

export type { CompanyWorkspaceContext };
