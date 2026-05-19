import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { OwnerBusinessClient } from './business-client';

export default async function OwnerBusinessPage() {
  await requireSession('OWNER');

  const [totalUsers, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    }),
  ]);

  const roleCounts = Object.fromEntries(
    byRole.map((r) => [r.role, r._count.role])
  ) as Record<string, number>;

  return (
    <OwnerBusinessClient totalUsers={totalUsers} roleCounts={roleCounts} />
  );
}
