import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { StudentHomeClient } from './student-home-client';

export default async function StudentHomePage() {
  const session = await requireSession('STUDENT');

  const [profile, careerTargets, startups, assignments, notifications] =
    await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.careerTarget.findMany({
        where: { userId: session.user.id },
        orderBy: { compatibility: 'desc' },
        take: 3,
      }),
      prisma.startup.findMany({
        where: { founderId: session.user.id },
        take: 3,
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          studentId: session.user.id,
          submittedAt: null,
        },
        include: { assignment: true },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id, read: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

  return (
    <StudentHomeClient
      userName={session.user.name}
      profileStrength={profile?.profileStrength ?? 0}
      careerTargets={careerTargets}
      startups={startups}
      pendingAssignments={assignments}
      notifications={notifications}
    />
  );
}
