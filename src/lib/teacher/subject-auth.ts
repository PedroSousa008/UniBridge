import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function requireTeacherSubject(subjectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TEACHER') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!teacher?.universityId) {
    return { error: NextResponse.json({ error: 'Not linked to a university' }, { status: 403 }) };
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      OR: [{ teacherId: teacher.id }, { universityId: teacher.universityId }],
    },
  });

  if (!subject) {
    return { error: NextResponse.json({ error: 'Subject not found' }, { status: 404 }) };
  }

  return { session, teacher, subject };
}
