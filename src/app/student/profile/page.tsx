import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { StudentProfileClient } from './profile-client';

export default async function StudentProfilePage() {
  const session = await requireSession('STUDENT');
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, headline: true, bio: true },
  });

  return (
    <StudentProfileClient
      profile={{
        name: user?.name,
        headline: user?.headline,
        bio: user?.bio,
        profileStrength: studentProfile?.profileStrength ?? 0,
        universityName: studentProfile?.universityName,
        program: studentProfile?.program,
      }}
    />
  );
}
