import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { StudentStartupClient } from './startup-client';

export default async function StudentStartupPage() {
  const session = await requireSession('STUDENT');
  const startups = await prisma.startup.findMany({
    where: { founderId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  });
  return <StudentStartupClient startups={startups} />;
}
