import { prisma } from '@/lib/db';
import { ensureCompanyWorkspaceTables } from '@/lib/db/ensure-company-workspace-schema';
import { loadDisplayableTeamMembers } from '@/lib/company/company-presence-people';
import {
  loadPartnershipEcosystemHubForCompany,
  type PartnershipEcosystemHub,
} from '@/lib/partnerships/partnership-live-hub';
import { deriveUiState } from '@/lib/partnerships/partnership-intelligence';
import { resolveCompanyWorkspace, type CompanyWorkspaceContext } from '@/lib/company/company-workspace';
import {
  canCompany,
  PERMISSION_LABELS,
  type CompanyPermission,
} from '@/lib/company/company-permissions';
import { ensureCompanyPresenceTables } from '@/lib/db/ensure-company-presence-schema';
import { ensurePartnershipLiveTables } from '@/lib/db/ensure-partnership-live-schema';

export interface MyRepresentativeProfile {
  userId: string;
  image: string | null;
  fullName: string | null;
  email: string;
  age: number | null;
  roleInCompany: string | null;
  phone: string | null;
  bio: string | null;
  accountType: string;
  permission: CompanyPermission;
  permissionLabel: string;
}

export interface PartnershipRequestCard {
  id: string;
  universityId: string;
  name: string;
  logoUrl: string | null;
  location: string | null;
  status: string;
  direction: 'sent' | 'received' | 'mutual' | 'active' | 'archived';
  uiState: string;
  requestedAt: string;
  canAccept: boolean;
  canReject: boolean;
  canCancel: boolean;
}

export interface TeamMemberAccessCard {
  teamMemberId: string;
  workspaceMemberId: string | null;
  name: string;
  photoUrl: string | null;
  roleTitle: string | null;
  age: number | null;
  hasLogin: boolean;
  loginEmail: string | null;
  permission: CompanyPermission;
  permissionLabel: string;
  status: string;
}

export interface NetworkMapNode {
  id: string;
  label: string;
  type: 'company' | 'university' | 'startup' | 'event' | 'talent' | 'opportunity';
  x: number;
  y: number;
}

export interface NetworkMapEdge {
  from: string;
  to: string;
}

export interface SecurityActivityRow {
  id: string;
  action: string;
  detail: string;
  actorName: string | null;
  createdAt: string;
}

export interface StartupInvestmentCard {
  id: string;
  name: string;
  logoUrl: string | null;
  founders: string;
  investmentType: string;
  ownershipPercent: number | null;
  stage: string;
  momentumScore: number;
  category: string;
  href: string;
}

export interface CompanyProfileEcosystemHub {
  workspace: CompanyWorkspaceContext;
  myProfile: MyRepresentativeProfile;
  company: {
    companyName: string | null;
    industry: string | null;
    website: string | null;
    logoUrl: string | null;
    headquarters: string | null;
  };
  partnerships: PartnershipEcosystemHub;
  partnershipRequests: PartnershipRequestCard[];
  teamSectionTitle: string;
  team: TeamMemberAccessCard[];
  network: { nodes: NetworkMapNode[]; edges: NetworkMapEdge[] };
  security: SecurityActivityRow[];
  stats: {
    hires: number;
    activePartnerships: number;
    startupInvestments: number;
    eventsHosted: number;
    studentsReached: number;
    opportunitiesCreated: number;
    activeTeamMembers: number;
    activeRoles: number;
    applicationsReceived: number;
    pipelineCandidates: number;
    studentsSaved: number;
  };
  startupInvestments: StartupInvestmentCard[];
  permissions: {
    canEditProfile: boolean;
    canManageTeam: boolean;
    canManagePartnerships: boolean;
    canManagePermissions: boolean;
    canChangePassword: boolean;
  };
  serverTime: string;
}

