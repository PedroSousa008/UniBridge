import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUniversityApi } from '@/lib/university/api-auth';

export async function PATCH(request: Request) {
  const auth = await requireUniversityApi();
  if (auth.error) return auth.error;

  const body = await request.json();
  const name = body.name ? String(body.name).trim() : undefined;

  const university = await prisma.university.update({
    where: { id: auth.ctx.university.id },
    data: {
      ...(name ? { name } : {}),
      contactEmail: body.contactEmail ?? undefined,
      website: body.website ?? undefined,
      location: body.location ?? undefined,
      description: body.description ?? undefined,
    },
  });

  if (body.position !== undefined || body.institution !== undefined) {
    await prisma.universityProfile.update({
      where: { userId: auth.session.user.id },
      data: {
        position: body.position ?? undefined,
        institution: body.institution ?? undefined,
      },
    });
  }

  return NextResponse.json({ university });
}
