import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { CompatibilityClient } from './compatibility-client';

export default async function CompatibilityPage() {
  const session = await requireSession('STUDENT');
  const targets = await prisma.careerTarget.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isPrimary: 'desc' }, { compatibility: 'desc' }],
  });
  return <CompatibilityClient targets={targets} />;
}
