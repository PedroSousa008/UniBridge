import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { CompanyHomeClient } from './company-home-client';

export default async function CompanyHomePage() {
  await requireSession('COMPANY');

  const [students, startups] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.startup.count(),
  ]);

  return <CompanyHomeClient stats={{ students, startups }} />;
}
