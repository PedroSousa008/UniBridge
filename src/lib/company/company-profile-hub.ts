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
  serverTime: string;
}

export async function loadCompanyProfileHub(userId: string): Promise<CompanyProfileHub> {
  const [user, profile, partnerships, internships, applications, careerPaths] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.companyProfile.findUnique({ where: { userId } }),
    prisma.companyPartnership.count({ where: { companyUserId: userId, status: 'ACTIVE' } }),
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
    stats: { partnerships, internships, applications, careerPaths },
    serverTime: new Date().toISOString(),
  };
}
