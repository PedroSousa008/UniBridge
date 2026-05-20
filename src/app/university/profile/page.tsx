import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { prisma } from '@/lib/db';
import { UniversityProfileClient } from './profile-client';

export default async function UniversityProfilePage() {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);

  if (!ctx) {
    return (
      <UniversityProfileClient
        university={{
          id: '',
          name: 'University',
          slug: '',
          contactEmail: session.user.email ?? null,
          website: null,
          location: null,
          description: null,
          plan: 'standard',
          accentColor: null,
        }}
        admin={{
          name: session.user.name ?? null,
          email: session.user.email ?? '',
          position: null,
          institution: null,
        }}
      />
    );
  }

  const activePartners = await prisma.companyPartnership.findMany({
    where: { universityId: ctx.university.id, status: 'ACTIVE' },
    include: {
      companyUser: {
        select: {
          id: true,
          companyProfile: { select: { companyName: true, logoUrl: true, industry: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 12,
  });

  return (
    <UniversityProfileClient
      university={{
        id: ctx.university.id,
        name: ctx.university.name,
        slug: ctx.university.slug,
        contactEmail: ctx.university.contactEmail,
        website: ctx.university.website,
        location: ctx.university.location,
        description: ctx.university.description,
        plan: ctx.university.plan,
        accentColor: ctx.university.accentColor,
      }}
      admin={{
        name: ctx.user.name,
        email: ctx.user.email ?? '',
        position: ctx.profile.position,
        institution: ctx.profile.institution,
      }}
      partneredWith={activePartners.map((p) => ({
        id: p.companyUser.id,
        name: p.companyUser.companyProfile?.companyName ?? 'Company',
        logoUrl: p.companyUser.companyProfile?.logoUrl ?? null,
        industry: p.companyUser.companyProfile?.industry ?? null,
      }))}
    />
  );
}
