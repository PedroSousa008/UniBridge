import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadPublicUniversityBySlug } from '@/lib/university/public-university-profile';
import { PublicUniversityProfileView } from '@/components/university/public-university-profile-view';

export default async function PublicUniversityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await loadPublicUniversityBySlug(slug);
  if (!profile) notFound();

  const session = await getServerSession(authOptions);

  return (
    <PublicUniversityProfileView
      profile={profile}
      viewerRole={session?.user?.role ?? null}
    />
  );
}
