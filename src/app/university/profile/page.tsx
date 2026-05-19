import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
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
    />
  );
}
