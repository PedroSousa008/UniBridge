import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const config = await prisma.platformConfig.findUnique({
    where: { id: 'platform' },
  });

  const ownerExists = await prisma.user.count({
    where: { role: 'OWNER' },
  });

  return NextResponse.json({
    available: !config?.ownerSlotTaken && ownerExists === 0,
  });
}
