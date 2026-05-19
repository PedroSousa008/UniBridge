import { prisma } from '@/lib/db';

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'university';
}

export async function ensureUniversityForAdmin(userId: string) {
  const profile = await prisma.universityProfile.findUnique({
    where: { userId },
    include: { university: true },
  });

  if (!profile) {
    throw new Error('University profile not found');
  }

  if (profile.universityId && profile.university) {
    return profile.university;
  }

  const institution =
    profile.institution?.trim() || 'My University';
  let slug = slugify(institution);
  const existingSlug = await prisma.university.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const university = await prisma.university.create({
    data: {
      name: institution,
      slug,
      contactEmail: adminUser?.email,
      departments: [],
    },
  });

  await prisma.universityProfile.update({
    where: { userId },
    data: { universityId: university.id },
  });

  await prisma.studentProfile.updateMany({
    where: {
      OR: [
        { universityName: institution },
        { universityName: { contains: institution, mode: 'insensitive' } },
      ],
    },
    data: { universityId: university.id },
  });

  return university;
}

export async function getUniversityContext(userId: string) {
  const profile = await prisma.universityProfile.findUnique({
    where: { userId },
    include: {
      university: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!profile) return null;

  const university = profile.universityId
    ? profile.university
    : await ensureUniversityForAdmin(userId);

  if (!university) return null;

  return { profile, university, user: profile.user };
}

export type UniversityContext = NonNullable<
  Awaited<ReturnType<typeof getUniversityContext>>
>;
