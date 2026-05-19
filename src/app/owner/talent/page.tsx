import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { OwnerTalentClient } from './talent-client';

export default async function OwnerTalentPage() {
  await requireSession('OWNER');

  const [students, startups] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        studentProfile: { select: { program: true, universityName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.startup.findMany({
      select: {
        id: true,
        name: true,
        tagline: true,
        stage: true,
        industry: true,
        createdAt: true,
        founder: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return <OwnerTalentClient students={students} startups={startups} />;
}
