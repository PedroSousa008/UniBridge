import { prisma } from '@/lib/db';

export interface CompanyProfileHub {
  user: { name: string | null; email: string; image: string | null };
  profile: {
    companyName: string | null;
    industry: string | null;
    website: string | null;
    logoUrl: string | null;
    headquarters: string | null;
  };
  stats: {
    partnerships: number;
    internships: number;
    applications: number;
    careerPaths: number;
  };
  partneredWith: { id: string; name: string; logoUrl: string | null }[];
  serverTime: string;
}

export async function loadCompanyProfileHub(userId: string): Promise<CompanyProfileHub> {
  const [user, profile, activePartnerships, internships, applications, careerPaths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.companyProfile.findUnique({ where: { userId } }),
    prisma.companyPartnership.findMany({
      where: { companyUserId: userId, status: 'ACTIVE' },
      include: { university: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    }),
    prisma.internship.count({ where: { companyUserId: userId } }),
    prisma.internshipApplication.count({ where: { internship: { companyUserId: userId } } }),
    prisma.careerPath.count({ where: { companyUserId: userId, status: 'PUBLISHED' } }),
  ]);

  return {
    user: {
      name: user?.name ?? null,
      email: user?.email ?? '',
      image: user?.image ?? null,
    },
    profile: {
      companyName: profile?.companyName ?? null,
      industry: profile?.industry ?? null,
      website: profile?.website ?? null,
      logoUrl: profile?.logoUrl ?? null,
      headquarters: profile?.headquarters ?? null,
    },
    stats: {
      partnerships: activePartnerships.length,
      internships,
      applications,
      careerPaths,
    },
    partneredWith: activePartnerships.map((p) => ({
      id: p.university.id,
      name: p.university.name,
      logoUrl: p.university.logoUrl,
    })),
    serverTime: new Date().toISOString(),
  };
}
