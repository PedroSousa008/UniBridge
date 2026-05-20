import { prisma } from '@/lib/db';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import { companyStageFromApplication, companyStageLabel } from '@/lib/company/company-intelligence';
import { loadCompanyOpportunitiesHub } from '@/lib/company/company-opportunities-hub';
import { loadCompanyTalentHub } from '@/lib/company/company-talent-hub';

export interface CompanyHomeHub {
  company: {
    name: string;
    industry: string | null;
    logoUrl: string | null;
    headquarters: string | null;
  };
  stats: {
    activePartnerships: number;
    openRoles: number;
    totalApplications: number;
    interviewStage: number;
    talentPool: number;
    publishedCareerPaths: number;
  };
  recentApplications: {
    id: string;
    studentName: string;
    roleTitle: string;
    stageLabel: string;
    at: string;
    href: string;
  }[];
  partnerships: { id: string; universityName: string; tier: string | null; href: string }[];
  ecosystemLinks: { label: string; href: string }[];
  serverTime: string;
}

export async function loadCompanyHomeHub(userId: string): Promise<CompanyHomeHub> {
  await ensureProfileIdentityTables();

  const [user, companyProfile, partnerships, careerPathCount, opportunities, talent] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    prisma.companyProfile.findUnique({ where: { userId } }),
    prisma.companyPartnership.findMany({
      where: { companyUserId: userId, status: 'ACTIVE' },
      include: { university: { select: { name: true } } },
      take: 6,
    }),
    prisma.careerPath.count({
      where: { companyUserId: userId, status: 'PUBLISHED' },
    }),
    loadCompanyOpportunitiesHub(userId),
    loadCompanyTalentHub(userId),
  ]);

  const interviewStage = opportunities.pipeline.filter((p) =>
    ['interview', 'final_interview', 'offer_received'].includes(p.stage)
  ).length;

  const recentApplications = opportunities.pipeline
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)
    .map((p) => ({
      id: p.applicationId,
      studentName: p.studentName,
      roleTitle: p.roleTitle,
      stageLabel: companyStageLabel(p.stage),
      at: p.updatedAt,
      href: `/company/opportunities?application=${p.applicationId}`,
    }));

  return {
    company: {
      name: companyProfile?.companyName ?? user?.name ?? 'Your company',
      industry: companyProfile?.industry ?? null,
      logoUrl: companyProfile?.logoUrl ?? null,
      headquarters: companyProfile?.headquarters ?? null,
    },
    stats: {
      activePartnerships: partnerships.length,
      openRoles: opportunities.internships.filter((i) => i.status === 'ACTIVE').length,
      totalApplications: opportunities.pipeline.length,
      interviewStage,
      talentPool: talent.candidates.length,
      publishedCareerPaths: careerPathCount,
    },
    recentApplications,
    partnerships: partnerships.map((p) => ({
      id: p.id,
      universityName: p.university?.name ?? 'University partner',
      tier: p.partnershipTier,
      href: '/company/opportunities',
    })),
    ecosystemLinks: [
      { label: 'Discover talent', href: '/company/talent' },
      { label: 'Hiring pipeline', href: '/company/opportunities' },
      { label: 'Insights', href: '/company/insights' },
      { label: 'Company profile', href: '/company/profile' },
    ],
    serverTime: new Date().toISOString(),
  };
}
