import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { UniversityOverviewClient } from './overview-client';

export default async function UniversityOverviewPage() {
  await requireSession('UNIVERSITY');

  const [students, teachers, startups] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.startup.count(),
  ]);

  return (
    <UniversityOverviewClient stats={{ students, teachers, startups }} />
  );
}
