import { prisma } from '@/lib/db';

export interface PublicUniversityProfile {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  description: string | null;
  accentColor: string | null;
  studentCount: number;
  activePartnerships: number;
  courseCount: number;
}

export async function loadPublicUniversityBySlug(
  slug: string
): Promise<PublicUniversityProfile | null> {
  const university = await prisma.university.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverUrl: true,
      location: true,
      website: true,
      description: true,
      accentColor: true,
      _count: {
        select: {
          students: true,
          courses: true,
          partnerships: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  if (!university) return null;

  return {
    id: university.id,
    name: university.name,
    slug: university.slug,
    logoUrl: university.logoUrl,
    coverUrl: university.coverUrl,
    location: university.location,
    website: university.website,
    description: university.description,
    accentColor: university.accentColor,
    studentCount: university._count.students,
    activePartnerships: university._count.partnerships,
    courseCount: university._count.courses,
  };
}
