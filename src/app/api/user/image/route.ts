import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Set profile photo for the signed-in user (any role). Syncs across the platform via User.image */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { image?: string | null };
  const image =
    body.image === null || body.image === ''
      ? null
      : typeof body.image === 'string'
        ? body.image.trim() || null
        : undefined;

  if (image === undefined) {
    return NextResponse.json({ error: 'image required' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
    select: { id: true, image: true },
  });

  return NextResponse.json({ image: user.image });
}
