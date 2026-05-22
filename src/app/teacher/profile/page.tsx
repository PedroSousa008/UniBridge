import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { ProfileSecuritySection } from '@/components/profile/profile-security-section';

export default async function TeacherProfilePage() {
  const session = await requireSession('TEACHER');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true, headline: true, bio: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Your professional teacher identity and account security."
      />
      <div className="rounded-2xl border bg-card p-6 max-w-2xl">
        <p className="text-sm text-muted-foreground">Name</p>
        <p className="font-medium">{user?.name ?? '—'}</p>
        {user?.headline ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">Headline</p>
            <p>{user.headline}</p>
          </>
        ) : null}
      </div>
      <ProfileSecuritySection userEmail={user?.email ?? session.user.email ?? ''} />
    </div>
  );
}