export async function loadCompanyProfileEcosystemHub(
  actorUserId: string
): Promise<CompanyProfileEcosystemHub | null> {
  await Promise.all([
    ensureCompanyWorkspaceTables(),
    ensureCompanyPresenceTables(),
    ensurePartnershipLiveTables(),
  ]);

  const workspace = await resolveCompanyWorkspace(actorUserId);
  if (!workspace) return null;

  const ownerId = workspace.workspaceOwnerId;

  const [user, ownerProfile, memberRow, partnerships, teamMembers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true, image: true, bio: true, headline: true },
    }),
    prisma.companyProfile.findUnique({ where: { userId: ownerId } }),
    prisma.$queryRaw<
      {
        id: string;
        phone: string | null;
        age: number | null;
        roleInCompany: string | null;
        personalBio: string | null;
      }[]
    >`
      SELECT "id", "phone", "age", "roleInCompany", "personalBio"
      FROM "CompanyWorkspaceMember"
      WHERE "userId" = ${actorUserId} AND "workspaceOwnerId" = ${ownerId}
      LIMIT 1
    `,
    loadPartnershipEcosystemHubForCompany(ownerId),
    loadDisplayableTeamMembers(ownerId),
  ]);

  const wsRow = memberRow[0];
  const myProfile: MyRepresentativeProfile = {
    userId: actorUserId,
    image: user?.image ?? null,
    fullName: user?.name ?? null,
    email: user?.email ?? '',
    age: wsRow?.age ?? null,
    roleInCompany: wsRow?.roleInCompany ?? user?.headline ?? null,
    phone: wsRow?.phone ?? null,
    bio: wsRow?.personalBio ?? user?.bio ?? null,
    accountType: workspace.accountType,
    permission: workspace.permission,
    permissionLabel: PERMISSION_LABELS[workspace.permission],
  };

  const workspaceMembers = await prisma.$queryRaw<
    {
      id: string;
      teamMemberId: string | null;
      userId: string | null;
      permission: string;
      status: string;
    }[]
  >`
    SELECT "id", "teamMemberId", "userId", "permission", "status"
    FROM "CompanyWorkspaceMember"
    WHERE "workspaceOwnerId" = ${ownerId} AND "teamMemberId" IS NOT NULL
  `;
  const wsByTeam = new Map(
    workspaceMembers
      .filter((m) => m.teamMemberId)
      .map((m) => [m.teamMemberId!, m])
  );

  const loginEmails = new Map<string, string>();
  for (const m of workspaceMembers) {
    if (m.userId) {
      const u = await prisma.user.findUnique({
        where: { id: m.userId },
        select: { email: true },
      });
      if (m.teamMemberId && u) loginEmails.set(m.teamMemberId, u.email);
    }
  }

  const team: TeamMemberAccessCard[] = teamMembers.map((tm) => {
    const ws = wsByTeam.get(tm.id);
    const perm = (ws?.permission?.toUpperCase() ?? 'VIEWER') as CompanyPermission;
    return {
      teamMemberId: tm.id,
      workspaceMemberId: ws?.id ?? null,
      name: tm.name,
      photoUrl: tm.photoUrl,
      roleTitle: tm.roleTitle,
      age: tm.age,
      hasLogin: Boolean(ws?.userId),
      loginEmail: loginEmails.get(tm.id) ?? null,
      permission: perm,
      permissionLabel: PERMISSION_LABELS[perm] ?? 'Viewer',
      status: ws?.status ?? 'no_account',
    };
  });

  const partnershipRequests: PartnershipRequestCard[] = [];
  const connections = await prisma.$queryRaw<
    {
      id: string;
      universityId: string;
      companyInterested: boolean;
      universityInterested: boolean;
      archived: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >`
    SELECT "id", "universityId", "companyInterested", "universityInterested",
           COALESCE("archived", false) as "archived", "createdAt", "updatedAt"
    FROM "PartnershipConnection"
    WHERE "companyUserId" = ${ownerId}
    ORDER BY "updatedAt" DESC
  `.catch(() => [] as never[]);

  for (const c of connections) {
    const partnership = await prisma.companyPartnership.findUnique({
      where: {
        universityId_companyUserId: {
          universityId: c.universityId,
          companyUserId: ownerId,
        },
      },
      select: { status: true },
    });
    const uni = await prisma.university.findUnique({
      where: { id: c.universityId },
      select: { name: true, logoUrl: true, location: true },
    });
    if (!uni) continue;

    const uiState = deriveUiState({
      partnershipStatus: partnership?.status ?? null,
      companyInterested: c.companyInterested,
      universityInterested: c.universityInterested,
    });

    let direction: PartnershipRequestCard['direction'] = 'sent';
    if (c.archived) direction = 'archived';
    else if (uiState === 'active') direction = 'active';
    else if (uiState === 'mutual_interest') direction = 'mutual';
    else if (uiState === 'university_interested') direction = 'received';
    else if (uiState === 'company_interested') direction = 'sent';

    partnershipRequests.push({
      id: c.id,
      universityId: c.universityId,
      name: uni.name,
      logoUrl: uni.logoUrl,
      location: uni.location,
      status: uiState,
      direction,
      uiState,
      requestedAt: c.updatedAt.toISOString(),
      canAccept: uiState === 'university_interested' || uiState === 'mutual_interest',
      canReject: direction === 'received' && uiState !== 'active',
      canCancel: direction === 'sent' && uiState !== 'active',
    });
  }

  const [
    pipelineCount,
    applications,
    internships,
    events,
    savedCandidates,
    followedStartups,
  ] = await Promise.all([
    prisma.companyPipelineCandidate.count({ where: { companyUserId: ownerId } }),
    prisma.internshipApplication.count({
      where: { internship: { companyUserId: ownerId } },
    }),
    prisma.internship.count({ where: { companyUserId: ownerId } }),
    prisma.companyEvent.count({
      where: { companyUserId: ownerId, status: 'approved' },
    }),
    prisma.companyPipelineCandidate.count({
      where: { companyUserId: ownerId, stage: 'saved' },
    }),
    prisma.startupFollower.findMany({
      where: { userId: ownerId },
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            stage: true,
            industry: true,
            founder: { select: { name: true } },
            members: { include: { user: { select: { name: true } } } }, take: 3 },
          },
        },
      },
      take: 12,
    }),
  ]);

  const studentsReached = partnerships.active.length * 120 + applications;

  const startupInvestments: StartupInvestmentCard[] = followedStartups.map((f) => {
    const s = f.startup;
    const founderNames = [
      s.founder?.name,
      ...s.members.map((m) => m.user.name),
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      founders: founderNames || 'Founder',
      investmentType: 'Strategic Partner',
      ownershipPercent: null,
      stage: s.stage ?? 'active',
      momentumScore: 70,
      category: s.industry ?? 'Startup',
      href: `/company/startups?startup=${s.id}`,
    };
  });

  const companyNodeId = 'company-center';
  const nodes: NetworkMapNode[] = [
    { id: companyNodeId, label: workspace.companyName, type: 'company', x: 50, y: 50 },
  ];
  const edges: NetworkMapEdge[] = [];

  partnerships.active.forEach((p, i) => {
    const angle = (i / Math.max(1, partnerships.active.length)) * Math.PI * 2;
    const id = `uni-${p.universityId}`;
    nodes.push({
      id,
      label: p.name,
      type: 'university',
      x: 50 + Math.cos(angle) * 35,
      y: 50 + Math.sin(angle) * 30,
    });
    edges.push({ from: companyNodeId, to: id });
  });

  if (events > 0) {
    nodes.push({ id: 'events', label: `${events} events`, type: 'event', x: 82, y: 28 });
    edges.push({ from: companyNodeId, to: 'events' });
  }
  if (internships > 0) {
    nodes.push({
      id: 'opps',
      label: `${internships} roles`,
      type: 'opportunity',
      x: 18,
      y: 22,
    });
    edges.push({ from: companyNodeId, to: 'opps' });
  }
  if (pipelineCount > 0) {
    nodes.push({
      id: 'talent',
      label: `${pipelineCount} pipeline`,
      type: 'talent',
      x: 22,
      y: 78,
    });
    edges.push({ from: companyNodeId, to: 'talent' });
  }
  startupInvestments.slice(0, 4).forEach((s, i) => {
    const id = `su-${s.id}`;
    nodes.push({ id, label: s.name, type: 'startup', x: 78, y: 72 - i * 8 });
    edges.push({ from: companyNodeId, to: id });
  });

  const securityRows = await prisma.$queryRaw<
    { id: string; action: string; detail: string; actorUserId: string | null; createdAt: Date }[]
  >`
    SELECT "id", "action", "detail", "actorUserId", "createdAt"
    FROM "CompanyWorkspaceActivity"
    WHERE "workspaceOwnerId" = ${ownerId}
    ORDER BY "createdAt" DESC
    LIMIT 20
  `.catch(() => []);

  const security: SecurityActivityRow[] = [];
  for (const row of securityRows) {
    let actorName: string | null = null;
    if (row.actorUserId) {
      const u = await prisma.user.findUnique({
        where: { id: row.actorUserId },
        select: { name: true },
      });
      actorName = u?.name ?? null;
    }
    security.push({
      id: row.id,
      action: row.action,
      detail: row.detail,
      actorName,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return {
    workspace,
    myProfile,
    company: {
      companyName: ownerProfile?.companyName ?? null,
      industry: ownerProfile?.industry ?? null,
      website: ownerProfile?.website ?? null,
      logoUrl: ownerProfile?.logoUrl ?? null,
      headquarters: ownerProfile?.headquarters ?? null,
    },
    partnerships,
    partnershipRequests,
    teamSectionTitle: `${workspace.companyName} Team`,
    team,
    network: { nodes, edges },
    security,
    stats: {
      hires: await prisma.companyPipelineCandidate.count({
        where: { companyUserId: ownerId, stage: 'hired' },
      }),
      activePartnerships: partnerships.active.length,
      startupInvestments: startupInvestments.length,
      eventsHosted: events,
      studentsReached,
      opportunitiesCreated: internships,
      activeTeamMembers: team.filter((t) => t.hasLogin).length + 1,
      activeRoles: internships,
      applicationsReceived: applications,
      pipelineCandidates: pipelineCount,
      studentsSaved: savedCandidates,
    },
    startupInvestments,
    permissions: {
      canEditProfile: true,
      canManageTeam: canCompany(workspace.permission, 'manage_team_accounts'),
      canManagePartnerships: canCompany(workspace.permission, 'manage_partnerships'),
      canManagePermissions: canCompany(workspace.permission, 'manage_permissions'),
      canChangePassword: true,
    },
    serverTime: new Date().toISOString(),
  };
}

export async function updateMyRepresentativeProfile(
  actorUserId: string,
  input: {
    fullName?: string;
    image?: string | null;
    age?: number | null;
    roleInCompany?: string | null;
    phone?: string | null;
    bio?: string | null;
  }
) {
  const workspace = await resolveCompanyWorkspace(actorUserId);
  if (!workspace) return null;

  if (input.fullName !== undefined) {
    await prisma.user.update({
      where: { id: actorUserId },
      data: { name: input.fullName },
    });
  }
  if (input.bio !== undefined) {
    await prisma.user.update({
      where: { id: actorUserId },
      data: { bio: input.bio, headline: input.roleInCompany ?? undefined },
    });
  }
  if (input.roleInCompany !== undefined) {
    await prisma.user.update({
      where: { id: actorUserId },
      data: { headline: input.roleInCompany },
    });
  }

  await prisma.$executeRaw`
    UPDATE "CompanyWorkspaceMember"
    SET
      "phone" = COALESCE(${input.phone ?? null}, "phone"),
      "age" = COALESCE(${input.age ?? null}, "age"),
      "roleInCompany" = COALESCE(${input.roleInCompany ?? null}, "roleInCompany"),
      "personalBio" = COALESCE(${input.bio ?? null}, "personalBio"),
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "userId" = ${actorUserId} AND "workspaceOwnerId" = ${workspace.workspaceOwnerId}
  `;

  return loadCompanyProfileEcosystemHub(actorUserId);
}
