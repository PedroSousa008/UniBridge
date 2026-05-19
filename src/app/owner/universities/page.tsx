import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { OwnerUniversitiesClient } from './universities-client';

export default async function OwnerUniversitiesPage() {
  await requireSession('OWNER');

  const universities = await prisma.user.findMany({
    where: { role: 'UNIVERSITY' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      universityProfile: {
        select: {
          institution: true,
          position: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return <OwnerUniversitiesClient universities={universities} />;
}
