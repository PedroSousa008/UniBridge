import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { OwnerEcosystemClient } from './ecosystem-client';

export default async function OwnerEcosystemPage() {
  await requireSession('OWNER');

  const [totalUsers, students, teachers, universities, companies, startups] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'UNIVERSITY' } }),
      prisma.user.count({ where: { role: 'COMPANY' } }),
      prisma.startup.count(),
    ]);

  return (
    <OwnerEcosystemClient
      stats={{
        totalUsers,
        students,
        teachers,
        universities,
        companies,
        startups,
      }}
    />
  );
}
