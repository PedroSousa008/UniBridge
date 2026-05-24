import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sanitizeStoredImageUrl } from '@/lib/uploads/stored-image-url';

/** Set profile photo for the signed-in user (any role). Syncs across the platform via User.image */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as { image?: string | null };
  let image: string | null | undefined;
  if (body.image === null || body.image === '') {
    image = null;
  } else if (typeof body.image === 'string') {
    image = sanitizeStoredImageUrl(body.image);
    if (body.image.trim() && image === null) {
      return NextResponse.json(
        {
          error:
            'Use a hosted image URL (HTTPS). Large or base64 images cannot be stored on your profile.',
        },
        { status: 400 }
      );
    }
  } else {
    image = undefined;
  }

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
