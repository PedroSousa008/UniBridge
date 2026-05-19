import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { OwnerControlClient } from './control-client';

export default async function OwnerControlPage() {
  await requireSession('OWNER');

  const [config, userCount, owner] = await Promise.all([
    prisma.platformConfig.findUnique({ where: { id: 'platform' } }),
    prisma.user.count(),
    prisma.user.findFirst({
      where: { role: 'OWNER' },
      select: { name: true, email: true, createdAt: true },
    }),
  ]);

  return (
    <OwnerControlClient
      ownerSlotTaken={config?.ownerSlotTaken ?? false}
      userCount={userCount}
      owner={owner}
    />
  );
}
