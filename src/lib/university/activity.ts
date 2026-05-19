import { prisma } from '@/lib/db';

export async function logUniversityActivity(
  universityId: string,
  type: string,
  title: string,
  message?: string,
  link?: string
) {
  return prisma.activityItem.create({
    data: { universityId, type, title, message, link },
  });
}
